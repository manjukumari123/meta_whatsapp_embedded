import { Test, TestingModule } from '@nestjs/testing';
import { NlpRecognitionService } from '../services/nlp-recognition.service';
import { IntentType } from '../enums/intent.enum';
import { StructuredLoggingService } from '../../logging/services/structured-logging.service';

describe('NlpRecognitionService', () => {
  let service: NlpRecognitionService;

  beforeEach(async () => {
    const mockStructuredLoggingService = {
      logIntentDetection: jest.fn(),
      logEntityExtraction: jest.fn(),
      logBookingFlow: jest.fn(),
      logCancellationFlow: jest.fn(),
      logRescheduleFlow: jest.fn(),
      logSlotAllocation: jest.fn(),
      logAlternateSlotSuggestion: jest.fn(),
      logApiFailure: jest.fn(),
      logRetry: jest.fn(),
      logEscalation: jest.fn(),
      logFlowTransition: jest.fn(),
      logContextSwitch: jest.fn(),
      logFallbackTrigger: jest.fn(),
      logWorkflowStep: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NlpRecognitionService,
        {
          provide: StructuredLoggingService,
          useValue: mockStructuredLoggingService,
        },
      ],
    }).compile();

    service = module.get<NlpRecognitionService>(NlpRecognitionService);
  });

  describe('Intent Detection', () => {
    it('should detect BOOK_APPOINTMENT intent', () => {
      const result = service.analyzeUserInput('I need to book an appointment with Dr. Rajesh');
      expect(result.intent).toBe(IntentType.BOOK_APPOINTMENT);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect CANCEL_APPOINTMENT intent', () => {
      const result = service.analyzeUserInput('Cancel my appointment please');
      expect(result.intent).toBe(IntentType.CANCEL_APPOINTMENT);
    });

    it('should detect VIEW_APPOINTMENTS intent', () => {
      const result = service.analyzeUserInput('Show me my upcoming bookings');
      expect(result.intent).toBe(IntentType.VIEW_APPOINTMENTS);
    });

    it('should detect CHECK_SLOTS intent', () => {
      const result = service.analyzeUserInput('Are there any available slots today?');
      expect(result.intent).toBe(IntentType.CHECK_SLOTS);
    });

    it('should handle typos in intent detection', () => {
      const result = service.analyzeUserInput('I wanna book appointment with docter');
      expect(result.intent).toBe(IntentType.BOOK_APPOINTMENT);
    });

    it('should handle mixed case', () => {
      const result = service.analyzeUserInput('BOOK APPOINTMENT WITH DR RAJESH');
      expect(result.intent).toBe(IntentType.BOOK_APPOINTMENT);
    });
  });

  describe('Entity Extraction', () => {
    it('should extract doctor name', () => {
      const result = service.analyzeUserInput('Book appointment with Dr. Rajesh Kumar');
      expect(result.extractedEntities.doctorName).toBe('Rajesh Kumar');
    });

    it('should extract specialization', () => {
      const result = service.analyzeUserInput('I need a dermatologist');
      expect(result.extractedEntities.specialization).toBe('dermatologist');
    });

    it('should extract date - tomorrow', () => {
      const result = service.analyzeUserInput('Book appointment tomorrow');
      expect(result.extractedEntities.date).toBeDefined();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(result.extractedEntities.date).toBe(tomorrow.toISOString().split('T')[0]);
    });

    it('should extract date - today', () => {
      const result = service.analyzeUserInput('Any slots today?');
      expect(result.extractedEntities.date).toBe(new Date().toISOString().split('T')[0]);
    });

    it('should extract time', () => {
      const result = service.analyzeUserInput('Book appointment at 3:30 PM');
      expect(result.extractedEntities.time).toBe('15:30');
    });

    it('should extract time period - evening', () => {
      const result = service.analyzeUserInput('I need evening slot');
      expect(result.extractedEntities.timePeriod).toBe('evening');
    });

    it('should extract multiple entities', () => {
      const result = service.analyzeUserInput('Book with Dr. Rajesh tomorrow at 5 PM');
      expect(result.extractedEntities.doctorName).toContain('Rajesh');
      expect(result.extractedEntities.date).toBeDefined();
      expect(result.extractedEntities.time).toBe('17:00');
    });
  });

  describe('Typo Handling', () => {
    it('should handle common typos', () => {
      const result = service.analyzeUserInput('I wanna book appt tmrw with docter');
      expect(result.intent).toBe(IntentType.BOOK_APPOINTMENT);
    });

    it('should handle shorthand', () => {
      const result = service.analyzeUserInput('pls cancel my apt with Dr. Rajesh');
      expect(result.intent).toBe(IntentType.CANCEL_APPOINTMENT);
    });

    it('should handle mixed typos and spaces', () => {
      const result = service.analyzeUserInput('  I   wanna   appt   tmrw   ');
      expect(result.extractedEntities.date).toBeDefined();
    });
  });

  describe('Confidence Scoring', () => {
    it('should have higher confidence for clear intents', () => {
      const clear = service.analyzeUserInput('Book appointment with Dr. Rajesh tomorrow at 3 PM');
      const ambiguous = service.analyzeUserInput('ok');
      expect(clear.confidence).toBeGreaterThan(ambiguous.confidence);
    });

    it('should have lower confidence for short inputs', () => {
      const result = service.analyzeUserInput('ok');
      expect(result.confidence).toBeLessThan(0.7);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      const result = service.analyzeUserInput('');
      expect(result.intent).toBe(IntentType.FALLBACK);
    });

    it('should handle very long input', () => {
      const longInput =
        'I would really like to book an appointment with Dr. Rajesh Kumar who is a dermatologist tomorrow at 5 PM because I have some skin issues';
      const result = service.analyzeUserInput(longInput);
      expect(result.intent).toBe(IntentType.BOOK_APPOINTMENT);
      expect(result.extractedEntities.doctorName).toContain('Rajesh');
    });

    it('should handle multiple doctor names', () => {
      const result = service.analyzeUserInput('Book with Dr. Rajesh and Dr. Priya');
      // Should extract first doctor
      expect(result.extractedEntities.doctorName).toBeDefined();
    });
  });
});
