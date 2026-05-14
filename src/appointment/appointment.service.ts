import { Injectable } from '@nestjs/common';
import { TemplateService } from 'src/template/template.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

@Injectable()
export class AppointmentService {
  constructor(private readonly templateService: TemplateService) {}

  async createAppointment(createAppointmentDto: CreateAppointmentDto) {
    const whatsappResponse = await this.templateService.sendConfirmation({
      templateName: 'appointment_confirmation',
      ...createAppointmentDto,
    });

    return {
      success: true,
      appointment: createAppointmentDto,
      whatsappResponse,
    };
  }
}
