export type TemplateName =
  | 'appointment_confirmation'
  | 'appointment_reminder'
  | 'appointment_cancellation';

export interface ITemplatePayload {
  patientName: string;
  doctorName: string;
  appointmentDate: string;
  appointmentTime: string;
  hospitalName: string;
  phoneNumber: string;
}

export interface IAppointmentMessageResponse {
  success: boolean;
  provider: string;
  messageId: string;
  to: string;
  body: string;
  sentAt: string;
  providerPayload: object;
}

export interface ITemplateMessageResponse {
  success: true;
  provider: string;
  messageId: string;
  to: string;
  templateName: TemplateName;
  status: 'SENT' | 'DELIVERED' | 'FAILED';
  sentAt: string;
  providerPayload: object;
}

export interface IWhatsAppProvider {
  readonly name: string;

  sendAppointmentMessage(
    payload: ITemplatePayload,
  ): Promise<IAppointmentMessageResponse>;

  sendTemplateMessage(
    templateName: TemplateName,
    payload: ITemplatePayload,
  ): Promise<ITemplateMessageResponse>;
}
