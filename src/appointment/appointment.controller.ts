import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AppointmentService } from './appointment.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

@ApiTags('appointments')
@Controller('appointments')
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @Post()
  @ApiOperation({ summary: 'Create an appointment and send confirmation template' })
  @ApiBody({
    type: CreateAppointmentDto,
    examples: {
      example: {
        summary: 'Appointment request',
        value: {
          patientName: 'Manju Kumari',
          phoneNumber: '919999999999',
          appointmentDate: '2026-05-15',
          doctorName: 'Dr. Jatin Das',
          appointmentTime: '10:30 AM',
          hospitalName: 'BMR Hospital',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Appointment created and WhatsApp confirmation sent.',
    headers: {
      'Content-Type': {
        description: 'Response content type',
        schema: { type: 'string', example: 'application/json' },
      },
    },
    schema: {
      example: {
        success: true,
        appointment: {
          patientName: 'Manju Kumari',
          phoneNumber: '919999999999',
          appointmentDate: '2026-05-15',
          doctorName: 'Dr. Jatin Das',
          appointmentTime: '10:30 AM',
          hospitalName: 'BMR Hospital',
        },
        whatsappResponse: {
          success: true,
          provider: 'MetaWhatsApp',
          messageId: 'meta-tmpl-abc-123',
          status: 'SENT',
          sentAt: '2026-05-14T09:00:00.000Z',
          providerPayload: {
            name: 'appointment_confirmation',
            language: { code: 'en_US' },
            components: [
              {
                type: 'BODY',
                parameters: [
                  { type: 'text', text: 'Manju Kumari' },
                  { type: 'text', text: 'Dr. Jatin Das' },
                  { type: 'text', text: '2026-05-15' },
                  { type: 'text', text: '10:30 AM' },
                  { type: 'text', text: 'BMR Hospital' },
                ],
              },
            ],
          },
        },
      },
    },
  })
  async createAppointment(@Body() createAppointmentDto: CreateAppointmentDto) {
    return this.appointmentService.createAppointment(createAppointmentDto);
  }
}
