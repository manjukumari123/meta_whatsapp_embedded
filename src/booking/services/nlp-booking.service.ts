import { Injectable, Logger } from '@nestjs/common';
import { NlpRecognitionService } from '../../nlp/services/nlp-recognition.service';
import { SlotManagementService } from '../../slot-management/services/slot-management.service';
import { Slot } from '../../slot-management/entities/slot.entity';
import { ConversationContextService } from '../../conversation/services/conversation-context.service';
import { NlpBookingRequestDto, NlpBookingResponseDto } from '../dto/nlp-booking.dto';
import { IntentType } from '../../nlp/enums/intent.enum';

interface PendingSlotConfirmation {
  doctorId: string;
  doctorName: string;
  specialization?: string;
  date: string;
  timePeriod?: 'morning' | 'afternoon' | 'evening';
  availableSlots: Slot[];
}

interface PendingCancellationContext {
  upcomingBookings: Array<{
    bookingId: string;
    doctorName: string;
    date: string;
    startTime: string;
  }>;
}

@Injectable()
export class NlpBookingService {
  private readonly logger = new Logger(NlpBookingService.name);

  constructor(
    private readonly nlpService: NlpRecognitionService,
    private readonly slotService: SlotManagementService,
    private readonly contextService: ConversationContextService,
  ) {}

  /**
   * Process user message and handle booking flow
   */
  async processUserMessage(
    request: NlpBookingRequestDto,
  ): Promise<NlpBookingResponseDto> {
    const { phoneNumber, userMessage } = request;

    if (!phoneNumber || !userMessage) {
      throw new Error('phoneNumber and userMessage are required to process booking messages');
    }

    this.logger.log(
      `Processing user message | phoneNumber: ${phoneNumber} | message: ${userMessage}`,
    );

    // Increment message count
    this.contextService.incrementMessageCount(phoneNumber);

    // Get or create conversation context
    const context = this.contextService.getContext(phoneNumber);

    // Analyze intent and extract entities
    const nlpResult = this.nlpService.analyzeUserInput(userMessage);
    const pendingConfirmation = this.contextService.getPendingConfirmation(phoneNumber);
    const pendingCancellation = this.contextService.getPendingCancellation(phoneNumber);
    const isPendingCancellationSelection =
      pendingCancellation &&
      (nlpResult.extractedEntities.appointmentId ||
        nlpResult.extractedEntities.time ||
        nlpResult.extractedEntities.slotOrdinal !== undefined);
    const isPendingSlotSelection =
      pendingConfirmation &&
      (nlpResult.extractedEntities.time ||
        nlpResult.extractedEntities.slotOrdinal !== undefined) &&
      !nlpResult.extractedEntities.doctorName &&
      !nlpResult.extractedEntities.specialization;
    const intent = isPendingCancellationSelection
      ? IntentType.CANCEL_APPOINTMENT
      : isPendingSlotSelection
      ? IntentType.BOOK_APPOINTMENT
      : nlpResult.intent;

    // Merge with previous context if needed
    const mergedEntities = this.contextService.mergeEntities(
      phoneNumber,
      nlpResult.extractedEntities,
    );

    // Update context
    this.contextService.updateContext(phoneNumber, intent, mergedEntities);

    // Route to appropriate handler
    let response: NlpBookingResponseDto;

    switch (intent) {
      case IntentType.BOOK_APPOINTMENT:
        response = await this.handleBookingFlow(
          phoneNumber,
          mergedEntities,
          nlpResult.extractedEntities,
        );
        break;

      case IntentType.CANCEL_APPOINTMENT:
        response = await this.handleCancellationFlow(phoneNumber, mergedEntities);
        break;

      case IntentType.VIEW_APPOINTMENTS:
        response = await this.handleViewAppointments(phoneNumber);
        break;

      case IntentType.CHECK_SLOTS:
        response = await this.handleCheckSlots(mergedEntities);
        break;

      default:
        response = {
          success: false,
          intent: IntentType.FALLBACK,
          message:
            "I didn't understand that. You can:\n- Book an appointment (e.g., 'Book appointment with Dr. Rajesh')\n- Cancel an appointment (e.g., 'Cancel my appointment')\n- Check available slots\n- View my bookings",
          suggestions: [
            'Try: I need a skin doctor tomorrow evening',
            'Try: Show me available slots for a dentist',
          ],
        };
    }

    this.logger.log(
      `Processing complete | phoneNumber: ${phoneNumber} | intent: ${intent} | success: ${response.success}`,
    );

    return { ...response, intent, entities: mergedEntities };
  }

  /**
   * Handle appointment booking flow
   */
  private async handleBookingFlow(
    phoneNumber: string,
    entities: any,
    extractedEntities: any,
  ): Promise<NlpBookingResponseDto> {
    this.logger.log(
      `[INTENT_DETECTION] BOOK_APPOINTMENT | phoneNumber: ${phoneNumber} | entities: ${JSON.stringify(entities)} | extractedEntities: ${JSON.stringify(extractedEntities)}`,
    );

    const pendingConfirmation = this.contextService.getPendingConfirmation(phoneNumber);
    if (
      pendingConfirmation &&
      (extractedEntities.time || extractedEntities.slotOrdinal !== undefined) &&
      !extractedEntities.doctorName &&
      !extractedEntities.specialization
    ) {
      return this.confirmPendingSlot(
        phoneNumber,
        extractedEntities.time,
        extractedEntities.slotOrdinal,
        pendingConfirmation,
      );
    }

    // Determine doctor/specialization
    let doctorId: string | undefined;
    let doctorName: string | undefined;

    if (entities.doctorName) {
      const doctor = this.slotService.findDoctorByName(entities.doctorName);
      if (doctor) {
        doctorId = doctor.doctorId;
        doctorName = doctor.name;
      } else if (entities.specialization) {
        const doctors = this.slotService.findDoctorsBySpecialization(
          entities.specialization,
        );
        if (doctors.length > 0) {
          doctorId = doctors[0].doctorId;
          doctorName = doctors[0].name;
        }
      }

      if (!doctorId) {
        return {
          success: false,
          intent: IntentType.BOOK_APPOINTMENT,
          message: `Sorry, doctor "${entities.doctorName}" not found. Available doctors: Dr. Rajesh Kumar (Dermatologist), Dr. Jatin Das (Cardiologist), Dr. Priya Singh (Dentist), Dr. Amit Patel (Orthopedic)`,
        };
      }
    } else if (entities.specialization) {
      const doctors = this.slotService.findDoctorsBySpecialization(
        entities.specialization,
      );
      if (doctors.length > 0) {
        doctorId = doctors[0].doctorId;
        doctorName = doctors[0].name;
      } else {
        return {
          success: false,
          intent: IntentType.BOOK_APPOINTMENT,
          message: `Sorry, no doctors found for "${entities.specialization}". Available specializations: Dermatology, Cardiology, Dentistry, Orthopedics`,
          entities,
          suggestions: [
            'Try: I need a cardiologist tomorrow',
            'Try: Book an appointment with a dentist',
          ],
        };
      }
    } else {
      return {
        success: false,
        intent: IntentType.BOOK_APPOINTMENT,
        message:
          'Please specify which doctor or specialization you need. E.g., "I need a skin doctor" or "Book with Dr. Rajesh"',
        entities,
        suggestions: [
          'Try: I need a skin doctor tomorrow evening',
          'Try: Book appointment with Dr. Rajesh tomorrow',
        ],
      };
    }

    const date = entities.date || new Date().toISOString().split('T')[0];
    this.logger.log(
      `[SLOT_ALLOCATION] Querying slots | doctorId: ${doctorId} | doctorName: ${doctorName} | date: ${date} | timePeriod: ${entities.timePeriod}`,
    );
    const allSlots = this.slotService.getAvailableSlots(doctorId, date);
    this.logger.log(
      `[SLOT_ALLOCATION] Found ${allSlots.slots.length} available slots | doctorId: ${doctorId} | date: ${date}`,
    );

    if (allSlots.slots.length === 0) {
      this.logger.log(
        `[SLOT_SUGGESTIONS] No slots available | doctorId: ${doctorId} | date: ${date} | reason: ${allSlots.reason}`,
      );
      const alternatives = this.slotService.suggestAlternativeSlots(doctorId, date, 3);
      this.logger.log(
        `[SLOT_SUGGESTIONS] Found ${alternatives.length} alternative slots | doctorId: ${doctorId}`,
      );

      if (alternatives.length > 0) {
        const suggestionText = alternatives
          .map((slot) => `${slot.date} at ${slot.startTime}`)
          .join(', ');
        const message = this.buildAlternativeSlotsMessage(
          doctorName,
          date,
          entities.timePeriod,
          suggestionText,
        );

        return {
          success: false,
          intent: IntentType.BOOK_APPOINTMENT,
          message,
          requiresConfirmation: true,
          entities,
          suggestions: alternatives.map((slot) => `${slot.date} at ${slot.startTime}`),
          availableSlots: alternatives,
        };
      }

      return {
        success: false,
        intent: IntentType.BOOK_APPOINTMENT,
        message: allSlots.reason || 'No slots available',
      };
    }

    const filteredSlots = entities.timePeriod
      ? this.filterSlotsByTimePeriod(allSlots.slots, entities.timePeriod)
      : allSlots.slots;

    if (entities.timePeriod && filteredSlots.length === 0) {
      this.logger.log(
        `[SLOT_SUGGESTIONS] Time period filter returned no slots | timePeriod: ${entities.timePeriod} | available: ${allSlots.slots.length} | filtered: 0`,
      );
      const fallbackSlots = allSlots.slots.slice(0, 5);
      const suggestionText = fallbackSlots.map((slot) => slot.startTime).join(', ');
      this.logger.log(
        `[SLOT_SUGGESTIONS] Providing fallback slots | count: ${fallbackSlots.length} | times: ${suggestionText}`,
      );
      const message = this.buildAlternativeSlotsMessage(
        doctorName,
        date,
        entities.timePeriod,
        suggestionText,
      );

      return {
        success: false,
        intent: IntentType.BOOK_APPOINTMENT,
        message,
        requiresConfirmation: true,
        entities,
        suggestions: fallbackSlots.map((slot) => `${slot.date} at ${slot.startTime}`),
        availableSlots: fallbackSlots,
      };
    }

    if (entities.time) {
      this.logger.log(
        `[SLOT_ALLOCATION] Direct time slot requested | time: ${entities.time} | doctorId: ${doctorId} | date: ${date}`,
      );
      const slot = filteredSlots.find((s) => s.startTime === entities.time);
      if (slot) {
        this.logger.log(
          `[SLOT_ALLOCATION] Slot found, booking | startTime: ${slot.startTime} | endTime: ${slot.endTime}`,
        );
        const bookingResult = this.slotService.bookAppointment(
          doctorId,
          date,
          entities.time,
          'Patient',
          phoneNumber,
        );
        this.logger.log(
          `[SLOT_ALLOCATION] Booking result | success: ${bookingResult.success} | bookingId: ${bookingResult.bookingId} | message: ${bookingResult.message}`,
        );

        if (bookingResult.success) {
          return {
            success: true,
            intent: IntentType.BOOK_APPOINTMENT,
            message: bookingResult.message,
            entities,
            data: {
              bookingId: bookingResult.bookingId,
              doctorName,
              date,
              time: entities.time,
            },
          };
        }

        return {
          success: false,
          intent: IntentType.BOOK_APPOINTMENT,
          message: bookingResult.message,
          entities,
        };
      }
    }

    const slotsList = filteredSlots
      .slice(0, 5)
      .map((s) => s.startTime)
      .join(', ');

    this.contextService.setPendingConfirmation(phoneNumber, {
      doctorId,
      doctorName,
      specialization: entities.specialization,
      date,
      timePeriod: entities.timePeriod,
      availableSlots: filteredSlots,
    });
    this.logger.log(
      `[CONTEXT] Stored pending confirmation | phoneNumber: ${phoneNumber} | doctorId: ${doctorId} | date: ${date} | slotsCount: ${filteredSlots.length}`,
    );

    return {
      success: true,
      intent: IntentType.BOOK_APPOINTMENT,
      message: `I found ${entities.timePeriod ?? 'available'} ${doctorName} slots for ${date}. Please choose one.`,
      requiresConfirmation: true,
      entities,
      availableSlots: filteredSlots,
      suggestions: [],
    };
  }

  /**
   * Confirm a pending slot selection from previous suggestions
   */
  private async confirmPendingSlot(
    phoneNumber: string,
    time: string | undefined,
    slotOrdinal: number | undefined,
    pendingConfirmation: PendingSlotConfirmation,
  ): Promise<NlpBookingResponseDto> {
    this.logger.log(
      `[PENDING_CONFIRMATION] Confirming slot | phoneNumber: ${phoneNumber} | time: ${time} | slotOrdinal: ${slotOrdinal}`,
    );
    const {
      doctorId,
      doctorName,
      specialization,
      date,
      availableSlots,
      timePeriod,
    } = pendingConfirmation;

    if (!doctorId || !doctorName || !date || !availableSlots?.length) {
      return {
        success: false,
        intent: IntentType.BOOK_APPOINTMENT,
        message:
          'I could not find your previous booking context. Please tell me which doctor or specialization you need.',
        requiresConfirmation: false,
        suggestions: [
          'I need a skin doctor tomorrow evening',
          'Book appointment with Dr. Rajesh tomorrow',
        ],
      };
    }

    let selectedSlot: Slot | undefined;

    // Match by time if provided
    if (time) {
      this.logger.log(
        `[PENDING_CONFIRMATION] Matching by time | requestedTime: ${time} | availableCount: ${availableSlots.length}`,
      );
      selectedSlot = availableSlots.find((s) => s.startTime === time);
    }
    // Match by ordinal if provided
    else if (slotOrdinal !== undefined && slotOrdinal < availableSlots.length) {
      this.logger.log(
        `[PENDING_CONFIRMATION] Matching by ordinal | slotOrdinal: ${slotOrdinal} | availableCount: ${availableSlots.length}`,
      );
      selectedSlot = availableSlots[slotOrdinal];
    }

    if (!selectedSlot) {
      this.logger.log(
        `[PENDING_CONFIRMATION] Slot not found in pending options | requestedTime: ${time} | slotOrdinal: ${slotOrdinal} | validTimes: ${availableSlots.map((s) => s.startTime).join(', ')}`,
      );
      const validTimes = availableSlots.map((s) => s.startTime).join(', ');
      const ordinalList = availableSlots
        .map((s, idx) => {
          const ordinals = ['first', 'second', 'third', 'fourth', 'fifth'];
          return `${ordinals[idx] || `#${idx + 1}`} at ${s.startTime}`;
        })
        .join(', ');

      return {
        success: false,
        intent: IntentType.BOOK_APPOINTMENT,
        message: `I couldn't find that slot in your pending options. Available times for ${doctorName} on ${date} are: ${validTimes}. Please choose one of those times (e.g., "Book 16:00 slot" or "I choose the first slot").`,
        requiresConfirmation: true,
        availableSlots,
        suggestions: availableSlots.map((s) => `${date} at ${s.startTime}`),
        entities: {
          specialization,
          date,
          timePeriod,
        },
      };
    }

    const bookingResult = this.slotService.bookAppointment(
      doctorId,
      date,
      selectedSlot.startTime,
      'Patient',
      phoneNumber,
    );
    this.logger.log(
      `[PENDING_CONFIRMATION] Booking result | success: ${bookingResult.success} | bookingId: ${bookingResult.bookingId} | message: ${bookingResult.message}`,
    );

    if (!bookingResult.success) {
      return {
        success: false,
        intent: IntentType.BOOK_APPOINTMENT,
        message: bookingResult.message,
        requiresConfirmation: false,
        availableSlots,
        entities: {
          specialization,
          date,
          timePeriod,
        },
      };
    }

    this.contextService.clearPendingConfirmation(phoneNumber);
    this.logger.log(
      `[PENDING_CONFIRMATION] Cleared pending confirmation | phoneNumber: ${phoneNumber} | bookingId: ${bookingResult.bookingId}`,
    );

    return {
      success: true,
      intent: IntentType.BOOK_APPOINTMENT,
      message: `Your appointment with ${doctorName} has been booked for ${date} at ${selectedSlot.startTime}.`,
      requiresConfirmation: false,
      appointment: {
        doctorId,
        doctorName,
        specialization: specialization ?? '',
        date,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
      },
      data: {
        bookingId: bookingResult.bookingId,
        doctorName,
        date,
        time: selectedSlot.startTime,
      },
    };
  }

  /**
   * Build a user-friendly message for slot availability.
   * Never includes "undefined" in the message.
   */
  private buildSlotAvailabilityMessage(
    doctorName: string | undefined,
    date: string,
    timePeriod?: string,
  ): string {
    const doctor = doctorName || 'doctor';
    if (!timePeriod) {
      return `No ${doctor} slots are available on ${date}.`;
    }
    return `I couldn't find ${timePeriod} slots for ${doctor} on ${date}.`;
  }

  /**
   * Build a message with alternative slot suggestions.
   * Never includes "undefined" in the message.
   */
  private buildAlternativeSlotsMessage(
    doctorName: string | undefined,
    date: string,
    timePeriod: string | undefined,
    suggestionText: string,
  ): string {
    const baseMessage = this.buildSlotAvailabilityMessage(doctorName, date, timePeriod);
    return `${baseMessage} However, here are some other available times: ${suggestionText}`;
  }

  /**
   * Filter available slots by requested time period
   */
  private filterSlotsByTimePeriod(
    slots: Array<{ startTime: string; endTime: string }>,
    timePeriod: string,
  ) {
    const periodRanges: Record<string, { start: string; end: string }> = {
      morning: { start: '09:00', end: '12:00' },
      afternoon: { start: '12:00', end: '16:00' },
      evening: { start: '16:00', end: '20:00' },
    };

    const period = periodRanges[timePeriod.toLowerCase()];
    if (!period) {
      return slots;
    }

    return slots.filter(
      (slot) => slot.startTime >= period.start && slot.startTime < period.end,
    );
  }

  /**
   * Handle appointment cancellation
   */
  private async handleCancellationFlow(
    phoneNumber: string,
    entities: any,
  ): Promise<NlpBookingResponseDto> {
    this.logger.log(
      `[INTENT_DETECTION] CANCEL_APPOINTMENT | phoneNumber: ${phoneNumber} | entities: ${JSON.stringify(entities)}`,
    );

    if (entities.appointmentId) {
      this.logger.log(
        `[CANCELLATION] Cancelling by appointment ID | appointmentId: ${entities.appointmentId} | phoneNumber: ${phoneNumber}`,
      );
      const result = this.slotService.cancelAppointment(
        `book-${entities.appointmentId}`,
        phoneNumber,
      );
      this.logger.log(
        `[CANCELLATION] Cancellation result | success: ${result.success} | message: ${result.message}`,
      );

      if (result.success) {
        this.contextService.clearPendingCancellation(phoneNumber);
        const pendingCancellationData = this.contextService.getPendingCancellation(phoneNumber);
        const matchedBooking = pendingCancellationData?.upcomingBookings.find((booking) =>
          booking.bookingId.includes(entities.appointmentId || ''),
        );

        return {
          success: true,
          intent: IntentType.CANCEL_APPOINTMENT,
          message: result.message,
          requiresConfirmation: false,
          cancelledAppointment: matchedBooking
            ? {
                appointmentId: matchedBooking.bookingId,
                doctorName: matchedBooking.doctorName,
                date: matchedBooking.date,
                time: matchedBooking.startTime,
              }
            : {
                appointmentId: `book-${entities.appointmentId}`,
                doctorName: '',
                date: '',
                time: '',
              },
        };
      }

      const pendingCancellationData = this.contextService.getPendingCancellation(phoneNumber);
      if (pendingCancellationData) {
        return this.confirmPendingCancellation(
          phoneNumber,
          entities,
          pendingCancellationData,
        );
      }

      return {
        success: false,
        intent: IntentType.CANCEL_APPOINTMENT,
        message: result.message,
      };
    }

    if (
      this.contextService.getPendingCancellation(phoneNumber) &&
      (entities.time || entities.slotOrdinal !== undefined)
    ) {
      return this.confirmPendingCancellation(
        phoneNumber,
        entities,
        this.contextService.getPendingCancellation(phoneNumber),
      );
    }

    // Get upcoming bookings and ask which one to cancel
    this.logger.log(
      `[CANCELLATION] Fetching patient bookings for selection | phoneNumber: ${phoneNumber}`,
    );
    const bookings = this.slotService.getPatientBookings(phoneNumber);
    this.logger.log(
      `[CANCELLATION] Found bookings | upcoming: ${bookings.upcomingBookings.length} | past: ${bookings.pastBookings.length}`,
    );

    if (bookings.upcomingBookings.length === 0) {
      return {
        success: false,
        intent: IntentType.CANCEL_APPOINTMENT,
        message: 'You have no upcoming appointments to cancel',
      };
    }

    const bookingsList = bookings.upcomingBookings
      .map((b) => `${b.doctorName} on ${b.date} at ${b.startTime} (ID: ${b.bookingId})`)
      .join('\n');

    const cancellationContext: PendingCancellationContext = {
      upcomingBookings: bookings.upcomingBookings.map((b) => ({
        bookingId: b.bookingId,
        doctorName: b.doctorName,
        date: b.date,
        startTime: b.startTime,
      })),
    };

    this.contextService.setPendingCancellation(phoneNumber, cancellationContext);

    return {
      success: false,
      intent: IntentType.CANCEL_APPOINTMENT,
      message: `Your upcoming appointments:\n${bookingsList}\n\nWhich appointment would you like to cancel?`,
      requiresConfirmation: true,
    };
  }

  private async confirmPendingCancellation(
    phoneNumber: string,
    entities: any,
    pendingCancellation: PendingCancellationContext,
  ): Promise<NlpBookingResponseDto> {
    const { upcomingBookings } = pendingCancellation;

    let selectedBooking = upcomingBookings.find(
      (booking) =>
        booking.bookingId === entities.appointmentId ||
        booking.bookingId.includes(entities.appointmentId || ''),
    );

    if (!selectedBooking && entities.time) {
      selectedBooking = upcomingBookings.find(
        (booking) => booking.startTime === entities.time,
      );
    }

    if (!selectedBooking && entities.slotOrdinal !== undefined) {
      selectedBooking = upcomingBookings[entities.slotOrdinal];
    }

    if (!selectedBooking) {
      const validOptions = upcomingBookings
        .map((booking, idx) =>
          `${idx + 1}. ${booking.doctorName} on ${booking.date} at ${booking.startTime} (ID: ${booking.bookingId})`,
        )
        .join('\n');

      return {
        success: false,
        intent: IntentType.CANCEL_APPOINTMENT,
        message: `I couldn't find that appointment in your pending options. Here are your valid cancellation choices:\n${validOptions}\n\nPlease respond with the appointment ID, exact time, or position like 'first one' or 'second one'.`,
        requiresConfirmation: true,
        suggestions: upcomingBookings.map(
          (booking) => `${booking.date} at ${booking.startTime}`,
        ),
      };
    }

    const cancelResult = this.slotService.cancelAppointment(
      selectedBooking.bookingId,
      phoneNumber,
    );

    if (!cancelResult.success) {
      return {
        success: false,
        intent: IntentType.CANCEL_APPOINTMENT,
        message: cancelResult.message,
      };
    }

    this.contextService.clearPendingCancellation(phoneNumber);
    this.logger.log(
      `[CANCELLATION] Cleared pending cancellation | phoneNumber: ${phoneNumber} | bookingId: ${selectedBooking.bookingId}`,
    );

    return {
      success: true,
      intent: IntentType.CANCEL_APPOINTMENT,
      message: cancelResult.message,
      requiresConfirmation: false,
      cancelledAppointment: {
        appointmentId: selectedBooking.bookingId,
        doctorName: selectedBooking.doctorName,
        date: selectedBooking.date,
        time: selectedBooking.startTime,
      },
    };
  }

  /**
   * Handle view appointments
   */
  private async handleViewAppointments(
    phoneNumber: string,
  ): Promise<NlpBookingResponseDto> {
    this.logger.log(
      `[INTENT_DETECTION] VIEW_APPOINTMENTS | phoneNumber: ${phoneNumber}`,
    );

    const bookings = this.slotService.getPatientBookings(phoneNumber);
    this.logger.log(
      `[VIEW_APPOINTMENTS] Found bookings | phoneNumber: ${phoneNumber} | upcoming: ${bookings.upcomingBookings.length} | past: ${bookings.pastBookings.length}`,
    );

    if (
      bookings.upcomingBookings.length === 0 &&
      bookings.pastBookings.length === 0
    ) {
      return {
        success: true,
        intent: IntentType.VIEW_APPOINTMENTS,
        message: 'You have no appointments',
      };
    }

    let message = '';

    if (bookings.upcomingBookings.length > 0) {
      message += 'Upcoming Appointments:\n';
      message += bookings.upcomingBookings
        .map((b) => `• ${b.doctorName} (${b.specialization}) on ${b.date} at ${b.startTime}`)
        .join('\n');
    }

    if (bookings.pastBookings.length > 0) {
      if (message) message += '\n\n';
      message += 'Past Appointments:\n';
      message += bookings.pastBookings
        .map((b) => `• ${b.doctorName} (${b.specialization}) on ${b.date} at ${b.startTime}`)
        .join('\n');
    }

    return {
      success: true,
      intent: IntentType.VIEW_APPOINTMENTS,
      message,
      data: {
        upcomingBookings: bookings.upcomingBookings,
      },
    };
  }

  /**
   * Handle check slots
   */
  private async handleCheckSlots(
    entities: any,
  ): Promise<NlpBookingResponseDto> {
    this.logger.log(
      `[INTENT_DETECTION] CHECK_SLOTS | entities: ${JSON.stringify(entities)}`,
    );

    const date = entities.date || new Date().toISOString().split('T')[0];

    if (entities.doctorName) {
      this.logger.log(
        `[CHECK_SLOTS] Querying by doctor | doctorName: ${entities.doctorName} | date: ${date}`,
      );
      const doctor = this.slotService.findDoctorByName(entities.doctorName);
      if (!doctor) {
        this.logger.log(
          `[CHECK_SLOTS] Doctor not found | doctorName: ${entities.doctorName}`,
        );
        return {
          success: false,
          intent: IntentType.CHECK_SLOTS,
          message: `Doctor "${entities.doctorName}" not found`,
          entities,
        };
      }

      const slots = this.slotService.getAvailableSlots(doctor.doctorId, date);
      this.logger.log(
        `[CHECK_SLOTS] Found slots | doctorId: ${doctor.doctorId} | count: ${slots.slots.length}`,
      );
      if (slots.slots.length === 0) {
        return {
          success: false,
          intent: IntentType.CHECK_SLOTS,
          message: `No available slots for ${doctor.name} on ${date}`,
          entities,
        };
      }

      const slotsList = slots.slots
        .map((s) => s.startTime)
        .join(', ');

      return {
        success: true,
        intent: IntentType.CHECK_SLOTS,
        message: `Available slots for ${doctor.name} on ${date}: ${slotsList}`,
        entities,
        availableSlots: slots.slots,
        data: { availableSlots: slots.slots },
      };
    }

    if (entities.specialization) {
      this.logger.log(
        `[CHECK_SLOTS] Querying by specialization | specialization: ${entities.specialization} | date: ${date}`,
      );
      const slots = this.slotService.getAvailableSlotsBySpecialization(
        entities.specialization,
        date,
      );
      this.logger.log(
        `[CHECK_SLOTS] Found doctors with slots | specialization: ${entities.specialization} | count: ${slots.length}`,
      );

      if (slots.length === 0) {
        return {
          success: false,
          intent: IntentType.CHECK_SLOTS,
          message: `No available slots for ${entities.specialization} specialists on ${date}`,
          entities,
        };
      }

      let message = `Available slots for ${entities.specialization} specialists on ${date}:\n`;
      message += slots
        .map(
          (item) =>
            `${item.doctorName}: ${item.slots
              .map((s) => s.startTime)
              .join(', ')}`,
        )
        .join('\n');

      return {
        success: true,
        intent: IntentType.CHECK_SLOTS,
        message,
        entities,
        availableSlots: slots,
        data: { availableSlots: slots },
      };
    }

    return {
      success: false,
      intent: IntentType.CHECK_SLOTS,
      message:
        'Please specify which doctor or specialization you want to check availability for',
    };
  }
}
