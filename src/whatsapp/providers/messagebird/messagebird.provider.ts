import { Injectable, Logger } from '@nestjs/common';
import {
  IAppointmentMessageResponse,
  ITemplateMessageResponse,
  ITemplatePayload,
  IWhatsAppProvider,
  TemplateName,
} from '../interfaces/whatsapp-provider.interface';

@Injectable()
export class MessageBirdProvider implements IWhatsAppProvider {
  readonly name = 'MESSAGE_BIRD';
  private readonly logger = new Logger(MessageBirdProvider.name);

  async sendAppointmentMessage(
    payload: ITemplatePayload,
  ): Promise<IAppointmentMessageResponse> {
    const { patientName, phoneNumber, appointmentDate } = payload;

    if (!phoneNumber || phoneNumber.length < 10) {
      this.logger.error(`MessageBird: Invalid phone number: ${phoneNumber}`);
      throw new Error(`Invalid phone number: ${phoneNumber}`);
    }

    const messageBody = `Hi ${patientName}, your appointment on ${appointmentDate} has been booked. Contact us to reschedule.`;
    const messageId = `mb-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    // Realistic MessageBird Conversations API payload structure
    const providerPayload = {
      to: phoneNumber,
      type: 'text',
      content: {
        text: messageBody,
      },
      from: 'your-channel-id',
      reportUrl: 'https://your-callback-url.com/delivery',
    };

    this.logger.log(
      `MessageBird: Sending message to ${phoneNumber} | messageId: ${messageId}`,
    );
    await new Promise((resolve) => setTimeout(resolve, 80));

    return {
      success: true,
      provider: this.name,
      messageId,
      to: phoneNumber,
      body: messageBody,
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
      this.logger.error(`MessageBird: Invalid phone number: ${phoneNumber}`);
      throw new Error(`Invalid phone number: ${phoneNumber}`);
    }

    const messageId = `mb-tmpl-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    const templateBodies: Record<string, string> = {
      appointment_confirmation: `Hi ${patientName}, your appointment with ${doctorName} at ${hospitalName} is confirmed for ${appointmentDate} at ${appointmentTime}.`,
      appointment_reminder: `Hi ${patientName}, reminder for your appointment with ${doctorName} at ${hospitalName} on ${appointmentDate} at ${appointmentTime}.`,
      appointment_cancellation: `Hi ${patientName}, your appointment with ${doctorName} at ${hospitalName} on ${appointmentDate} at ${appointmentTime} has been cancelled.`,
    };

    // Realistic MessageBird HSM (template) payload structure
    const providerPayload = {
      to: phoneNumber,
      type: 'hsm',
      content: {
        hsm: {
          namespace: 'your-namespace-id',
          templateName: templateName,
          language: {
            policy: 'deterministic',
            code: 'en',
          },
          params: [
            { default: patientName },
            { default: doctorName },
            { default: hospitalName },
            { default: appointmentDate },
            { default: appointmentTime },
          ],
        },
      },
      from: 'your-channel-id',
      reportUrl: 'https://your-callback-url.com/delivery',
    };

    this.logger.log(
      `MessageBird: Sending template "${templateName}" to ${phoneNumber} | messageId: ${messageId}`,
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
