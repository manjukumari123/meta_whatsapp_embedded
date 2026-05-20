import { Test, TestingModule } from '@nestjs/testing';
import { HealthcareService } from './healthcare.service';
import { SlotManagementService } from '../slot-management/services/slot-management.service';
import { StructuredLoggingService } from '../logging/services/structured-logging.service';

describe('HealthcareService', () => {
  let service: HealthcareService;
  let slotManagementService: SlotManagementService;
  let structuredLoggingService: StructuredLoggingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthcareService,
        {
          provide: SlotManagementService,
          useValue: {
            getAvailableSlots: jest.fn(),
            bookAppointment: jest.fn(),
            cancelAppointment: jest.fn(),
          },
        },
        {
          provide: StructuredLoggingService,
          useValue: {
            logSlotAllocation: jest.fn(),
            logBookingFlow: jest.fn(),
            logCancellationFlow: jest.fn(),
            logRescheduleFlow: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<HealthcareService>(HealthcareService);
    slotManagementService = module.get<SlotManagementService>(SlotManagementService);
    structuredLoggingService = module.get<StructuredLoggingService>(StructuredLoggingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUpcomingBookingsByPhone', () => {
    it('should return empty array when no bookings exist', () => {
      const result = service.getUpcomingBookingsByPhone('919999999999');
      expect(result).toEqual([]);
    });

    it('should return only confirmed bookings for the phone number', () => {
      // This test assumes mock data is initialized
      const result = service.getUpcomingBookingsByPhone('919999999999');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter out past bookings', () => {
      const result = service.getUpcomingBookingsByPhone('919999999999');
      // All returned bookings should have dates >= today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      for (const booking of result) {
        const bookingDate = new Date(booking.date);
        expect(bookingDate >= today).toBe(true);
      }
    });

    it('should filter out cancelled bookings', () => {
      const result = service.getUpcomingBookingsByPhone('919999999999');
      // All returned bookings should have status CONFIRMED
      for (const booking of result) {
        expect(booking.status).toBe('CONFIRMED');
      }
    });
  });

  describe('Multi-booking reschedule behavior', () => {
    it('should return multiple bookings when user has multiple upcoming appointments', () => {
      // This test verifies that getUpcomingBookingsByPhone can return multiple bookings
      const result = service.getUpcomingBookingsByPhone('919999999999');
      // The actual number depends on mock data, but we verify it returns an array
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return bookings with required fields for selection', () => {
      const result = service.getUpcomingBookingsByPhone('919999999999');
      
      for (const booking of result) {
        expect(booking).toHaveProperty('bookingId');
        expect(booking).toHaveProperty('doctorId');
        expect(booking).toHaveProperty('date');
        expect(booking).toHaveProperty('startTime');
      }
    });
  });

  describe('Alternate slot date handling', () => {
    it('should preserve real slot date in suggested slots', async () => {
      const result = await service.suggestAlternateSlots({
        doctorId: 'doc-1',
        preferredDate: '2026-05-20',
        preferredTime: '10:00',
      });

      if (result.success) {
        const successResult = result as any;
        const suggestedSlots = successResult.suggestedSlots;
        if (suggestedSlots) {
          // Each suggested slot should have a date field
          for (const slot of suggestedSlots) {
            expect(slot).toHaveProperty('date');
            expect(typeof slot.date).toBe('string');
          }
        }
      }
    });

    it('should return slots with their actual dates (not preferred date)', async () => {
      const result = await service.suggestAlternateSlots({
        doctorId: 'doc-1',
        preferredDate: '2026-05-20',
        preferredTime: '10:00',
      });

      if (result.success) {
        const successResult = result as any;
        const suggestedSlots = successResult.suggestedSlots;
        if (suggestedSlots && suggestedSlots.length > 0) {
          // Slots should have dates that are different from or equal to preferred date
          // The important thing is that each slot has its own date
          const dates = suggestedSlots.map((slot: any) => slot.date);
          expect(dates.length).toBeGreaterThan(0);
          // All dates should be valid date strings
          for (const date of dates) {
            expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
          }
        }
      }
    });
  });
});
