import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  IAppointmentMessageResponse,
  ITemplateMessageResponse,
  ITemplatePayload,
  IWhatsAppProvider,
  TemplateName,
} from '../interfaces/whatsapp-provider.interface';

@Injectable()
export class MetaProvider implements IWhatsAppProvider {
  readonly name = 'META_WHATSAPP';
  private readonly logger = new Logger(MetaProvider.name);

  async sendAppointmentMessage(
    payload: ITemplatePayload,
  ): Promise<IAppointmentMessageResponse> {
    const { patientName, phoneNumber, appointmentDate } = payload;

    if (!phoneNumber || phoneNumber.length < 10) {
      this.logger.error(`Meta: Invalid phone number: ${phoneNumber}`);
      throw new Error(`Invalid phone number: ${phoneNumber}`);
    }

    const messageId = `meta-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const bodyText = `Hello ${patientName}, your appointment is confirmed for ${appointmentDate}.`;

    // Realistic Meta Cloud API message payload structure
    const providerPayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phoneNumber,
      type: 'text',
      text: {
        preview_url: false,
        body: bodyText,
      },
    };

    this.logger.log(
      `Meta: Sending message to ${phoneNumber} | messageId: ${messageId}`,
    );
    await new Promise((resolve) => setTimeout(resolve, 80));

    return {
      success: true,
      provider: this.name,
      messageId,
      to: phoneNumber,
      body: bodyText,
      sentAt: new Date().toISOString(),
      providerPayload,
    };
  }

  async sendTemplateMessage(
    templateName: TemplateName,
    payload: ITemplatePayload,
  ): Promise<ITemplateMessageResponse> {
    const {
      patientName,
      doctorName,
      appointmentDate,
      appointmentTime,
      hospitalName,
      phoneNumber,
    } = payload;

    if (!phoneNumber || phoneNumber.length < 10) {
      this.logger.error(`Meta: Invalid phone number: ${phoneNumber}`);
      throw new Error(`Invalid phone number: ${phoneNumber}`);
    }

    const messageId = `meta-tmpl-${crypto.randomUUID()}`;

    const templateBodies: Record<string, string> = {
      appointment_confirmation: `Hello ${patientName}, your appointment with ${doctorName} at ${hospitalName} is confirmed for ${appointmentDate} at ${appointmentTime}.`,
      appointment_reminder: `Reminder: ${patientName}, you have an appointment with ${doctorName} at ${hospitalName} tomorrow ${appointmentDate} at ${appointmentTime}.`,
      appointment_cancellation: `Dear ${patientName}, your appointment with ${doctorName} at ${hospitalName} on ${appointmentDate} at ${appointmentTime} has been cancelled.`,
    };

    // Realistic Meta Cloud API template message payload structure
    const providerPayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phoneNumber,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: 'en_US',
          policy: 'deterministic',
        },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: patientName },
              { type: 'text', text: doctorName },
              { type: 'text', text: hospitalName },
              { type: 'text', text: appointmentDate },
              { type: 'text', text: appointmentTime },
            ],
          },
        ],
      },
    };

    this.logger.log(
      `Meta: Sending template "${templateName}" to ${phoneNumber} | messageId: ${messageId}`,
    );
    await new Promise((resolve) => setTimeout(resolve, 80));

    return {
      success: true,
      provider: this.name,
      messageId,
      to: phoneNumber,
      templateName,
      status: 'SENT',
      sentAt: new Date().toISOString(),
      providerPayload,
    };
  }
}
