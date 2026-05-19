import { Injectable, Logger } from '@nestjs/common';
import { SlotManagementService } from 'src/slot-management/services/slot-management.service';
import { DoctorSchedule, BookingRecord } from 'src/slot-management/entities/slot.entity';
import { BookAppointmentDto } from './dto/book-appointment.dto';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { CheckAvailabilityDto } from './dto/check-availability.dto';
import { SuggestSlotsDto } from './dto/suggest-slots.dto';
import {
  HealthcareSuccessResponse,
  HealthcareErrorResponse,
  BookingResponse,
  DoctorAvailabilityResponse,
  SlotResponse,
} from './dto/healthcare-response.dto';
import { StructuredLoggingService } from '../logging/services/structured-logging.service';

@Injectable()
export class HealthcareService {
  private readonly logger = new Logger(HealthcareService.name);
  private doctors: DoctorSchedule[] = [];
  private bookings: BookingRecord[] = [];

  constructor(
    private readonly slotManagementService: SlotManagementService,
    private readonly structuredLogger: StructuredLoggingService,
  ) {
    this.initializeMockData();
  }

  private initializeMockData() {
    // Initialize with mock data from SlotManagementService
    this.doctors = this.slotManagementService['doctors'] || [];
    this.bookings = this.slotManagementService['bookings'] || [];
  }

  /**
   * Helper method to get doctor by ID (not available in SlotManagementService)
   */
  private getDoctorById(doctorId: string): DoctorSchedule | undefined {
    return this.doctors.find((d) => d.doctorId === doctorId);
  }

  /**
   * Helper method to find doctor by specialization with aliases and case-insensitive matching
   */
  private findDoctorBySpecialization(specialization: string): DoctorSchedule | undefined {
    const normalizedSpec = specialization.toLowerCase().trim();

    // Define aliases
    const aliases: Record<string, string[]> = {
      'dermatologist': ['skin specialist', 'skin doctor', 'dermatology'],
      'skin specialist': ['dermatologist', 'skin doctor', 'dermatology'],
      'physician': ['general doctor', 'general practitioner', 'gp', 'family doctor', 'internist'],
      'general doctor': ['physician', 'general practitioner', 'gp', 'family doctor', 'internist'],
      'cardiologist': ['heart doctor', 'heart specialist', 'cardiology'],
      'dentist': ['dental surgeon', 'dental specialist', 'dental'],
    };

    // Check if the specialization matches any doctor directly (case-insensitive)
    const directMatch = this.doctors.find((d) =>
      d.specialization.toLowerCase() === normalizedSpec,
    );
    if (directMatch) return directMatch;

    // Check if the specialization is an alias for another specialization
    for (const [canonical, aliasList] of Object.entries(aliases)) {
      if (aliasList.includes(normalizedSpec)) {
        const match = this.doctors.find((d) =>
          d.specialization.toLowerCase() === canonical.toLowerCase(),
        );
        if (match) return match;
      }
    }

    // Check if any doctor's specialization is an alias for the requested specialization
    for (const doctor of this.doctors) {
      const doctorSpec = doctor.specialization.toLowerCase();
      if (aliases[doctorSpec]?.includes(normalizedSpec)) {
        return doctor;
      }
    }

    return undefined;
  }

  /**
   * Resolve doctor from either doctorId or specialization
   */
  private resolveDoctor(doctorId?: string, specialization?: string): DoctorSchedule | undefined {
    if (doctorId) {
      return this.getDoctorById(doctorId);
    }
    if (specialization) {
      return this.findDoctorBySpecialization(specialization);
    }
    return undefined;
  }

  /**
   * Helper method to get booking by ID (not available in SlotManagementService)
   */
  private getBookingById(bookingId: string): BookingRecord | undefined {
    return this.bookings.find((b) => b.bookingId === bookingId);
  }

  /**
   * Helper method to get bookings by doctor and date
   */
  private getBookingsByDoctorAndDate(doctorId: string, date: string): BookingRecord[] {
    return this.bookings.filter(
      (b) => b.doctorId === doctorId && b.date === date && b.status === 'CONFIRMED',
    );
  }

  /**
   * Book a new appointment
   * Reuses existing SlotManagementService.bookAppointment
   */
  async bookAppointment(dto: BookAppointmentDto): Promise<HealthcareSuccessResponse | HealthcareErrorResponse> {
    this.logger.log(
      `Booking appointment | doctorId: ${dto.doctorId} | specialization: ${dto.specialization} | date: ${dto.date} | time: ${dto.time} | patient: ${dto.patientName}`,
    );

    // Resolve doctor from either doctorId or specialization
    const doctor = this.resolveDoctor(dto.doctorId, dto.specialization);

    if (!doctor) {
      this.structuredLogger.logSlotAllocation({
        phoneNumber: dto.phoneNumber,
        doctorId: dto.doctorId || '',
        date: dto.date,
        time: dto.time,
        available: false,
        status: 'FAILURE',
        reason: 'Doctor not found',
      });

      return {
        success: false,
        error: 'Doctor not found',
        details: `No doctor found with provided criteria (doctorId: ${dto.doctorId}, specialization: ${dto.specialization})`,
      };
    }

    // Check availability first
    const availability = this.slotManagementService.getAvailableSlots(doctor.doctorId, dto.date);

    if (availability.reason) {
      this.structuredLogger.logSlotAllocation({
        phoneNumber: dto.phoneNumber,
        doctorId: doctor.doctorId,
        date: dto.date,
        time: dto.time,
        available: false,
        status: 'FAILURE',
        reason: availability.reason,
      });

      return {
        success: false,
        error: 'Cannot book appointment',
        details: availability.reason,
      };
    }

    // Check if the specific slot is available
    const slotAvailable = availability.slots.some(
      (slot) => slot.startTime === dto.time && slot.isAvailable,
    );

    if (!slotAvailable) {
      this.structuredLogger.logSlotAllocation({
        phoneNumber: dto.phoneNumber,
        doctorId: doctor.doctorId,
        date: dto.date,
        time: dto.time,
        available: false,
        status: 'FAILURE',
        reason: 'Slot not available',
      });

      return {
        success: false,
        error: 'Slot not available',
        details: `The slot at ${dto.time} on ${dto.date} is not available or already booked`,
      };
    }

    // Book the appointment
    const bookingResult = this.slotManagementService.bookAppointment(
      doctor.doctorId,
      dto.date,
      dto.time,
      dto.patientName,
      dto.phoneNumber,
    );

    if (!bookingResult.success) {
      this.structuredLogger.logSlotAllocation({
        phoneNumber: dto.phoneNumber,
        doctorId: doctor.doctorId,
        date: dto.date,
        time: dto.time,
        available: false,
        status: 'FAILURE',
        reason: bookingResult.message,
      });

      return {
        success: false,
        error: 'Booking failed',
        details: bookingResult.message,
      };
    }

    // Log successful slot allocation
    this.structuredLogger.logSlotAllocation({
      phoneNumber: dto.phoneNumber,
      doctorId: doctor.doctorId,
      date: dto.date,
      time: dto.time,
      available: true,
      status: 'SUCCESS',
    });

    const bookingResponse: BookingResponse = {
      bookingId: bookingResult.bookingId || '',
      doctorId: doctor.doctorId,
      doctorName: doctor.name,
      specialization: doctor.specialization,
      date: dto.date,
      time: dto.time,
      patientName: dto.patientName,
      phoneNumber: dto.phoneNumber,
      status: 'CONFIRMED',
      reason: dto.reason,
      createdAt: new Date().toISOString(),
    };

    // Update local bookings cache
    this.initializeMockData();

    return {
      success: true,
      message: 'Appointment booked successfully',
      booking: bookingResponse,
    };
  }

  /**
   * Cancel an existing appointment
   * Reuses existing SlotManagementService.cancelAppointment (requires patientPhone)
   * Since we don't have patientPhone in CancelAppointmentDto, we'll get it from the booking
   */
  async cancelAppointment(dto: CancelAppointmentDto): Promise<HealthcareSuccessResponse | HealthcareErrorResponse> {
    this.logger.log(`Cancelling appointment | bookingId: ${dto.bookingId}`);

    const booking = this.getBookingById(dto.bookingId);

    if (!booking) {
      return {
        success: false,
        error: 'Booking not found',
        details: `No booking found with ID: ${dto.bookingId}`,
      };
    }

    const result = this.slotManagementService.cancelAppointment(dto.bookingId, booking.patientPhone);

    if (!result.success) {
      return {
        success: false,
        error: 'Cancellation failed',
        details: result.message,
      };
    }

    // Update local bookings cache
    this.initializeMockData();

    return {
      success: true,
      message: 'Appointment cancelled successfully',
      bookingId: dto.bookingId,
    };
  }

  /**
   * Reschedule an existing appointment
   * Implements cancel + book as a transaction
   */
  async rescheduleAppointment(
    dto: RescheduleAppointmentDto,
  ): Promise<HealthcareSuccessResponse | HealthcareErrorResponse> {
    this.logger.log(
      `Rescheduling appointment | bookingId: ${dto.bookingId} | newDate: ${dto.newDate} | newTime: ${dto.newTime}`,
    );

    // First, get the existing booking details
    const existingBooking = this.getBookingById(dto.bookingId);

    if (!existingBooking) {
      return {
        success: false,
        error: 'Booking not found',
        details: `No booking found with ID: ${dto.bookingId}`,
      };
    }

    // Check availability for the new slot
    const availability = this.slotManagementService.getAvailableSlots(
      existingBooking.doctorId,
      dto.newDate,
    );

    if (availability.reason) {
      return {
        success: false,
        error: 'Cannot reschedule',
        details: availability.reason,
      };
    }

    const slotAvailable = availability.slots.some(
      (slot) => slot.startTime === dto.newTime && slot.isAvailable,
    );

    if (!slotAvailable) {
      return {
        success: false,
        error: 'New slot not available',
        details: `The slot at ${dto.newTime} on ${dto.newDate} is not available or already booked`,
      };
    }

    // Cancel the existing booking
    const cancelResult = this.slotManagementService.cancelAppointment(
      dto.bookingId,
      existingBooking.patientPhone,
    );

    if (!cancelResult.success) {
      return {
        success: false,
        error: 'Reschedule failed',
        details: `Could not cancel existing booking: ${cancelResult.message}`,
      };
    }

    // Book the new appointment
    const bookResult = this.slotManagementService.bookAppointment(
      existingBooking.doctorId,
      dto.newDate,
      dto.newTime,
      existingBooking.patientName,
      existingBooking.patientPhone,
    );

    if (!bookResult.success) {
      // Try to restore the original booking (rollback)
      this.logger.error(`Rollback: attempting to restore original booking ${dto.bookingId}`);
      this.slotManagementService.bookAppointment(
        existingBooking.doctorId,
        existingBooking.date,
        existingBooking.startTime,
        existingBooking.patientName,
        existingBooking.patientPhone,
      );

      return {
        success: false,
        error: 'Reschedule failed',
        details: `Could not book new slot: ${bookResult.message}. Original booking has been restored.`,
      };
    }

    // Get doctor details for response
    const doctor = this.getDoctorById(existingBooking.doctorId);

    const bookingResponse: BookingResponse = {
      bookingId: bookResult.bookingId || '',
      doctorId: existingBooking.doctorId,
      doctorName: doctor?.name || 'Unknown Doctor',
      specialization: doctor?.specialization || 'general',
      date: dto.newDate,
      time: dto.newTime,
      patientName: existingBooking.patientName,
      phoneNumber: existingBooking.patientPhone,
      status: 'CONFIRMED',
      reason: dto.reason,
      createdAt: new Date().toISOString(),
    };

    // Update local bookings cache
    this.initializeMockData();

    return {
      success: true,
      message: 'Appointment rescheduled successfully',
      booking: bookingResponse,
    };
  }

  /**
   * Check doctor availability for a specific date
   * Reuses existing SlotManagementService.getAvailableSlots
   */
  async checkAvailability(dto: CheckAvailabilityDto): Promise<HealthcareSuccessResponse | HealthcareErrorResponse> {
    this.logger.log(`Checking availability | doctorId: ${dto.doctorId} | specialization: ${dto.specialization} | date: ${dto.date}`);

    // Resolve doctor from either doctorId or specialization
    const doctor = this.resolveDoctor(dto.doctorId, dto.specialization);

    if (!doctor) {
      return {
        success: false,
        error: 'Doctor not found',
        details: `No doctor found with provided criteria (doctorId: ${dto.doctorId}, specialization: ${dto.specialization})`,
      };
    }

    const result = this.slotManagementService.getAvailableSlots(doctor.doctorId, dto.date);

    // Get booked slots count for the date
    const bookedSlots = this.getBookingsByDoctorAndDate(doctor.doctorId, dto.date).length;

    const slotResponses: SlotResponse[] = result.slots.map((slot) => ({
      startTime: slot.startTime,
      endTime: slot.endTime,
      available: slot.isAvailable,
    }));

    const availabilityResponse: DoctorAvailabilityResponse = {
      doctorId: doctor.doctorId,
      doctorName: doctor.name,
      specialization: doctor.specialization,
      date: dto.date,
      slotDuration: doctor.slotDuration,
      availableSlots: slotResponses,
      totalSlots: result.slots.length,
      dailyBookingLimit: doctor.dailyBookingLimit,
      bookedSlots: bookedSlots,
      isUnavailable: !!result.reason,
      unavailableReason: result.reason,
    };

    return {
      success: true,
      message: result.reason ? 'Doctor unavailable' : 'Availability retrieved successfully',
      availability: availabilityResponse,
      reason: result.reason,
    };
  }

  /**
   * Suggest alternate slots when preferred slot is unavailable
   * Reuses existing SlotManagementService.suggestAlternativeSlots
   */
  async suggestAlternateSlots(
    dto: SuggestSlotsDto,
  ): Promise<HealthcareSuccessResponse | HealthcareErrorResponse> {
    this.logger.log(
      `Suggesting alternate slots | doctorId: ${dto.doctorId} | preferredDate: ${dto.preferredDate} | preferredTime: ${dto.preferredTime}`,
    );

    // Resolve doctor from either doctorId or specialization (if added to DTO later)
    const doctor = this.getDoctorById(dto.doctorId);

    if (!doctor) {
      return {
        success: false,
        error: 'Doctor not found',
        details: `No doctor found with ID: ${dto.doctorId}`,
      };
    }

    const limit = dto.limit ? parseInt(dto.limit, 10) : 5;

    const result = this.slotManagementService.suggestAlternativeSlots(
      doctor.doctorId,
      dto.preferredDate,
      limit,
    );

    const slotResponses: SlotResponse[] = result.map((slot) => ({
      startTime: slot.startTime,
      endTime: slot.endTime,
      available: slot.isAvailable,
    }));

    return {
      success: true,
      message: 'Alternate slots suggested successfully',
      suggestedSlots: slotResponses,
    };
  }
}
