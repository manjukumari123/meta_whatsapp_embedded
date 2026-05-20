import { Test, TestingModule } from '@nestjs/testing';
import { VoicebotWorkflowsService } from './voicebot-workflows.service';
import { ConversationContextService } from '../services/conversation-context.service';
import { IntentType } from '../../nlp/enums/intent.enum';

describe('VoicebotWorkflowsService', () => {
  let service: VoicebotWorkflowsService;
  let contextService: ConversationContextService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoicebotWorkflowsService,
        {
          provide: ConversationContextService,
          useValue: {
            getContext: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<VoicebotWorkflowsService>(VoicebotWorkflowsService);
    contextService = module.get<ConversationContextService>(ConversationContextService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateStepInput', () => {
    const phoneNumber = '919999999999';

    beforeEach(() => {
      service.initializeWorkflow(phoneNumber, 'booking-workflow');
    });

    it('should return valid when no expected input is required', () => {
      // Advance to confirmation step which has no expected input
      service.updateWorkflowState(phoneNumber, { currentStepIndex: 3 });
      const result = service.validateStepInput(phoneNumber, {});
      expect(result.valid).toBe(true);
      expect(result.missingFields).toBeUndefined();
    });

    it('should return valid when all expected input is present', () => {
      const collectedData = { specialization: 'dermatologist' };
      const result = service.validateStepInput(phoneNumber, collectedData);
      expect(result.valid).toBe(true);
      expect(result.missingFields).toBeUndefined();
    });

    it('should return invalid when expected input is missing', () => {
      const collectedData = {};
      const result = service.validateStepInput(phoneNumber, collectedData);
      expect(result.valid).toBe(false);
      expect(result.missingFields).toEqual(['specialization']);
    });

    it('should return valid when at least one expected input is present', () => {
      const collectedData = { specialization: 'dermatologist' };
      // This is the first step which expects 'specialization'
      const result = service.validateStepInput(phoneNumber, collectedData);
      expect(result.valid).toBe(true);
    });

    it('should return valid when at least one of multiple expected inputs is present', () => {
      const collectedData = { time: '10:00' };
      // Advance to time step which expects time or timePeriod
      service.updateWorkflowState(phoneNumber, { currentStepIndex: 2 });
      const result = service.validateStepInput(phoneNumber, collectedData);
      expect(result.valid).toBe(true);
      expect(result.missingFields).toBeUndefined();
    });

    it('should return invalid when workflow state does not exist', () => {
      service.clearWorkflowState(phoneNumber);
      const result = service.validateStepInput(phoneNumber, {});
      expect(result.valid).toBe(false);
    });

    it('should return invalid when workflow does not exist', () => {
      service.initializeWorkflow(phoneNumber, 'non-existent-workflow');
      const result = service.validateStepInput(phoneNumber, {});
      expect(result.valid).toBe(false);
    });
  });

  describe('Workflow step validation for booking', () => {
    const phoneNumber = '919999999999';

    beforeEach(() => {
      service.initializeWorkflow(phoneNumber, 'booking-workflow');
    });

    it('should validate specialization step', () => {
      const result = service.validateStepInput(phoneNumber, { specialization: 'dermatologist' });
      expect(result.valid).toBe(true);
    });

    it('should fail validation for specialization step when missing', () => {
      const result = service.validateStepInput(phoneNumber, {});
      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain('specialization');
    });

    it('should validate date step', () => {
      service.updateWorkflowState(phoneNumber, { currentStepIndex: 1 });
      const result = service.validateStepInput(phoneNumber, { date: '2026-05-20' });
      expect(result.valid).toBe(true);
    });

    it('should fail validation for date step when missing', () => {
      service.updateWorkflowState(phoneNumber, { currentStepIndex: 1 });
      const result = service.validateStepInput(phoneNumber, {});
      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain('date');
    });

    it('should validate time step with time', () => {
      service.updateWorkflowState(phoneNumber, { currentStepIndex: 2 });
      const result = service.validateStepInput(phoneNumber, { time: '10:00' });
      expect(result.valid).toBe(true);
    });

    it('should validate time step with timePeriod', () => {
      service.updateWorkflowState(phoneNumber, { currentStepIndex: 2 });
      const result = service.validateStepInput(phoneNumber, { timePeriod: 'morning' });
      expect(result.valid).toBe(true);
    });

    it('should fail validation for time step when both time and timePeriod are missing', () => {
      service.updateWorkflowState(phoneNumber, { currentStepIndex: 2 });
      const result = service.validateStepInput(phoneNumber, {});
      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain('time');
      expect(result.missingFields).toContain('timePeriod');
    });
  });

  describe('Workflow step validation for cancellation', () => {
    const phoneNumber = '919999999999';

    beforeEach(() => {
      service.initializeWorkflow(phoneNumber, 'cancellation-workflow');
    });

    it('should validate appointmentId step', () => {
      const result = service.validateStepInput(phoneNumber, { appointmentId: '12345' });
      expect(result.valid).toBe(true);
    });

    it('should fail validation for appointmentId step when missing', () => {
      const result = service.validateStepInput(phoneNumber, {});
      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain('appointmentId');
    });

    it('should validate confirm step with no expected input', () => {
      service.updateWorkflowState(phoneNumber, { currentStepIndex: 1 });
      const result = service.validateStepInput(phoneNumber, {});
      expect(result.valid).toBe(true);
    });
  });

  describe('Workflow step validation for reschedule', () => {
    const phoneNumber = '919999999999';

    beforeEach(() => {
      service.initializeWorkflow(phoneNumber, 'reschedule-workflow');
    });

    it('should validate list-appointments step with no expected input', () => {
      const result = service.validateStepInput(phoneNumber, {});
      expect(result.valid).toBe(true);
    });

    it('should validate select-appointment step with appointmentId', () => {
      service.updateWorkflowState(phoneNumber, { currentStepIndex: 1 });
      const result = service.validateStepInput(phoneNumber, { appointmentId: '12345' });
      expect(result.valid).toBe(true);
    });

    it('should validate select-appointment step with doctorName', () => {
      service.updateWorkflowState(phoneNumber, { currentStepIndex: 1 });
      const result = service.validateStepInput(phoneNumber, { doctorName: 'Dr. Smith' });
      expect(result.valid).toBe(true);
    });

    it('should validate select-appointment step with date', () => {
      service.updateWorkflowState(phoneNumber, { currentStepIndex: 1 });
      const result = service.validateStepInput(phoneNumber, { date: '2026-05-20' });
      expect(result.valid).toBe(true);
    });

    it('should fail validation for select-appointment step when all expected inputs are missing', () => {
      service.updateWorkflowState(phoneNumber, { currentStepIndex: 1 });
      const result = service.validateStepInput(phoneNumber, {});
      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain('appointmentId');
      expect(result.missingFields).toContain('doctorName');
      expect(result.missingFields).toContain('date');
    });

    it('should validate new-date step', () => {
      service.updateWorkflowState(phoneNumber, { currentStepIndex: 2 });
      const result = service.validateStepInput(phoneNumber, { date: '2026-05-20' });
      expect(result.valid).toBe(true);
    });

    it('should fail validation for new-date step when missing', () => {
      service.updateWorkflowState(phoneNumber, { currentStepIndex: 2 });
      const result = service.validateStepInput(phoneNumber, {});
      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain('date');
    });
  });

  describe('Workflow step validation for availability', () => {
    const phoneNumber = '919999999999';

    beforeEach(() => {
      service.initializeWorkflow(phoneNumber, 'availability-workflow');
    });

    it('should validate doctor-type step with specialization', () => {
      const result = service.validateStepInput(phoneNumber, { specialization: 'dermatologist' });
      expect(result.valid).toBe(true);
    });

    it('should validate doctor-type step with doctorName', () => {
      const result = service.validateStepInput(phoneNumber, { doctorName: 'Dr. Smith' });
      expect(result.valid).toBe(true);
    });

    it('should fail validation for doctor-type step when both are missing', () => {
      const result = service.validateStepInput(phoneNumber, {});
      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain('specialization');
      expect(result.missingFields).toContain('doctorName');
    });

    it('should validate date step', () => {
      service.updateWorkflowState(phoneNumber, { currentStepIndex: 1 });
      const result = service.validateStepInput(phoneNumber, { date: '2026-05-20' });
      expect(result.valid).toBe(true);
    });
  });

  describe('Workflow step validation for escalation', () => {
    const phoneNumber = '919999999999';

    beforeEach(() => {
      service.initializeWorkflow(phoneNumber, 'escalation-workflow');
    });

    it('should validate reason step with no expected input', () => {
      const result = service.validateStepInput(phoneNumber, {});
      expect(result.valid).toBe(true);
    });

    it('should validate confirm step with no expected input', () => {
      service.updateWorkflowState(phoneNumber, { currentStepIndex: 1 });
      const result = service.validateStepInput(phoneNumber, {});
      expect(result.valid).toBe(true);
    });
  });
});
