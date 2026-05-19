import { Injectable, Logger } from '@nestjs/common';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { SendTemplateDto } from './dto/send-template.dto';
import { DeliveryStatusDto } from './dto/delivery-status.dto';

interface TemplateDeliveryRecord {
  messageId: string;
  status: string;
  failureReason?: string | null;
  providerPayload?: any;
  createdAt?: string;
  updatedAt?: string;
  provider?: string;
  retryCount?: number;
  fallbackAttempt?: boolean;
  providerStatus?: string;
  sentAt?: string;
}

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);
  private readonly deliveryStore = new Map<string, TemplateDeliveryRecord>();

  constructor(private readonly whatsappService: WhatsappService) {}

  async sendConfirmation(createTemplateDto: SendTemplateDto) {
    return this.sendTemplate(createTemplateDto, 'Your appointment is confirmed');
  }

  async sendReminder(createTemplateDto: SendTemplateDto) {
    return this.sendTemplate(createTemplateDto, 'This is a reminder for your upcoming appointment');
  }

  async sendCancellation(createTemplateDto: SendTemplateDto) {
    return this.sendTemplate(createTemplateDto, 'Your appointment has been cancelled');
  }

  async updateDeliveryStatus(deliveryStatusDto: DeliveryStatusDto) {
    const existingRecord = this.deliveryStore.get(deliveryStatusDto.messageId);
    const updatedRecord: TemplateDeliveryRecord = {
      ...(existingRecord ?? { messageId: deliveryStatusDto.messageId, createdAt: new Date().toISOString() }),
      status: deliveryStatusDto.status,
      failureReason: deliveryStatusDto.failureReason ?? null,
      updatedAt: new Date().toISOString(),
    };

    this.deliveryStore.set(deliveryStatusDto.messageId, updatedRecord);
    this.logger.log(`Updated delivery status for ${deliveryStatusDto.messageId}: ${deliveryStatusDto.status}`);
    return {
      success: true,
      ...updatedRecord,
    };
  }

  getDeliveryStatus(messageId: string) {
    const status = this.deliveryStore.get(messageId);
    if (!status) {
      return {
        success: false,
        messageId,
        status: 'UNKNOWN',
        failureReason: null,
        provider: undefined,
        retryCount: undefined,
        fallbackAttempt: undefined,
        providerStatus: undefined,
        sentAt: undefined,
      };
    }
    return {
      success: true,
      ...status,
      updatedAt: new Date().toISOString(),
    };
  }

  private async sendTemplate(createTemplateDto: SendTemplateDto, prefix: string) {
    const languageCode = createTemplateDto.templateLanguage ?? 'en_US';
    const message = `${prefix}: ${createTemplateDto.templateName}\nPatient: ${createTemplateDto.patientName}\nDoctor: ${createTemplateDto.doctorName}\nDate: ${createTemplateDto.appointmentDate}\nTime: ${createTemplateDto.appointmentTime}\nHospital: ${createTemplateDto.hospitalName}`;

    const templatePayload = {
      name: createTemplateDto.templateName,
      language: {
        code: languageCode,
      },
      components: [
        {
          type: 'BODY',
          parameters: [
            { type: 'text', text: createTemplateDto.patientName },
            { type: 'text', text: createTemplateDto.doctorName },
            { type: 'text', text: createTemplateDto.appointmentDate },
            { type: 'text', text: createTemplateDto.appointmentTime },
            { type: 'text', text: createTemplateDto.hospitalName },
          ],
        },
      ],
    };

    const response = await this.whatsappService.sendMessage(createTemplateDto.phoneNumber, message, templatePayload);

    const sentAt = new Date().toISOString();
    if (response.success && response.messageId) {
      this.deliveryStore.set(response.messageId, {
        status: 'SENT',
        messageId: response.messageId,
        providerPayload: templatePayload,
        provider: response.provider,
        retryCount: response.retryCount,
        fallbackAttempt: response.fallbackAttempt,
        providerStatus: response.providerStatus,
        sentAt: response.sentAt,
        createdAt: sentAt,
        updatedAt: sentAt,
      });
      this.logger.log(
        `[TEMPLATE] Message sent | messageId: ${response.messageId} | provider: ${response.provider} | retryCount: ${response.retryCount} | fallbackAttempt: ${response.fallbackAttempt}`,
      );
    }

    return {
      success: response.success,
      provider: response.provider,
      messageId: response.messageId,
      status: response.success ? 'SENT' : 'FAILED',
      sentAt,
      providerPayload: templatePayload,
      error: response.error,
      failureReason: response.failureReason,
      retryCount: response.retryCount,
      fallbackAttempt: response.fallbackAttempt,
      providerStatus: response.providerStatus,
    };
  }
}
