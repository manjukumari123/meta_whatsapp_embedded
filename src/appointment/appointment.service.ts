import { Injectable } from '@nestjs/common';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { AppointmentResponseDto } from './dto/appointment-response.dto';
import { TemplateService } from 'src/template/template.service';
import { TemplateType } from 'src/template/dto/send-template.dto';

@Injectable()
export class AppointmentService {
  constructor(private readonly templateService: TemplateService) {}

  async createAppointment(
    payload: CreateAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    const whatsappResponse = await this.templateService.sendConfirmation({
      templateName: TemplateType.CONFIRMATION,
      patientName: payload.patientName,
      doctorName: 'Dr. Default',
      appointmentDate: payload.appointmentDate,
      appointmentTime: '10:00 AM',
      hospitalName: 'Default Clinic',
      phoneNumber: payload.phoneNumber,
    });

    if (!whatsappResponse.success) {
      throw new Error(
        whatsappResponse.failureReason ?? 'Failed to send appointment template',
      );
    }

    const successResponse = whatsappResponse as any;

    return {
      success: true,
      appointment: payload,
      whatsappResponse: {
        success: successResponse.success,
        provider: successResponse.provider,
        messageId: successResponse.messageId,
        status: successResponse.status,
        sentAt: successResponse.sentAt,
        providerPayload: successResponse.providerPayload,
      },
    };
  }
}
