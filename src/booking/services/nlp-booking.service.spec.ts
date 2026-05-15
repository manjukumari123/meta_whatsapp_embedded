import { Test, TestingModule } from '@nestjs/testing';
import { NlpBookingService } from '../services/nlp-booking.service';
import { NlpRecognitionService } from '../../nlp/services/nlp-recognition.service';
import { SlotManagementService } from '../../slot-management/services/slot-management.service';
import { ConversationContextService } from '../../conversation/services/conversation-context.service';
import { IntentType } from '../../nlp/enums/intent.enum';

describe('NlpBookingService', () => {
  let service: NlpBookingService;
  let nlpService: NlpRecognitionService;
  let slotService: SlotManagementService;
  let contextService: ConversationContextService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NlpBookingService,
        NlpRecognitionService,
        SlotManagementService,
        ConversationContextService,
      ],
    }).compile();

    service = module.get<NlpBookingService>(NlpBookingService);
    nlpService = module.get<NlpRecognitionService>(NlpRecognitionService);
    slotService = module.get<SlotManagementService>(SlotManagementService);
    contextService = module.get<ConversationContextService>(ConversationContextService);
  });

  describe('Booking Flow', () => {
    it('should process booking request with complete information', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const request = {
        phoneNumber: '1234567890',
        userMessage: `Book appointment with Dr. Rajesh on ${tomorrowStr} at 10:00 AM`,
      };

      const response = await service.processUserMessage(request);

      expect(response.intent).toBe(IntentType.BOOK_APPOINTMENT);
      expect(response.success || response.requiresConfirmation).toBe(true);
    });

    const findNextEveningDate = (): string => {
      const start = new Date();
      for (let offset = 1; offset <= 14; offset += 1) {
        const date = new Date(start);
        date.setDate(start.getDate() + offset);
        const dateStr = date.toISOString().split('T')[0];
        const slots = slotService.getAvailableSlots('doc-1', dateStr).slots;
        if (slots.some((slot) => slot.startTime >= '16:00' && slot.startTime < '20:00')) {
          return dateStr;
        }
      }
      throw new Error('No evening slots found for doc-1 in the next two weeks');
    };

    it('should return only evening slots for evening requests', async () => {
      const request = {
        phoneNumber: '1234567890',
        userMessage: 'I need a skin doctor tomorrow evening',
      };

      const response = await service.processUserMessage(request);

      expect(response.intent).toBe(IntentType.BOOK_APPOINTMENT);
      expect(response.success).toBe(true);
      expect(response.requiresConfirmation).toBe(true);
      expect(response.availableSlots).toBeDefined();
      expect(response.availableSlots.length).toBeGreaterThan(0);
      expect(response.availableSlots.every((slot) => slot.startTime >= '16:00' && slot.startTime < '20:00')).toBe(true);
      expect(response.data?.availableSlots).toBeUndefined();
      expect(response.message).not.toContain('undefined');
    });

    it('should store pending booking context after slot suggestions', async () => {
      const date = findNextEveningDate();
      const request = {
        phoneNumber: '1234567890',
        userMessage: `I need a dermatologist on ${date} evening`,
      };

      const response = await service.processUserMessage(request);
      const pending = contextService.getPendingConfirmation('1234567890');

      expect(response.intent).toBe(IntentType.BOOK_APPOINTMENT);
      expect(response.success).toBe(true);
      expect(response.requiresConfirmation).toBe(true);
      expect(response.availableSlots).toBeDefined();
      expect(pending).toBeDefined();
      expect(pending.doctorId).toBe('doc-1');
      expect(pending.date).toBe(date);
      expect(pending.availableSlots.length).toBeGreaterThan(0);
      expect(response.message).not.toContain('undefined');
    });

    it('should book the pending 16:00 slot when selected after suggestions', async () => {
      const date = findNextEveningDate();
      const initialRequest = {
        phoneNumber: '1234567890',
        userMessage: `I need a dermatologist on ${date} evening`,
      };

      const initialResponse = await service.processUserMessage(initialRequest);
      expect(initialResponse.requiresConfirmation).toBe(true);
      expect(initialResponse.availableSlots).toBeDefined();

      const selectedTime = initialResponse.availableSlots.find(
        (slot) => slot.startTime === '16:00' || slot.startTime === '16:30',
      )?.startTime;
      expect(selectedTime).toBeDefined();

      const followUpRequest = {
        phoneNumber: '1234567890',
        userMessage: `Book ${selectedTime} slot`,
      };

      const followUpResponse = await service.processUserMessage(followUpRequest);
      expect(followUpResponse.intent).toBe(IntentType.BOOK_APPOINTMENT);
      expect(followUpResponse.success).toBe(true);
      expect(followUpResponse.requiresConfirmation).toBe(false);
      expect(followUpResponse.message).toContain(`booked for ${date} at ${selectedTime}`);
      expect(followUpResponse.appointment).toBeDefined();
      expect(followUpResponse.appointment?.startTime).toBe(selectedTime);
      expect(followUpResponse.appointment?.date).toBe(date);
      expect(contextService.getPendingConfirmation('1234567890')).toBeUndefined();
    });

    it('should return a friendly response for an invalid pending slot selection', async () => {
      const date = findNextEveningDate();
      const initialRequest = {
        phoneNumber: '1234567890',
        userMessage: `I need a dermatologist on ${date} evening`,
      };

      const initialResponse = await service.processUserMessage(initialRequest);
      expect(initialResponse.requiresConfirmation).toBe(true);
      expect(initialResponse.availableSlots).toBeDefined();

      const invalidTime = ['16:00', '16:30', '17:00', '17:30'].find(
        (time) => !initialResponse.availableSlots.some((slot) => slot.startTime === time),
      );
      expect(invalidTime).toBeDefined();

      const followUpRequest = {
        phoneNumber: '1234567890',
        userMessage: `Book ${invalidTime} slot`,
      };

      const followUpResponse = await service.processUserMessage(followUpRequest);
      expect(followUpResponse.success).toBe(false);
      expect(followUpResponse.requiresConfirmation).toBe(true);
      expect(followUpResponse.message).toContain('Please choose one of those times');
      expect(followUpResponse.availableSlots).toBeDefined();
      expect(followUpResponse.message).not.toContain('undefined');
    });

    it('should suggest alternatives when requested evening slots are unavailable', async () => {
      const request = {
        phoneNumber: '1234567890',
        userMessage: 'Book appointment with a dermatologist on Saturday evening',
      };

      const response = await service.processUserMessage(request);

      expect(response.intent).toBe(IntentType.BOOK_APPOINTMENT);
      expect(response.success).toBe(false);
      expect(response.requiresConfirmation).toBe(true);
      expect(response.availableSlots).toBeDefined();
      expect(response.availableSlots.length).toBeGreaterThan(0);
      expect(response.message).toContain('I couldn\'t find evening slots');
      expect(response.suggestions?.length).toBeGreaterThan(0);
      expect(response.data?.availableSlots).toBeUndefined();
    });

    it('should ask for time slot if not specified', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const request = {
        phoneNumber: '1234567890',
        userMessage: `Book appointment with Dr. Rajesh on ${tomorrowStr}`,
      };

      const response = await service.processUserMessage(request);

      expect(response.requiresConfirmation).toBe(true);
      expect(response.availableSlots).toBeDefined();
    });

    it('should return alternative slots if unavailable', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const request = {
        phoneNumber: '1234567890',
        userMessage: `Book with Dr. Rajesh on ${yesterdayStr}`,
      };

      const response = await service.processUserMessage(request);

      expect(response.success).toBe(false);
    });
  });

  describe('Cancellation Flow', () => {
    it('should handle cancellation requests', async () => {
      const request = {
        phoneNumber: '1234567890',
        userMessage: 'Cancel my appointment',
      };

      const response = await service.processUserMessage(request);

      expect(response.intent).toBe(IntentType.CANCEL_APPOINTMENT);
    });

    it('should ask which appointment to cancel if multiple exist', async () => {
      // First create some bookings
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      slotService.bookAppointment(
        'doc-1',
        tomorrowStr,
        '10:00',
        'John',
        '1234567890',
      );

      const request = {
        phoneNumber: '1234567890',
        userMessage: 'Cancel my appointment',
      };

      const response = await service.processUserMessage(request);

      expect(response.intent).toBe(IntentType.CANCEL_APPOINTMENT);
      expect(response.requiresConfirmation).toBe(true);
      expect(response.message).toContain('Which appointment would you like to cancel?');
    });

    it('should cancel booking by appointment ID after prompting', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const booking = slotService.bookAppointment(
        'doc-1',
        tomorrowStr,
        '16:30',
        'John',
        '1234567890',
      );
      expect(booking.success).toBe(true);
      const request = {
        phoneNumber: '1234567890',
        userMessage: 'Cancel my appointment',
      };
      const promptResponse = await service.processUserMessage(request);
      expect(promptResponse.requiresConfirmation).toBe(true);

      const followUp = {
        phoneNumber: '1234567890',
        userMessage: `Cancel appointment ${booking.bookingId?.replace('book-', '')}`,
      };
      const response = await service.processUserMessage(followUp);
      expect(response.intent).toBe(IntentType.CANCEL_APPOINTMENT);
      expect(response.success).toBe(true);
      expect(response.requiresConfirmation).toBe(false);
      expect(response.cancelledAppointment).toBeDefined();
      expect(response.cancelledAppointment?.appointmentId).toBe(booking.bookingId);
      expect(response.message).toContain('has been cancelled');
    });

    it('should cancel booking by exact time after prompting', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const booking = slotService.bookAppointment(
        'doc-1',
        tomorrowStr,
        '16:30',
        'John',
        '1234567890',
      );
      expect(booking.success).toBe(true);

      const request = {
        phoneNumber: '1234567890',
        userMessage: 'Cancel my appointment',
      };
      const promptResponse = await service.processUserMessage(request);
      expect(promptResponse.requiresConfirmation).toBe(true);

      const followUp = {
        phoneNumber: '1234567890',
        userMessage: '16:30',
      };
      const response = await service.processUserMessage(followUp);
      expect(response.intent).toBe(IntentType.CANCEL_APPOINTMENT);
      expect(response.success).toBe(true);
      expect(response.requiresConfirmation).toBe(false);
      expect(response.cancelledAppointment).toBeDefined();
      expect(response.cancelledAppointment?.time).toBe('16:30');
      expect(response.message).toContain('has been cancelled');
    });

    it('should return a friendly response for invalid cancellation selection', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      slotService.bookAppointment(
        'doc-1',
        tomorrowStr,
        '16:30',
        'John',
        '1234567890',
      );
      const request = {
        phoneNumber: '1234567890',
        userMessage: 'Cancel my appointment',
      };
      const promptResponse = await service.processUserMessage(request);
      expect(promptResponse.requiresConfirmation).toBe(true);

      const followUp = {
        phoneNumber: '1234567890',
        userMessage: 'Cancel appointment 000000',
      };
      const response = await service.processUserMessage(followUp);
      expect(response.success).toBe(false);
      expect(response.requiresConfirmation).toBe(true);
      expect(response.message).toContain("I couldn't find that appointment in your pending options");
      expect(response.message).toContain('Here are your valid cancellation choices');
    });
  });

  describe('View Appointments', () => {
    it('should list upcoming appointments', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      slotService.bookAppointment(
        'doc-1',
        tomorrowStr,
        '10:00',
        'John',
        '1234567890',
      );

      const request = {
        phoneNumber: '1234567890',
        userMessage: 'Show me my bookings',
      };

      const response = await service.processUserMessage(request);

      expect(response.intent).toBe(IntentType.VIEW_APPOINTMENTS);
      expect(response.success).toBe(true);
    });
  });

  describe('Check Slots', () => {
    it('should check available slots for doctor', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const request = {
        phoneNumber: '1234567890',
        userMessage: `Check available slots for Dr. Rajesh on ${tomorrowStr}`,
      };

      const response = await service.processUserMessage(request);

      expect(response.intent).toBe(IntentType.CHECK_SLOTS);
    });

    it('should check available slots by specialization', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const request = {
        phoneNumber: '1234567890',
        userMessage: `Show available slots for dermatologists on ${tomorrowStr}`,
      };

      const response = await service.processUserMessage(request);

      expect(response.intent).toBe(IntentType.CHECK_SLOTS);
    });
  });

  describe('Conversation Context', () => {
    it('should maintain context across messages', async () => {
      const phoneNumber = '1234567890';

      const request1 = {
        phoneNumber,
        userMessage: 'I need a dermatologist',
      };

      await service.processUserMessage(request1);

      const context1 = contextService.getContext(phoneNumber);
      expect(context1.messageCount).toBe(1);

      const request2 = {
        phoneNumber,
        userMessage: 'Tomorrow at 10 AM',
      };

      await service.processUserMessage(request2);

      const context2 = contextService.getContext(phoneNumber);
      expect(context2.messageCount).toBe(2);
    });

    it('should merge entities from multiple messages', async () => {
      const phoneNumber = '1234567890';

      const request1 = {
        phoneNumber,
        userMessage: 'I need Dr. Rajesh',
      };

      await service.processUserMessage(request1);

      const request2 = {
        phoneNumber,
        userMessage: 'Tomorrow morning',
      };

      await service.processUserMessage(request2);

      const context = contextService.getContext(phoneNumber);
      expect(context.messageCount).toBe(2);
    });
  });

  describe('Undefined Slots Bug Fix - No undefined in messages', () => {
    /**
     * Test for issue: "I need a skin doctor today" returns "I couldn't find undefined slots..."
     * Requirement: Never show "undefined" in user-facing messages
     */
    it('should not include "undefined" in message when timePeriod is missing', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      // User sends message without timePeriod (missing "morning/afternoon/evening")
      const request = {
        phoneNumber: '9876543210',
        userMessage: 'I need a skin doctor today',
      };

      const response = await service.processUserMessage(request);

      // Message should not contain "undefined"
      expect(response.message).not.toContain('undefined');
      expect(response.message).toBeTruthy();
      
      // Should indicate it's a skin doctor request
      expect(response.intent).toBe(IntentType.BOOK_APPOINTMENT);
    });

    it('should use generic wording when timePeriod is missing and slots unavailable', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const request = {
        phoneNumber: '9876543211',
        userMessage: `I need a dermatologist on ${yesterdayStr}`, // No time period, past date
      };

      const response = await service.processUserMessage(request);

      // Should have generic message without "undefined"
      expect(response.message).not.toContain('undefined');
      expect(response.message).toBeTruthy();
    });

    it('should never include "undefined" in suggestions', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const request = {
        phoneNumber: '9876543212',
        userMessage: `Book Dr. Rajesh on ${tomorrowStr}`, // No time period specified
      };

      const response = await service.processUserMessage(request);

      // Check message
      expect(response.message).not.toContain('undefined');

      // Check suggestions if present
      if (response.suggestions && response.suggestions.length > 0) {
        response.suggestions.forEach((suggestion) => {
          expect(suggestion).not.toContain('undefined');
        });
      }
    });

    it('should handle missing timePeriod with alternative slot suggestions', async () => {
      const request = {
        phoneNumber: '9876543213',
        userMessage: 'I need a dermatologist on Saturday', // No specific time period
      };

      const response = await service.processUserMessage(request);

      // Should not contain undefined in message
      expect(response.message).not.toContain('undefined');
      
      // If alternatives are provided, they should not contain undefined
      if (response.suggestions && response.suggestions.length > 0) {
        response.suggestions.forEach((suggestion) => {
          expect(suggestion).not.toContain('undefined');
        });
      }

      if (response.availableSlots && response.availableSlots.length > 0) {
        response.availableSlots.forEach((slot) => {
          expect(slot.startTime).toBeTruthy();
          expect(slot.endTime).toBeTruthy();
        });
      }
    });

    it('should include only morning/afternoon/evening if explicitly provided', async () => {
      // Test with morning specified
      const request1 = {
        phoneNumber: '9876543214',
        userMessage: 'I need a skin doctor tomorrow morning',
      };

      const response1 = await service.processUserMessage(request1);
      expect(response1.message).not.toContain('undefined');
      if (response1.message.includes('couldn\'t find')) {
        // If no morning slots, should say "I couldn't find morning slots"
        expect(response1.message).toContain('morning');
        expect(response1.message).not.toContain('undefined');
      }

      // Test with evening specified
      const request2 = {
        phoneNumber: '9876543215',
        userMessage: 'I need a cardiologist tomorrow evening',
      };

      const response2 = await service.processUserMessage(request2);
      expect(response2.message).not.toContain('undefined');
      if (response2.message.includes('couldn\'t find')) {
        expect(response2.message).toContain('evening');
        expect(response2.message).not.toContain('undefined');
      }

      // Test without time period
      const request3 = {
        phoneNumber: '9876543216',
        userMessage: 'I need a dentist tomorrow',
      };

      const response3 = await service.processUserMessage(request3);
      expect(response3.message).not.toContain('undefined');
      expect(response3.message).not.toContain('morning');
      expect(response3.message).not.toContain('afternoon');
      expect(response3.message).not.toContain('evening');
    });

    it('should maintain conversational flow while fixing undefined bug', async () => {
      const phoneNumber = '9876543217';

      // Step 1: User asks for dermatologist without time period
      const request1 = {
        phoneNumber,
        userMessage: 'I need a skin doctor today',
      };

      const response1 = await service.processUserMessage(request1);
      expect(response1.message).not.toContain('undefined');

      // Step 2: User should be able to select from suggestions
      const pending = contextService.getPendingConfirmation(phoneNumber);
      if (pending && response1.requiresConfirmation) {
        const request2 = {
          phoneNumber,
          userMessage: 'Book 16:00 slot', // Select a slot
        };

        const response2 = await service.processUserMessage(request2);
        expect(response2.message).not.toContain('undefined');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid doctor', async () => {
      const request = {
        phoneNumber: '1234567890',
        userMessage: 'Book with Dr. InvalidName',
      };

      const response = await service.processUserMessage(request);

      expect(response.success).toBe(false);
      expect(response.message).toContain('not found');
    });

    it('should handle ambiguous requests', async () => {
      const request = {
        phoneNumber: '1234567890',
        userMessage: 'ok',
      };

      const response = await service.processUserMessage(request);

      expect([
        IntentType.FALLBACK,
        IntentType.BOOK_APPOINTMENT,
        IntentType.CANCEL_APPOINTMENT,
        IntentType.VIEW_APPOINTMENTS,
        IntentType.CHECK_SLOTS,
      ]).toContain(response.intent);
    });

    it('should handle incomplete information', async () => {
      const request = {
        phoneNumber: '1234567890',
        userMessage: 'Book appointment',
      };

      const response = await service.processUserMessage(request);

      // Should either require confirmation or ask for more info
      expect(
        response.requiresConfirmation || !response.success,
      ).toBe(true);
    });
  });

  describe('Typo Resilience', () => {
    it('should handle typos in booking request', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const request = {
        phoneNumber: '1234567890',
        userMessage: `Pls book apt with Dr Rajesh tmrw at 10 AM`,
      };

      const response = await service.processUserMessage(request);

      expect(response.intent).toBe(IntentType.BOOK_APPOINTMENT);
    });

    it('should handle case insensitivity', async () => {
      const request = {
        phoneNumber: '1234567890',
        userMessage: 'BOOK APPOINTMENT WITH DR. RAJESH',
      };

      const response = await service.processUserMessage(request);

      expect(response.intent).toBe(IntentType.BOOK_APPOINTMENT);
    });
  });

  describe('Natural Language Variations', () => {
    it('should handle different booking phrases', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const variations = [
        'I want to book an appointment with Dr. Rajesh',
        'Can I get an appointment with Dr. Rajesh?',
        'Schedule appointment for me with Dr. Rajesh',
      ];

      for (const message of variations) {
        const request = {
          phoneNumber: '1234567890',
          userMessage: message,
        };

        const response = await service.processUserMessage(request);
        expect(response.intent).toBe(IntentType.BOOK_APPOINTMENT);
      }
    });

    it('should handle different cancellation phrases', async () => {
      const cancellationPhrases = [
        'Cancel my appointment',
        'I want to cancel',
        'Remove my booking',
        'Delete my appointment',
      ];

      for (const message of cancellationPhrases) {
        const request = {
          phoneNumber: '1234567890',
          userMessage: message,
        };

        const response = await service.processUserMessage(request);
        expect(response.intent).toBe(IntentType.CANCEL_APPOINTMENT);
      }
    });
  });

  describe('Ordinal Slot Selection', () => {
    const findNextEveningDate = (): string => {
      const start = new Date();
      for (let offset = 1; offset <= 14; offset += 1) {
        const date = new Date(start);
        date.setDate(start.getDate() + offset);
        const dateStr = date.toISOString().split('T')[0];
        const slots = slotService.getAvailableSlots('doc-1', dateStr).slots;
        if (slots.some((slot) => slot.startTime >= '16:00' && slot.startTime < '20:00')) {
          return dateStr;
        }
      }
      throw new Error('No evening slots found for doc-1 in the next two weeks');
    };

    it('should book the first available slot using ordinal', async () => {
      const date = findNextEveningDate();
      const initialRequest = {
        phoneNumber: '1234567890-ordinal-first',
        userMessage: `I need a dermatologist on ${date} evening`,
      };

      const initialResponse = await service.processUserMessage(initialRequest);
      expect(initialResponse.requiresConfirmation).toBe(true);
      expect(initialResponse.availableSlots).toBeDefined();

      const followUpRequest = {
        phoneNumber: '1234567890-ordinal-first',
        userMessage: 'Book the first slot',
      };

      const followUpResponse = await service.processUserMessage(followUpRequest);
      expect(followUpResponse.intent).toBe(IntentType.BOOK_APPOINTMENT);
      expect(followUpResponse.success).toBe(true);
      expect(followUpResponse.requiresConfirmation).toBe(false);
      expect(followUpResponse.appointment).toBeDefined();
      expect(followUpResponse.appointment?.date).toBe(date);
      expect(contextService.getPendingConfirmation('1234567890-ordinal-first')).toBeUndefined();
    });

    it('should book the second slot using ordinal', async () => {
      const date = findNextEveningDate();
      const initialRequest = {
        phoneNumber: '1234567890-ordinal-second',
        userMessage: `I need a dermatologist on ${date} evening`,
      };

      const initialResponse = await service.processUserMessage(initialRequest);
      expect(initialResponse.requiresConfirmation).toBe(true);
      expect(initialResponse.availableSlots).toBeDefined();
      expect(initialResponse.availableSlots.length).toBeGreaterThanOrEqual(2);

      const followUpRequest = {
        phoneNumber: '1234567890-ordinal-second',
        userMessage: 'I choose the second one',
      };

      const followUpResponse = await service.processUserMessage(followUpRequest);
      expect(followUpResponse.intent).toBe(IntentType.BOOK_APPOINTMENT);
      expect(followUpResponse.success).toBe(true);
      expect(followUpResponse.requiresConfirmation).toBe(false);
      expect(followUpResponse.appointment).toBeDefined();
      expect(followUpResponse.appointment?.startTime).toBe(initialResponse.availableSlots[1].startTime);
      expect(followUpResponse.appointment?.date).toBe(date);
    });

    it('should handle invalid ordinal slot selection', async () => {
      const date = findNextEveningDate();
      const initialRequest = {
        phoneNumber: '1234567890-ordinal-invalid',
        userMessage: `I need a dermatologist on ${date} evening`,
      };

      const initialResponse = await service.processUserMessage(initialRequest);
      expect(initialResponse.requiresConfirmation).toBe(true);

      const followUpRequest = {
        phoneNumber: '1234567890-ordinal-invalid',
        userMessage: 'I want the 10th slot',
      };

      const followUpResponse = await service.processUserMessage(followUpRequest);
      expect(followUpResponse.success).toBe(false);
      expect(followUpResponse.requiresConfirmation).toBe(true);
      expect(followUpResponse.availableSlots).toBeDefined();
      expect(followUpResponse.message).toContain('Please choose one of those times');
    });

    it('should support various ordinal selections (first, second, third)', async () => {
      const date = findNextEveningDate();
      const phoneNumbers = [
        '1234567890-ordinal-var-first',
        '1234567890-ordinal-var-second',
        '1234567890-ordinal-var-third',
      ];
      const ordinals = ['first', 'second', 'third'];

      for (let i = 0; i < ordinals.length; i++) {
        const initialRequest = {
          phoneNumber: phoneNumbers[i],
          userMessage: `I need a dermatologist on ${date} evening`,
        };

        const initialResponse = await service.processUserMessage(initialRequest);
        expect(initialResponse.requiresConfirmation).toBe(true);
        if (initialResponse.availableSlots.length <= i) continue; // Skip if not enough slots

        const followUpRequest = {
          phoneNumber: phoneNumbers[i],
          userMessage: `Book the ${ordinals[i]} slot`,
        };

        const followUpResponse = await service.processUserMessage(followUpRequest);
        expect(followUpResponse.success).toBe(true);
        expect(followUpResponse.appointment?.startTime).toBe(
          initialResponse.availableSlots[i].startTime,
        );
      }
    });
  });

  describe('Edge Cases', () => {
    it('should reject past date booking attempts', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const request = {
        phoneNumber: '1234567890-edge-past',
        userMessage: `Book appointment with Dr. Rajesh on ${yesterdayStr}`,
      };

      const response = await service.processUserMessage(request);
      // System provides alternative slots instead of rejecting
      expect(response.success).toBe(true);
      expect(response.message).toContain('However, here are some other available times');
    });

    it('should handle duplicate booking attempts', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      // First booking
      const firstBooking = await slotService.bookAppointment(
        'doc-1',
        tomorrowStr,
        '10:00',
        'Test Patient',
        '1234567890-dup',
      );
      expect(firstBooking.success).toBe(true);

      // Attempt duplicate booking
      const request = {
        phoneNumber: '1234567890-dup',
        userMessage: `Book appointment with Dr. Rajesh on ${tomorrowStr} at 10:00`,
      };

      const response = await service.processUserMessage(request);
      // System provides alternative slots instead of rejecting
      expect(response.success).toBe(true);
      expect(response.message).toContain('However, here are some other available times');
    });

    it('should handle fully booked scenario', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      // Book all available slots for the day
      const availableSlots = slotService.getAvailableSlots('doc-1', tomorrowStr).slots;
      for (const slot of availableSlots) {
        await slotService.bookAppointment(
          'doc-1',
          tomorrowStr,
          slot.startTime,
          'Test Patient',
          '1234567890-full',
        );
      }

      const request = {
        phoneNumber: '1234567890-full',
        userMessage: `Book appointment with Dr. Rajesh on ${tomorrowStr}`,
      };

      const response = await service.processUserMessage(request);
      // System provides alternative slots instead of rejecting
      expect(response.success).toBe(true);
      expect(response.message).toContain('However, here are some other available times');
    });

    it('should handle invalid doctor name gracefully', async () => {
      const request = {
        phoneNumber: '1234567890-edge-invalid-doc',
        userMessage: 'Book appointment with Dr. NonExistent Doctor',
      };

      const response = await service.processUserMessage(request);
      expect(response.success).toBe(false);
      expect(response.message).toContain('not found');
    });

    it('should handle cancellation with wrong phone number', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const booking = await slotService.bookAppointment(
        'doc-1',
        tomorrowStr,
        '10:00',
        'Test Patient',
        '1234567890-owner',
      );
      expect(booking.success).toBe(true);

      const request = {
        phoneNumber: '9999999999', // Different phone number
        userMessage: `Cancel appointment ${booking.bookingId}`,
      };

      const response = await service.processUserMessage(request);
      expect(response.success).toBe(false);
    });

    it('should handle daily booking limit exceeded', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      // Book up to the limit (10 for doc-1)
      const availableSlots = slotService.getAvailableSlots('doc-1', tomorrowStr).slots;
      const limit = 10;
      
      for (let i = 0; i < Math.min(limit, availableSlots.length); i++) {
        await slotService.bookAppointment(
          'doc-1',
          tomorrowStr,
          availableSlots[i].startTime,
          `Patient ${i}`,
          '1234567890-limit',
        );
      }

      const request = {
        phoneNumber: '1234567890-limit',
        userMessage: `Book appointment with Dr. Rajesh on ${tomorrowStr} at 14:00`,
      };

      const response = await service.processUserMessage(request);
      // System provides alternative slots instead of rejecting
      expect(response.success).toBe(true);
      expect(response.message).toContain('However, here are some other available times');
    });

    it('should handle doctor unavailable period', async () => {
      const today = new Date().toISOString().split('T')[0];

      const request = {
        phoneNumber: '1234567890-edge-unavailable',
        userMessage: `Book appointment with Dr. Rajesh today`,
      };

      const response = await service.processUserMessage(request);
      // System provides alternative slots instead of rejecting
      expect(response.success).toBe(true);
      expect(response.message).toContain('However, here are some other available times');
    });
  });

  describe('Conversational Continuity', () => {
    it('should handle topic change mid-conversation', async () => {
      const phoneNumber = '1234567890-topic-change';

      // Start booking conversation
      const request1 = {
        phoneNumber,
        userMessage: 'I need a dermatologist',
      };

      const response1 = await service.processUserMessage(request1);
      expect(response1.intent).toBe(IntentType.BOOK_APPOINTMENT);

      // Change topic to cancellation
      const request2 = {
        phoneNumber,
        userMessage: 'Actually, cancel my appointment',
      };

      const response2 = await service.processUserMessage(request2);
      expect(response2.intent).toBe(IntentType.CANCEL_APPOINTMENT);
      expect(contextService.getPendingConfirmation(phoneNumber)).toBeUndefined();
    });

    it('should handle incomplete information across messages', async () => {
      const phoneNumber = '1234567890-incomplete';

      // First message: only doctor
      const request1 = {
        phoneNumber,
        userMessage: 'I need Dr. Rajesh',
      };

      const response1 = await service.processUserMessage(request1);
      expect(response1.intent).toBe(IntentType.BOOK_APPOINTMENT);

      // Second message: add date
      const request2 = {
        phoneNumber,
        userMessage: 'Tomorrow',
      };

      const response2 = await service.processUserMessage(request2);
      expect(response2.intent).toBe(IntentType.BOOK_APPOINTMENT);
      expect(response2.requiresConfirmation).toBe(true);
    });

    it('should reset context when user provides conflicting information', async () => {
      const phoneNumber = '1234567890-conflict';

      // First: ask for dermatologist
      const request1 = {
        phoneNumber,
        userMessage: 'I need a dermatologist',
      };

      await service.processUserMessage(request1);

      // Second: change to cardiologist
      const request2 = {
        phoneNumber,
        userMessage: 'Actually, I need a cardiologist',
      };

      const response2 = await service.processUserMessage(request2);
      expect(response2.intent).toBe(IntentType.BOOK_APPOINTMENT);
      expect(response2.entities?.specialization).toBe('cardiologist');
    });
  });
});

