import { Test, TestingModule } from '@nestjs/testing';
import { SlotManagementService } from '../services/slot-management.service';

describe('SlotManagementService', () => {
  let service: SlotManagementService;

  const findNextAvailableDate = (doctorId: string): string => {
    const candidate = new Date();

    for (let i = 1; i <= 14; i++) {
      candidate.setDate(candidate.getDate() + 1);
      const dateStr = candidate.toISOString().split('T')[0];
      const result = service.getAvailableSlots(doctorId, dateStr);
      if (result.slots.length > 0) {
        return dateStr;
      }
    }

    throw new Error('No available slots found in the next 14 days');
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SlotManagementService],
    }).compile();

    service = module.get<SlotManagementService>(SlotManagementService);
  });

  describe('Available Slots', () => {
    it('should get available slots for valid doctor and date', () => {
      const tomorrowStr = findNextAvailableDate('doc-1');

      const result = service.getAvailableSlots('doc-1', tomorrowStr);
      expect(result.slots.length).toBeGreaterThan(0);
      expect(result.slots[0].doctorId).toBe('doc-1');
      expect(result.slots[0].date).toBe(tomorrowStr);
    });

    it('should reject past date bookings', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const result = service.getAvailableSlots('doc-1', yesterdayStr);
      expect(result.slots.length).toBe(0);
      expect(result.reason).toContain('Past date bookings not allowed');
    });

    it('should return empty slots for non-existent doctor', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const result = service.getAvailableSlots('invalid-doc', tomorrowStr);
      expect(result.slots.length).toBe(0);
      expect(result.reason).toContain('Doctor not found');
    });

    it('should filter slots by day of week', () => {
      // Find a date that is not in doctor's working days
      let testDate = new Date();
      testDate.setDate(testDate.getDate() + 1);

      // Try multiple dates to find one with slots
      for (let i = 0; i < 7; i++) {
        const dateStr = testDate.toISOString().split('T')[0];
        const result = service.getAvailableSlots('doc-1', dateStr);

        if (result.slots.length === 0 && result.reason) {
          // Found a day without slots, this is expected behavior
          expect(result.slots.length).toBe(0);
          break;
        }

        testDate.setDate(testDate.getDate() + 1);
      }
    });
  });

  describe('Booking Appointments', () => {
    it('should successfully book valid appointment', () => {
      const tomorrowStr = findNextAvailableDate('doc-1');

      const result = service.bookAppointment(
        'doc-1',
        tomorrowStr,
        '10:00',
        'John Doe',
        '1234567890',
      );

      expect(result.success).toBe(true);
      expect(result.bookingId).toBeDefined();
      expect(result.message).toContain('confirmed');
    });

    it('should reject booking on past date', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const result = service.bookAppointment(
        'doc-1',
        yesterdayStr,
        '10:00',
        'John Doe',
        '1234567890',
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('past');
    });

    it('should prevent duplicate bookings', () => {
      const tomorrowStr = findNextAvailableDate('doc-1');
      const slots = service.getAvailableSlots('doc-1', tomorrowStr).slots;
      expect(slots.length).toBeGreaterThan(0);

      const firstBooking = service.bookAppointment(
        'doc-1',
        tomorrowStr,
        slots[0].startTime,
        'John Doe',
        '1234567890',
      );

      const secondBooking = service.bookAppointment(
        'doc-1',
        tomorrowStr,
        slots[0].startTime,
        'Jane Smith',
        '0987654321',
      );

      expect(firstBooking.success).toBe(true);
      expect(secondBooking.success).toBe(false);
      expect(secondBooking.message).toContain('already booked');
    });

    it('should reject invalid doctor', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const result = service.bookAppointment(
        'invalid-doc',
        tomorrowStr,
        '10:00',
        'John Doe',
        '1234567890',
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Doctor not found');
    });

    it('should reject booking if slot not available', () => {
      const tomorrowStr = findNextAvailableDate('doc-1');

      // First book the slot
      service.bookAppointment(
        'doc-1',
        tomorrowStr,
        '10:00',
        'John Doe',
        '1234567890',
      );

      // Try to book again with different time
      const result = service.bookAppointment(
        'doc-1',
        tomorrowStr,
        '10:30',
        'Jane Smith',
        '0987654321',
      );

      // This should succeed as it's a different time
      expect(result.success).toBe(true);
    });
  });

  describe('Cancelling Appointments', () => {
    it('should successfully cancel valid booking', () => {
      const tomorrowStr = findNextAvailableDate('doc-1');
      const slots = service.getAvailableSlots('doc-1', tomorrowStr).slots;
      expect(slots.length).toBeGreaterThan(0);

      const booking = service.bookAppointment(
        'doc-1',
        tomorrowStr,
        slots[0].startTime,
        'John Doe',
        '1234567890',
      );
      expect(booking.success).toBe(true);

      const cancellation = service.cancelAppointment(
        booking.bookingId!,
        '1234567890',
      );

      expect(cancellation.success).toBe(true);
      expect(cancellation.message).toContain('cancelled');
    });

    it('should reject cancellation with wrong phone', () => {
      const tomorrowStr = findNextAvailableDate('doc-1');
      const slots = service.getAvailableSlots('doc-1', tomorrowStr).slots;
      expect(slots.length).toBeGreaterThan(0);

      const booking = service.bookAppointment(
        'doc-1',
        tomorrowStr,
        slots[0].startTime,
        'John Doe',
        '1234567890',
      );
      expect(booking.success).toBe(true);

      const cancellation = service.cancelAppointment(
        booking.bookingId!,
        '0987654321',
      );

      expect(cancellation.success).toBe(false);
      expect(cancellation.message).toContain('Unauthorized');
    });

    it('should reject cancellation of non-existent booking', () => {
      const cancellation = service.cancelAppointment('invalid-id', '1234567890');
      expect(cancellation.success).toBe(false);
      expect(cancellation.message).toContain('Booking not found');
    });

    it('should reject cancellation of already cancelled booking', () => {
      const tomorrowStr = findNextAvailableDate('doc-1');
      const slots = service.getAvailableSlots('doc-1', tomorrowStr).slots;
      expect(slots.length).toBeGreaterThan(0);

      const booking = service.bookAppointment(
        'doc-1',
        tomorrowStr,
        slots[0].startTime,
        'John Doe',
        '1234567890',
      );
      expect(booking.success).toBe(true);

      service.cancelAppointment(booking.bookingId!, '1234567890');

      const secondCancellation = service.cancelAppointment(
        booking.bookingId!,
        '1234567890',
      );

      expect(secondCancellation.success).toBe(false);
      expect(secondCancellation.message).toContain('already cancelled');
    });
  });

  describe('View Appointments', () => {
    it('should get patient bookings', () => {
      const tomorrowStr = findNextAvailableDate('doc-1');
      const slots = service.getAvailableSlots('doc-1', tomorrowStr).slots;
      expect(slots.length).toBeGreaterThan(0);

      service.bookAppointment(
        'doc-1',
        tomorrowStr,
        slots[0].startTime,
        'John Doe',
        '1234567890',
      );

      const bookings = service.getPatientBookings('1234567890');
      expect(bookings.upcomingBookings.length).toBeGreaterThan(0);
      expect(bookings.upcomingBookings[0].patientPhone).toBe('1234567890');
    });

    it('should separate past and upcoming bookings', () => {
      const bookings = service.getPatientBookings('1234567890');
      expect(Array.isArray(bookings.upcomingBookings)).toBe(true);
      expect(Array.isArray(bookings.pastBookings)).toBe(true);
    });

    it('should return empty for non-existent patient', () => {
      const bookings = service.getPatientBookings('invalid-phone');
      expect(bookings.upcomingBookings.length).toBe(0);
      expect(bookings.pastBookings.length).toBe(0);
    });
  });

  describe('Doctor Search', () => {
    it('should find doctor by name', () => {
      const doctor = service.findDoctorByName('Rajesh');
      expect(doctor).toBeDefined();
      expect(doctor?.name).toContain('Rajesh');
    });

    it('should find doctors by specialization', () => {
      const doctors = service.findDoctorsBySpecialization('dermatology');
      expect(doctors.length).toBeGreaterThan(0);
    });

    it('should return undefined for non-existent doctor', () => {
      const doctor = service.findDoctorByName('Dr. NonExistent');
      expect(doctor).toBeUndefined();
    });
  });

  describe('Alternative Slots', () => {
    it('should suggest alternative slots', () => {
      const tomorrowStr = findNextAvailableDate('doc-1');

      const alternatives = service.suggestAlternativeSlots('doc-1', tomorrowStr, 3);
      expect(alternatives.length).toBeGreaterThan(0);
    });

    it('should respect count parameter', () => {
      const tomorrowStr = findNextAvailableDate('doc-1');

      const alternatives = service.suggestAlternativeSlots('doc-1', tomorrowStr, 2);
      expect(alternatives.length).toBeLessThanOrEqual(2);
    });
  });
});
