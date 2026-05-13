import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentService } from './appointment.service';
import { TemplateService } from 'src/template/template.service';

const appointmentPayload = {
  patientName: 'Manju Kumari',
  phoneNumber: '919999999999',
  appointmentDate: '2026-05-15',
  doctorName: 'Dr. Jatin Das',
  appointmentTime: '10:30 AM',
  hospitalName: 'BMR Hospital',
};

const mockMetaResponse = {
  success: true,
  provider: 'META_WHATSAPP',
  messageId: 'meta-wamid-test-001',
  to: '919999999999',
  templateName: 'appointment_confirmation',
  status: 'SENT',
  sentAt: '2026-05-15T10:00:00.000Z',
  retryCount: 0,
  fallbackUsed: false,
  providerPayload: {},
};

const mockMessageBirdResponse = {
  success: true,
  provider: 'MESSAGE_BIRD',
  messageId: 'mb-test-001',
  to: '919999999999',
  templateName: 'appointment_confirmation',
  status: 'SENT',
  sentAt: '2026-05-15T10:00:00.000Z',
  retryCount: 0,
  fallbackUsed: false,
  providerPayload: {},
};

describe('AppointmentService', () => {
  let service: AppointmentService;
  let mockTemplateService: { sendConfirmation: jest.Mock };

  beforeEach(async () => {
    mockTemplateService = { sendConfirmation: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentService,
        { provide: TemplateService, useValue: mockTemplateService },
      ],
    }).compile();

    service = module.get<AppointmentService>(AppointmentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('template routing', () => {
    it('should use TemplateService.sendConfirmation for appointment notifications', async () => {
      mockTemplateService.sendConfirmation.mockResolvedValue(mockMetaResponse);

      const result = await service.createAppointment(appointmentPayload);

      expect(mockTemplateService.sendConfirmation).toHaveBeenCalledWith({
        templateName: 'appointment_confirmation',
        patientName: appointmentPayload.patientName,
        doctorName: 'Dr. Default',
        appointmentDate: appointmentPayload.appointmentDate,
        appointmentTime: '10:00 AM',
        hospitalName: 'Default Clinic',
        phoneNumber: appointmentPayload.phoneNumber,
      });
      expect(result.whatsappResponse.provider).toBe('META_WHATSAPP');
      expect(result.whatsappResponse.success).toBe(true);
    });
  });

  describe('appointment notification flow', () => {
    it('should return appointment details and whatsapp response', async () => {
      mockTemplateService.sendConfirmation.mockResolvedValue(mockMetaResponse);

      const result = await service.createAppointment(appointmentPayload);
      expect(result.success).toBe(true);
      expect(result.appointment.patientName).toBe('Manju Kumari');
      expect(result.appointment.phoneNumber).toBe('919999999999');
      expect(result.appointment.appointmentDate).toBe('2026-05-15');
      expect(result.whatsappResponse.messageId).toBeDefined();
    });

    it('should call sendConfirmation with full appointment payload', async () => {
      mockTemplateService.sendConfirmation.mockResolvedValue(mockMetaResponse);

      await service.createAppointment(appointmentPayload);

      expect(mockTemplateService.sendConfirmation).toHaveBeenCalledWith({
        templateName: 'appointment_confirmation',
        patientName: appointmentPayload.patientName,
        doctorName: 'Dr. Default',
        appointmentDate: appointmentPayload.appointmentDate,
        appointmentTime: '10:00 AM',
        hospitalName: 'Default Clinic',
        phoneNumber: appointmentPayload.phoneNumber,
      });
    });
  });

  describe('failure scenarios', () => {
    it('should propagate error when template service rejects invalid phone number', async () => {
      mockTemplateService.sendConfirmation.mockRejectedValue(
        new Error('Invalid phone number: 123'),
      );

      await expect(
        service.createAppointment({
          ...appointmentPayload,
          phoneNumber: '123',
        }),
      ).rejects.toThrow('Invalid phone number: 123');
    });

    it('should propagate error when template service throws network error', async () => {
      mockTemplateService.sendConfirmation.mockRejectedValue(
        new Error('Network timeout'),
      );

      await expect(service.createAppointment(appointmentPayload)).rejects.toThrow(
        'Network timeout',
      );
    });
  });
});
