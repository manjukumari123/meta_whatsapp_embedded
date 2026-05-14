import { Injectable, Logger } from '@nestjs/common';
import {
  DoctorSchedule,
  Slot,
  BookingRecord,
} from '../entities/slot.entity';
import { MOCK_DOCTORS, MOCK_BOOKINGS } from '../data/mock-doctors';

@Injectable()
export class SlotManagementService {
  private readonly logger = new Logger(SlotManagementService.name);
  private doctors: DoctorSchedule[] = MOCK_DOCTORS.map((doctor) => ({
    ...doctor,
    availableTimings: doctor.availableTimings.map((timing) => ({
      ...timing,
      daysOfWeek: [...timing.daysOfWeek],
    })),
    unavailablePeriods: doctor.unavailablePeriods.map((period) => ({ ...period })),
  }));
  private bookings: BookingRecord[] = MOCK_BOOKINGS.map((booking) => ({
    ...booking,
  }));

  /**
   * Check available slots for a doctor on a specific date
   */
  getAvailableSlots(
    doctorId: string,
    date: string,
  ): { slots: Slot[]; reason?: string } {
    this.logger.log(
      `Checking available slots | doctorId: ${doctorId} | date: ${date}`,
    );

    // Validate date is not in the past
    const slotDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (slotDate < today) {
      this.logger.warn(
        `Attempted to book past date | date: ${date} | today: ${today.toISOString().split('T')[0]}`,
      );
      return { slots: [], reason: 'Past date bookings not allowed' };
    }

    const doctor = this.doctors.find((d) => d.doctorId === doctorId);
    if (!doctor) {
      this.logger.warn(`Doctor not found | doctorId: ${doctorId}`);
      return { slots: [], reason: 'Doctor not found' };
    }

    // Check if date is unavailable
    const unavailable = doctor.unavailablePeriods.find(
      (period) => period.date === date,
    );
    if (unavailable) {
      this.logger.log(
        `Doctor unavailable on date | doctorId: ${doctorId} | date: ${date} | reason: ${unavailable.reason}`,
      );
      return {
        slots: [],
        reason: `Doctor unavailable on ${date}: ${unavailable.reason || 'No reason provided'}`,
      };
    }

    const dayOfWeek = new Date(date).getDay();
    const dayTimings = doctor.availableTimings.filter((t) =>
      t.daysOfWeek.includes(dayOfWeek),
    );

    if (dayTimings.length === 0) {
      this.logger.log(
        `No timings available for day | doctorId: ${doctorId} | date: ${date} | dayOfWeek: ${dayOfWeek}`,
      );
      return {
        slots: [],
        reason: `Doctor not available on ${new Date(date).toLocaleDateString()}`,
      };
    }

    const slots: Slot[] = [];

    for (const timing of dayTimings) {
      const start = this.timeStringToMinutes(timing.startTime);
      const end = this.timeStringToMinutes(timing.endTime);
      const slotDuration = doctor.slotDuration;

      for (let time = start; time + slotDuration <= end; time += slotDuration) {
        const slotStart = this.minutesToTimeString(time);
        const slotEnd = this.minutesToTimeString(time + slotDuration);

        const isBooked = this.bookings.some(
          (b) =>
            b.doctorId === doctorId &&
            b.date === date &&
            b.status === 'CONFIRMED' &&
            b.startTime === slotStart,
        );

        if (!isBooked) {
          slots.push({
            slotId: `${doctorId}-${date}-${slotStart}`,
            doctorId,
            date,
            startTime: slotStart,
            endTime: slotEnd,
            isAvailable: true,
          });
        }
      }
    }

    this.logger.log(
      `Found available slots | doctorId: ${doctorId} | date: ${date} | count: ${slots.length}`,
    );

    return { slots };
  }

  /**
   * Get available slots for a specialization
   */
  getAvailableSlotsBySpecialization(
    specialization: string,
    date: string,
  ): { slots: Slot[]; doctorId: string; doctorName: string }[] {
    this.logger.log(
      `Checking available slots by specialization | specialization: ${specialization} | date: ${date}`,
    );

    const doctorsWithSpec = this.doctors.filter((d) =>
      d.specialization.toLowerCase().includes(specialization.toLowerCase()),
    );

    if (doctorsWithSpec.length === 0) {
      this.logger.warn(`No doctors found for specialization | specialization: ${specialization}`);
      return [];
    }

    const results = doctorsWithSpec
      .map((doc) => {
        const slotData = this.getAvailableSlots(doc.doctorId, date);
        return {
          slots: slotData.slots,
          doctorId: doc.doctorId,
          doctorName: doc.name,
        };
      })
      .filter((result) => result.slots.length > 0);

    this.logger.log(
      `Found doctors with available slots | specialization: ${specialization} | count: ${results.length}`,
    );

    return results;
  }

  /**
   * Book an appointment
   */
  bookAppointment(
    doctorId: string,
    date: string,
    time: string,
    patientName: string,
    patientPhone: string,
  ): { success: boolean; bookingId?: string; message: string } {
    this.logger.log(
      `Booking appointment | doctorId: ${doctorId} | date: ${date} | time: ${time} | patient: ${patientName}`,
    );

    // Validate doctor exists
    const doctor = this.doctors.find((d) => d.doctorId === doctorId);
    if (!doctor) {
      this.logger.warn(`Doctor not found | doctorId: ${doctorId}`);
      return { success: false, message: 'Doctor not found' };
    }

    // Check if date is in the past
    const slotDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (slotDate < today) {
      this.logger.warn(
        `Attempted to book past date | date: ${date} | today: ${today.toISOString().split('T')[0]}`,
      );
      return { success: false, message: 'Cannot book appointments in the past' };
    }

    // Check for duplicate booking
    const duplicate = this.bookings.find(
      (b) =>
        b.doctorId === doctorId &&
        b.date === date &&
        b.startTime === time &&
        b.status === 'CONFIRMED',
    );

    if (duplicate) {
      this.logger.warn(
        `Slot already booked | doctorId: ${doctorId} | date: ${date} | time: ${time}`,
      );
      return { success: false, message: 'This slot is already booked' };
    }

    // Check if slot is available
    const available = this.getAvailableSlots(doctorId, date);
    const slot = available.slots.find((s) => s.startTime === time);

    if (!slot) {
      this.logger.warn(
        `Slot not available | doctorId: ${doctorId} | date: ${date} | time: ${time}`,
      );
      return { success: false, message: 'This slot is not available' };
    }

    // Check daily booking limit
    const bookingsToday = this.bookings.filter(
      (b) =>
        b.doctorId === doctorId &&
        b.date === date &&
        b.status === 'CONFIRMED',
    ).length;

    if (bookingsToday >= doctor.dailyBookingLimit) {
      this.logger.warn(
        `Daily booking limit reached | doctorId: ${doctorId} | date: ${date} | limit: ${doctor.dailyBookingLimit}`,
      );
      return {
        success: false,
        message: `Doctor has reached maximum bookings for ${date}`,
      };
    }

    // Create booking
    const bookingId = `book-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const endTime = this.minutesToTimeString(
      this.timeStringToMinutes(time) + doctor.slotDuration,
    );

    const booking: BookingRecord = {
      bookingId,
      doctorId,
      doctorName: doctor.name,
      specialization: doctor.specialization,
      patientName,
      patientPhone,
      date,
      startTime: time,
      endTime,
      status: 'CONFIRMED',
      createdAt: new Date(),
    };

    this.bookings.push(booking);
    this.logger.log(
      `Appointment booked successfully | bookingId: ${bookingId} | doctor: ${doctor.name} | date: ${date} | time: ${time}`,
    );

    return {
      success: true,
      bookingId,
      message: `Appointment confirmed with ${doctor.name} on ${date} at ${time}`,
    };
  }

  /**
   * Cancel an appointment
   */
  cancelAppointment(
    bookingId: string,
    patientPhone: string,
  ): { success: boolean; message: string } {
    this.logger.log(
      `Cancelling appointment | bookingId: ${bookingId} | patient: ${patientPhone}`,
    );

    const booking = this.bookings.find((b) => b.bookingId === bookingId);

    if (!booking) {
      this.logger.warn(`Booking not found | bookingId: ${bookingId}`);
      return { success: false, message: 'Booking not found' };
    }

    if (booking.patientPhone !== patientPhone) {
      this.logger.warn(
        `Unauthorized cancellation attempt | bookingId: ${bookingId} | authorizedPhone: ${booking.patientPhone} | attemptedPhone: ${patientPhone}`,
      );
      return { success: false, message: 'Unauthorized: Phone number does not match' };
    }

    if (booking.status === 'CANCELLED') {
      this.logger.warn(`Appointment already cancelled | bookingId: ${bookingId}`);
      return {
        success: false,
        message: 'Appointment is already cancelled',
      };
    }

    booking.status = 'CANCELLED';
    booking.cancelledAt = new Date();

    this.logger.log(
      `Appointment cancelled successfully | bookingId: ${bookingId} | doctor: ${booking.doctorName}`,
    );

    return {
      success: true,
      message: `Appointment with ${booking.doctorName} on ${booking.date} at ${booking.startTime} has been cancelled`,
    };
  }

  /**
   * Get all bookings for a patient
   */
  getPatientBookings(
    patientPhone: string,
  ): { upcomingBookings: BookingRecord[]; pastBookings: BookingRecord[] } {
    this.logger.log(`Fetching bookings | patientPhone: ${patientPhone}`);

    const today = new Date().toISOString().split('T')[0];
    const patientBookings = this.bookings.filter((b) => b.patientPhone === patientPhone);

    const upcomingBookings = patientBookings.filter(
      (b) => b.date >= today && b.status === 'CONFIRMED',
    );
    const pastBookings = patientBookings.filter(
      (b) => b.date < today || b.status === 'CANCELLED',
    );

    this.logger.log(
      `Found bookings | patientPhone: ${patientPhone} | upcoming: ${upcomingBookings.length} | past: ${pastBookings.length}`,
    );

    return { upcomingBookings, pastBookings };
  }

  /**
   * Get doctor by name (fuzzy match)
   */
  findDoctorByName(name: string): DoctorSchedule | undefined {
    const normalizedSearch = name.toLowerCase().trim();
    return this.doctors.find(
      (d) =>
        d.name.toLowerCase().includes(normalizedSearch) ||
        normalizedSearch.includes(d.name.toLowerCase()),
    );
  }

  /**
   * Normalize specialization text for fuzzy matching
   */
  private normalizeSpecialization(specialization: string): string {
    return specialization
      .toLowerCase()
      .trim()
      .replace(/[^a-z]/g, '')
      .replace(/(ologist|ology|ologist|ian|ist|ic|al)$/, '');
  }

  /**
   * Get doctor by specialization
   */
  findDoctorsBySpecialization(specialization: string): DoctorSchedule[] {
    const normalized = this.normalizeSpecialization(specialization);
    return this.doctors.filter((d) => {
      const doctorSpec = this.normalizeSpecialization(d.specialization);
      return (
        doctorSpec.includes(normalized) ||
        normalized.includes(doctorSpec) ||
        d.specialization.toLowerCase().includes(normalized) ||
        normalized.includes(d.specialization.toLowerCase())
      );
    });
  }

  /**
   * Suggest alternative slots if requested slot is unavailable
   */
  suggestAlternativeSlots(
    doctorId: string,
    date: string,
    count: number = 3,
  ): Slot[] {
    this.logger.log(
      `Suggesting alternative slots | doctorId: ${doctorId} | date: ${date}`,
    );

    // Try next 5 days
    const suggestions: Slot[] = [];
    const currentDate = new Date(date);

    for (let i = 1; i <= 5 && suggestions.length < count; i++) {
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + i);
      const dateStr = nextDate.toISOString().split('T')[0];

      const available = this.getAvailableSlots(doctorId, dateStr);
      if (available.slots.length > 0) {
        suggestions.push(available.slots[0]);
      }
    }

    this.logger.log(
      `Found alternative slots | doctorId: ${doctorId} | count: ${suggestions.length}`,
    );

    return suggestions;
  }

  /**
   * Helper: Convert time string (HH:MM) to minutes
   */
  private timeStringToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Helper: Convert minutes to time string (HH:MM)
   */
  private minutesToTimeString(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }
}
