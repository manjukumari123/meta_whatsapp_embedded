import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TemplateService } from './template.service';
import {
  TemplateMessage,
  TemplateStatus,
  TemplateType,
} from './entities/template-message.entity';
import { WhatsAppProviderFactory } from 'src/whatsapp/factory/whatsapp-provider.factory';

const mockTemplatePayload = {
  patientName: 'Manju Kumari',
  doctorName: 'Dr. Jatin Das',
  appointmentDate: '2026-05-15',
  appointmentTime: '10:30 AM',
  hospitalName: 'BMR Hospital',
  phoneNumber: '919999999999',
};

const mockMetaTemplateResponse = {
  success: true,
  provider: 'META_WHATSAPP',
  messageId: 'meta-tmpl-uuid-001',
  to: '919999999999',
  templateName: 'appointment_confirmation',
  status: 'SENT',
  sentAt: '2026-05-15T10:00:00.000Z',
  providerPayload: {},
};

const mockTemplateRepo = {
  create: jest.fn().mockImplementation((dto) => dto),
  save: jest.fn().mockResolvedValue({}),
  findOne: jest.fn(),
};

function createMockProviderFactory(
  primarySend: jest.Mock,
  secondarySend: jest.Mock,
) {
  return {
    getProvider: jest.fn(),
    getProvidersWithFailover: jest.fn().mockReturnValue([
      { sendTemplateMessage: primarySend, name: 'META_WHATSAPP' },
      { sendTemplateMessage: secondarySend, name: 'MESSAGE_BIRD' },
    ]),
  };
}

describe('TemplateService', () => {
  let service: TemplateService;
  let mockProviderFactory: ReturnType<typeof createMockProviderFactory>;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockProviderFactory = createMockProviderFactory(
      jest.fn().mockResolvedValue(mockMetaTemplateResponse),
      jest.fn().mockResolvedValue(mockMetaTemplateResponse),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplateService,
        { provide: WhatsAppProviderFactory, useValue: mockProviderFactory },
        {
          provide: getRepositoryToken(TemplateMessage),
          useValue: mockTemplateRepo,
        },
      ],
    }).compile();

    service = module.get<TemplateService>(TemplateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendConfirmation', () => {
    it('should send confirmation template and return SENT status', async () => {
      const result = await service.sendConfirmation({
        ...mockTemplatePayload,
        templateName: TemplateType.CONFIRMATION,
      });
      expect(result.success).toBe(true);
      expect(result.status).toBe('SENT');
      if (!result.success) {
        throw new Error('Expected template send to succeed');
      }
      expect(result.messageId).toBeDefined();
    });

    it('should persist the template message to the repository', async () => {
      await service.sendConfirmation({
        ...mockTemplatePayload,
        templateName: TemplateType.CONFIRMATION,
      });
      expect(mockTemplateRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('sendReminder', () => {
    it('should send reminder template and return SENT status', async () => {
      const result = await service.sendReminder({
        ...mockTemplatePayload,
        templateName: TemplateType.REMINDER,
      });
      expect(result.success).toBe(true);
      expect(result.status).toBe('SENT');
    });
  });

  describe('sendCancellation', () => {
    it('should send cancellation template and return SENT status', async () => {
      const result = await service.sendCancellation({
        ...mockTemplatePayload,
        templateName: TemplateType.CANCELLATION,
      });
      expect(result.success).toBe(true);
      expect(result.status).toBe('SENT');
    });
  });

  describe('retry logic', () => {
    it('should retry up to 3 times on failure and return FAILED status', async () => {
      const primarySend = jest
        .fn()
        .mockRejectedValue(new Error('Network timeout'));
      const secondarySend = jest
        .fn()
        .mockRejectedValue(new Error('Network timeout'));

      mockProviderFactory.getProvidersWithFailover.mockReturnValue([
        { sendTemplateMessage: primarySend, name: 'META_WHATSAPP' },
        { sendTemplateMessage: secondarySend, name: 'MESSAGE_BIRD' },
      ]);

      const result = await service.sendConfirmation({
        ...mockTemplatePayload,
        templateName: TemplateType.CONFIRMATION,
      });

      expect(primarySend).toHaveBeenCalledTimes(3);
      expect(secondarySend).toHaveBeenCalledTimes(3);
      expect(result.success).toBe(false);
      expect(result.status).toBe(TemplateStatus.FAILED);
      if (result.success) {
        throw new Error('Expected template send to fail');
      }
      expect(result.failureReason).toContain('Network timeout');
    });

    it('should succeed on second attempt if first fails', async () => {
      const primarySend = jest
        .fn()
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce(mockMetaTemplateResponse);
      const secondarySend = jest.fn().mockResolvedValue(mockMetaTemplateResponse);

      mockProviderFactory.getProvidersWithFailover.mockReturnValue([
        { sendTemplateMessage: primarySend, name: 'META_WHATSAPP' },
        { sendTemplateMessage: secondarySend, name: 'MESSAGE_BIRD' },
      ]);

      const result = await service.sendConfirmation({
        ...mockTemplatePayload,
        templateName: TemplateType.CONFIRMATION,
      });

      expect(primarySend).toHaveBeenCalledTimes(2);
      expect(secondarySend).toHaveBeenCalledTimes(0);
      expect(result.success).toBe(true);
      if (!result.success) {
        throw new Error('Expected template send to succeed');
      }
      expect(result.retryCount).toBe(1);
    });

    it('should fallback to secondary provider when primary fails completely', async () => {
      const primarySend = jest
        .fn()
        .mockRejectedValue(new Error('Primary down'));
      const secondarySend = jest.fn().mockResolvedValue({
        ...mockMetaTemplateResponse,
        provider: 'MESSAGE_BIRD',
        messageId: 'mb-tmpl-fallback-001',
      });

      mockProviderFactory.getProvidersWithFailover.mockReturnValue([
        { sendTemplateMessage: primarySend, name: 'META_WHATSAPP' },
        { sendTemplateMessage: secondarySend, name: 'MESSAGE_BIRD' },
      ]);

      const result = await service.sendConfirmation({
        ...mockTemplatePayload,
        templateName: TemplateType.CONFIRMATION,
      });

      expect(primarySend).toHaveBeenCalledTimes(3);
      expect(secondarySend).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(true);
      if (!result.success) {
        throw new Error('Expected template send to succeed');
      }
      expect(result.fallbackUsed).toBe(true);
      expect(result.provider).toBe('MESSAGE_BIRD');
    });
  });

  describe('handleDeliveryEvent', () => {
    it('should update status to DELIVERED', async () => {
      mockTemplateRepo.findOne.mockResolvedValue({
        messageId: 'meta-tmpl-uuid-001',
        status: TemplateStatus.SENT,
      });

      const result = await service.handleDeliveryEvent({
        messageId: 'meta-tmpl-uuid-001',
        status: TemplateStatus.DELIVERED,
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe(TemplateStatus.DELIVERED);
    });

    it('should update status to FAILED with failureReason', async () => {
      mockTemplateRepo.findOne.mockResolvedValue({
        messageId: 'meta-tmpl-uuid-001',
        status: TemplateStatus.SENT,
      });

      const result = await service.handleDeliveryEvent({
        messageId: 'meta-tmpl-uuid-001',
        status: TemplateStatus.FAILED,
        failureReason: 'Number not registered',
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe(TemplateStatus.FAILED);
    });

    it('should throw NotFoundException for unknown messageId', async () => {
      mockTemplateRepo.findOne.mockResolvedValue(null);

      await expect(
        service.handleDeliveryEvent({
          messageId: 'non-existent-id',
          status: TemplateStatus.DELIVERED,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStatus', () => {
    it('should return status for a known messageId', async () => {
      mockTemplateRepo.findOne.mockResolvedValue({
        messageId: 'meta-tmpl-uuid-001',
        templateName: TemplateType.CONFIRMATION,
        provider: 'META_WHATSAPP',
        status: TemplateStatus.DELIVERED,
        retryCount: 0,
        failureReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.getStatus('meta-tmpl-uuid-001');
      expect(result.messageId).toBe('meta-tmpl-uuid-001');
      expect(result.status).toBe(TemplateStatus.DELIVERED);
    });

    it('should throw NotFoundException for unknown messageId', async () => {
      mockTemplateRepo.findOne.mockResolvedValue(null);

      await expect(service.getStatus('unknown-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
