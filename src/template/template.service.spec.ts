import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { TemplateService } from './template.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { WhatsAppProviderFactory } from '../whatsapp/providers/whatsapp-provider.factory';

describe('TemplateService', () => {
  let service: TemplateService;
  let whatsappService: WhatsappService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot()],
      providers: [
        TemplateService,
        WhatsappService,
        WhatsAppProviderFactory,
      ],
    }).compile();

    service = module.get<TemplateService>(TemplateService);
    whatsappService = module.get<WhatsappService>(WhatsappService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should send confirmation template successfully', async () => {
    const dto = {
      templateName: 'appointment_confirmation',
      patientName: 'John Doe',
      doctorName: 'Dr. Smith',
      appointmentDate: '2026-05-15',
      appointmentTime: '10:00 AM',
      hospitalName: 'Test Hospital',
      phoneNumber: '919999999999',
    };

    const result = await service.sendConfirmation(dto);
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
    expect(result.provider).toBeDefined();
    expect(result.status).toBe('SENT');
  });

  it('should send reminder template successfully', async () => {
    const dto = {
      templateName: 'appointment_reminder',
      patientName: 'John Doe',
      doctorName: 'Dr. Smith',
      appointmentDate: '2026-05-15',
      appointmentTime: '10:00 AM',
      hospitalName: 'Test Hospital',
      phoneNumber: '919999999999',
    };

    const result = await service.sendReminder(dto);
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
  });

  it('should send cancellation template successfully', async () => {
    const dto = {
      templateName: 'appointment_cancellation',
      patientName: 'John Doe',
      doctorName: 'Dr. Smith',
      appointmentDate: '2026-05-15',
      appointmentTime: '10:00 AM',
      hospitalName: 'Test Hospital',
      phoneNumber: '919999999999',
    };

    const result = await service.sendCancellation(dto);
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
  });

  it('should track retry and fallback metadata in delivery status', async () => {
    const dto = {
      templateName: 'appointment_confirmation',
      patientName: 'John Doe',
      doctorName: 'Dr. Smith',
      appointmentDate: '2026-05-15',
      appointmentTime: '10:00 AM',
      hospitalName: 'Test Hospital',
      phoneNumber: '919999999999',
    };

    const result = await service.sendConfirmation(dto);
    expect(result).toBeDefined();
    expect(result.retryCount).toBeDefined();
    expect(result.fallbackAttempt).toBeDefined();
    expect(result.providerStatus).toBeDefined();
  });

  it('should update delivery status', async () => {
    const messageId = 'test-message-id-123';
    const updateDto = {
      messageId,
      status: 'DELIVERED',
      failureReason: null,
    };

    const result = await service.updateDeliveryStatus(updateDto);
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.messageId).toBe(messageId);
    expect(result.status).toBe('DELIVERED');
  });

  it('should get delivery status', async () => {
    const messageId = 'test-message-id-123';
    
    // First update the status
    await service.updateDeliveryStatus({
      messageId,
      status: 'DELIVERED',
      failureReason: null,
    });

    // Then get the status
    const result = await service.getDeliveryStatus(messageId);
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.messageId).toBe(messageId);
    expect(result.status).toBe('DELIVERED');
  });

  it('should return unknown status for non-existent message', async () => {
    const result = await service.getDeliveryStatus('non-existent-id');
    expect(result).toBeDefined();
    expect(result.success).toBe(false);
    expect(result.status).toBe('UNKNOWN');
  });

  it('should persist delivery records with full metadata', async () => {
    const dto = {
      templateName: 'appointment_confirmation',
      patientName: 'John Doe',
      doctorName: 'Dr. Smith',
      appointmentDate: '2026-05-15',
      appointmentTime: '10:00 AM',
      hospitalName: 'Test Hospital',
      phoneNumber: '919999999999',
    };

    const sendResult = await service.sendConfirmation(dto);
    expect(sendResult.success).toBe(true);

    const statusResult = await service.getDeliveryStatus(sendResult.messageId);
    expect(statusResult.success).toBe(true);
    expect(statusResult.provider).toBeDefined();
    expect(statusResult.retryCount).toBeDefined();
    expect(statusResult.fallbackAttempt).toBeDefined();
    expect(statusResult.providerStatus).toBeDefined();
    expect(statusResult.sentAt).toBeDefined();
  });

  it('should handle failure reason in delivery status update', async () => {
    const messageId = 'test-message-id-456';
    const updateDto = {
      messageId,
      status: 'FAILED',
      failureReason: 'Rate limit exceeded',
    };

    const result = await service.updateDeliveryStatus(updateDto);
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.status).toBe('FAILED');
    expect(result.failureReason).toBe('Rate limit exceeded');
  });
});
