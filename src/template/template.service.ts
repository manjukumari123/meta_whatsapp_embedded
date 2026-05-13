import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsAppProviderFactory } from 'src/whatsapp/factory/whatsapp-provider.factory';
import { ITemplateMessageResponse } from 'src/whatsapp/providers/interfaces/whatsapp-provider.interface';
import { SendTemplateDto, TemplateType } from './dto/send-template.dto';
import { WebhookDeliveryEventDto } from './dto/webhook-delivery-event.dto';
import {
  TemplateMessage,
  TemplateStatus,
} from './entities/template-message.entity';

type TemplateSendSuccess = ITemplateMessageResponse & {
  retryCount: number;
  fallbackUsed: boolean;
};

type TemplateSendFailure = {
  success: false;
  status: TemplateStatus;
  failureReason?: string;
  retryCount: number;
  fallbackUsed: boolean;
};

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 100;

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);

  constructor(
    private readonly providerFactory: WhatsAppProviderFactory,
    @InjectRepository(TemplateMessage)
    private readonly templateRepo: Repository<TemplateMessage>,
  ) {}

  async sendConfirmation(dto: SendTemplateDto) {
    return this.sendWithRetry({
      ...dto,
      templateName: TemplateType.CONFIRMATION,
    });
  }

  async sendReminder(dto: SendTemplateDto) {
    return this.sendWithRetry({ ...dto, templateName: TemplateType.REMINDER });
  }

  async sendCancellation(dto: SendTemplateDto) {
    return this.sendWithRetry({
      ...dto,
      templateName: TemplateType.CANCELLATION,
    });
  }

  async handleDeliveryEvent(event: WebhookDeliveryEventDto) {
    this.logger.log(
      `Delivery event received | messageId: ${event.messageId} | status: ${event.status}`,
    );

    const record = await this.templateRepo.findOne({
      where: { messageId: event.messageId },
    });

    if (!record) {
      throw new NotFoundException(
        `No template message found for messageId: ${event.messageId}`,
      );
    }

    record.status = event.status;
    if (event.failureReason) {
      record.failureReason = event.failureReason;
    }

    await this.templateRepo.save(record);
    this.logger.log(
      `Status updated | messageId: ${event.messageId} | status: ${event.status}`,
    );

    return {
      success: true,
      messageId: event.messageId,
      status: event.status,
      updatedAt: new Date().toISOString(),
    };
  }

  async getStatus(messageId: string) {
    const record = await this.templateRepo.findOne({ where: { messageId } });
    if (!record) {
      throw new NotFoundException(
        `No template message found for messageId: ${messageId}`,
      );
    }
    return {
      messageId: record.messageId,
      templateName: record.templateName,
      provider: record.provider,
      status: record.status,
      retryCount: record.retryCount,
      failureReason: record.failureReason ?? null,
      sentAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  private async sendWithRetry(
    dto: SendTemplateDto,
  ): Promise<TemplateSendSuccess | TemplateSendFailure> {
    const [primary, secondary] =
      this.providerFactory.getProvidersWithFailover();

    // Try primary provider first
    const primaryResult = await this.attemptSend(dto, primary, false);
    if (primaryResult.success) {
      return primaryResult;
    }

    // Fallback to secondary provider
    this.logger.warn(
      `Primary provider ${primary.name} failed after ${MAX_RETRIES} attempts. Falling back to ${secondary.name}...`,
    );

    const fallbackResult = await this.attemptSend(dto, secondary, true);
    if (fallbackResult.success) {
      this.logger.log(
        `Fallback provider ${secondary.name} succeeded | messageId: ${fallbackResult.messageId}`,
      );
      return fallbackResult;
    }

    // Both providers failed
    this.logger.error(
      `All providers failed. Primary: ${primary.name}, Fallback: ${secondary.name}`,
    );

    return {
      success: false,
      status: TemplateStatus.FAILED,
      failureReason: `Primary (${primary.name}): ${primaryResult.failureReason}; Fallback (${secondary.name}): ${fallbackResult.failureReason}`,
      retryCount: primaryResult.retryCount + fallbackResult.retryCount,
      fallbackUsed: true,
    };
  }

  private async attemptSend(
    dto: SendTemplateDto,
    provider: any,
    isFallback: boolean,
  ): Promise<TemplateSendSuccess | TemplateSendFailure> {
    let lastError: Error | null = null;
    let retryCount = 0;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        this.logger.log(
          `${isFallback ? '[FALLBACK]' : '[PRIMARY]'} Attempt ${attempt} | provider: ${provider.name} | template: ${dto.templateName} | to: ${dto.phoneNumber}`,
        );

        const response = await provider.sendTemplateMessage(dto.templateName, {
          patientName: dto.patientName,
          doctorName: dto.doctorName,
          appointmentDate: dto.appointmentDate,
          appointmentTime: dto.appointmentTime,
          hospitalName: dto.hospitalName,
          phoneNumber: dto.phoneNumber,
        });

        const record = this.templateRepo.create({
          messageId: response.messageId,
          provider: response.provider,
          templateName: dto.templateName,
          patientName: dto.patientName,
          doctorName: dto.doctorName,
          hospitalName: dto.hospitalName,
          appointmentDate: dto.appointmentDate,
          appointmentTime: dto.appointmentTime,
          phoneNumber: dto.phoneNumber,
          status: TemplateStatus.SENT,
          retryCount,
        });

        await this.templateRepo.save(record);
        this.logger.log(
          `Template sent successfully | provider: ${provider.name} | messageId: ${response.messageId}`,
        );

        return { ...response, retryCount, fallbackUsed: isFallback };
      } catch (error) {
        lastError = error as Error;
        retryCount = attempt;
        this.logger.warn(
          `Attempt ${attempt} failed on ${provider.name} | reason: ${lastError.message}`,
        );

        if (attempt < MAX_RETRIES) {
          await new Promise((resolve) =>
            setTimeout(resolve, RETRY_DELAY_MS * attempt),
          );
        }
      }
    }

    // All retries exhausted for this provider — save FAILED record
    const failedRecord = this.templateRepo.create({
      messageId: `failed-${provider.name.toLowerCase()}-${Date.now()}`,
      provider: provider.name,
      templateName: dto.templateName,
      patientName: dto.patientName,
      doctorName: dto.doctorName,
      hospitalName: dto.hospitalName,
      appointmentDate: dto.appointmentDate,
      appointmentTime: dto.appointmentTime,
      phoneNumber: dto.phoneNumber,
      status: TemplateStatus.FAILED,
      failureReason: lastError?.message ?? 'Unknown error',
      retryCount,
    });

    await this.templateRepo.save(failedRecord);
    this.logger.error(
      `All ${MAX_RETRIES} attempts failed on ${provider.name} | reason: ${lastError?.message}`,
    );

    return {
      success: false,
      status: TemplateStatus.FAILED,
      failureReason: lastError?.message,
      retryCount,
      fallbackUsed: isFallback,
    };
  }
}
