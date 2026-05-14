import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { TemplateService } from './template.service';
import { SendTemplateDto } from './dto/send-template.dto';
import { DeliveryStatusDto } from './dto/delivery-status.dto';

@ApiTags('templates')
@Controller('templates')
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Post('confirmation')
  @ApiOperation({ summary: 'Send appointment confirmation template' })
  @ApiBody({
    type: SendTemplateDto,
    examples: {
      confirmation: {
        summary: 'Confirmation request',
        value: {
          templateName: 'appointment_confirmation',
          patientName: 'Manju Kumari',
          doctorName: 'Dr. Jatin Das',
          appointmentDate: '2026-05-15',
          appointmentTime: '10:30 AM',
          hospitalName: 'BMR Hospital',
          phoneNumber: '919999999999',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Confirmation template sent.',
    headers: {
      'Content-Type': {
        description: 'Response content type',
        schema: { type: 'string', example: 'application/json' },
      },
    },
    schema: {
      example: {
        success: true,
        provider: 'MetaWhatsApp',
        messageId: 'wamid.HbL1715678900@919999999999',
        status: 'SENT',
        sentAt: '2026-05-14T09:00:00.000Z',
        providerStatus: 'SENT',
        retryCount: 0,
        fallbackAttempt: false,
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
  })
  async sendConfirmation(@Body() sendTemplateDto: SendTemplateDto) {
    return this.templateService.sendConfirmation(sendTemplateDto);
  }

  @Post('reminder')
  @ApiOperation({ summary: 'Send appointment reminder template' })
  @ApiBody({
    type: SendTemplateDto,
    examples: {
      reminder: {
        summary: 'Reminder request',
        value: {
          templateName: 'appointment_reminder',
          patientName: 'Manju Kumari',
          doctorName: 'Dr. Jatin Das',
          appointmentDate: '2026-05-15',
          appointmentTime: '10:30 AM',
          hospitalName: 'BMR Hospital',
          phoneNumber: '919999999999',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Reminder template sent.',
    headers: {
      'Content-Type': {
        description: 'Response content type',
        schema: { type: 'string', example: 'application/json' },
      },
    },
    schema: {
      example: {
        success: true,
        provider: 'MessageBird',
        messageId: 'msg_bird_1715678900_919999999999',
        status: 'SENT',
        sentAt: '2026-05-14T09:05:00.000Z',
        providerStatus: 'SENT',
        retryCount: 0,
        fallbackAttempt: false,
        providerPayload: {
          name: 'appointment_reminder',
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
  })
  async sendReminder(@Body() sendTemplateDto: SendTemplateDto) {
    return this.templateService.sendReminder(sendTemplateDto);
  }

  @Post('cancellation')
  @ApiOperation({ summary: 'Send appointment cancellation template' })
  @ApiBody({
    type: SendTemplateDto,
    examples: {
      cancellation: {
        summary: 'Cancellation request',
        value: {
          templateName: 'appointment_cancellation',
          patientName: 'Manju Kumari',
          doctorName: 'Dr. Jatin Das',
          appointmentDate: '2026-05-15',
          appointmentTime: '10:30 AM',
          hospitalName: 'BMR Hospital',
          phoneNumber: '919999999999',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Cancellation template sent.',
    headers: {
      'Content-Type': {
        description: 'Response content type',
        schema: { type: 'string', example: 'application/json' },
      },
    },
    schema: {
      example: {
        success: true,
        provider: 'MetaWhatsApp',
        messageId: 'wamid.HbL1715678950@919999999999',
        status: 'SENT',
        sentAt: '2026-05-14T09:10:00.000Z',
        providerStatus: 'SENT',
        retryCount: 0,
        fallbackAttempt: false,
        providerPayload: {
          name: 'appointment_cancellation',
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
  })
  async sendCancellation(@Body() sendTemplateDto: SendTemplateDto) {
    return this.templateService.sendCancellation(sendTemplateDto);
  }

  @Post('webhook/delivery')
  @ApiOperation({ summary: 'Update template delivery status' })
  @ApiBody({
    type: DeliveryStatusDto,
    examples: {
      delivery: {
        summary: 'Delivery status update',
        value: {
          messageId: 'meta-tmpl-abc-123',
          status: 'DELIVERED',
          failureReason: null,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Delivery status updated.',
    headers: {
      'Content-Type': {
        description: 'Response content type',
        schema: { type: 'string', example: 'application/json' },
      },
    },
    schema: {
      example: {
        success: true,
        messageId: 'meta-tmpl-abc-123',
        status: 'DELIVERED',
        failureReason: null,
        provider: 'MetaWhatsApp',
        retryCount: 0,
        fallbackAttempt: false,
        providerStatus: 'DELIVERED',
        sentAt: '2026-05-14T09:00:00.000Z',
        createdAt: '2026-05-14T09:00:00.000Z',
        updatedAt: '2026-05-14T09:05:00.000Z',
      },
    },
  })
  async updateDeliveryStatus(@Body() deliveryStatusDto: DeliveryStatusDto) {
    return this.templateService.updateDeliveryStatus(deliveryStatusDto);
  }

  @Get('status/:messageId')
  @ApiOperation({ summary: 'Get template delivery status' })
  @ApiParam({
    name: 'messageId',
    description: 'Template message ID to look up',
    example: 'meta-tmpl-abc-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Delivery status returned.',
    headers: {
      'Content-Type': {
        description: 'Response content type',
        schema: { type: 'string', example: 'application/json' },
      },
    },
    schema: {
      example: {
        success: true,
        messageId: 'meta-tmpl-abc-123',
        status: 'DELIVERED',
        failureReason: null,
        provider: 'MetaWhatsApp',
        retryCount: 0,
        fallbackAttempt: false,
        providerStatus: 'DELIVERED',
        sentAt: '2026-05-14T09:00:00.000Z',
        createdAt: '2026-05-14T09:00:00.000Z',
        updatedAt: '2026-05-14T09:05:00.000Z',
      },
    },
  })
  async getDeliveryStatus(@Param('messageId') messageId: string) {
    return this.templateService.getDeliveryStatus(messageId);
  }
}
