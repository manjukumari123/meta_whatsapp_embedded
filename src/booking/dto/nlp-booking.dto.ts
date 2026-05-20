import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IntentType } from '../../nlp/enums/intent.enum';
import { ExtractedEntity } from '../../nlp/dto/nlp-analysis.dto';

export class NlpBookingRequestDto {
  @ApiPropertyOptional({ example: '919999999999', description: 'User phone number for the booking session' })
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 'user-123', description: 'Alternative user identifier when phone number is not available' })
  userId?: string;

  @ApiPropertyOptional({ example: 'I need to book an appointment with Dr. Das tomorrow morning', description: 'User message sent to the booking assistant' })
  userMessage?: string;

  @ApiPropertyOptional({ example: 'I need a skin doctor tomorrow evening', description: 'Alternative message field accepted by the booking endpoint' })
  message?: string;

  @ApiPropertyOptional({ example: 'session-abc-123', description: 'Optional session ID for conversational context' })
  sessionId?: string;
}

export class NlpBookingResponseDto {
  @ApiProperty({ example: true, description: 'Indicates whether the booking service processed the message successfully' })
  success: boolean;

  @ApiProperty({ example: IntentType.BOOK_APPOINTMENT, description: 'Detected user intent' })
  intent: IntentType;

  @ApiProperty({ example: 'Your appointment is confirmed. Your booking ID is 12345.', description: 'Response message returned to the user' })
  message: string;

  @ApiPropertyOptional({
    example: {
      bookingId: '12345',
      doctorName: 'Dr. Jatin Das',
      date: '2026-05-15',
      time: '10:30 AM',
      upcomingBookings: [],
      availableSlots: [],
      suggestions: [],
      oldDate: '2026-05-14',
      oldTime: '10:00 AM',
      newDate: '2026-05-15',
      newTime: '10:30 AM',
      escalationRequested: false,
      escalationTime: '2026-05-14T10:00:00Z',
    },
    description: 'Optional structured booking metadata returned by the assistant',
  })
  data?: {
    bookingId?: string;
    doctorName?: string;
    date?: string;
    time?: string;
    upcomingBookings?: any[];
    availableSlots?: any[];
    suggestions?: any[];
    oldDate?: string;
    oldTime?: string;
    newDate?: string;
    newTime?: string;
    escalationRequested?: boolean;
    escalationTime?: string;
  };

  @ApiPropertyOptional({
    example: {
      doctorId: 'doc-1',
      doctorName: 'Dr. Rajesh Kumar',
      specialization: 'dermatologist',
      date: '2026-05-15',
      startTime: '16:00',
      endTime: '16:30',
    },
    description: 'Confirmed appointment details after successful booking',
  })
  appointment?: {
    doctorId: string;
    doctorName: string;
    specialization: string;
    date: string;
    startTime: string;
    endTime: string;
  };

  @ApiPropertyOptional({
    example: {
      specialization: 'Dermatologist',
      date: '2026-05-15',
      timePeriod: 'evening',
    },
    description: 'Entities extracted from the user message',
  })
  entities?: ExtractedEntity;

  @ApiPropertyOptional({
    example: [
      {
        doctorName: 'Dr. Rajesh',
        time: '17:00',
      },
    ],
    description: 'Available slot suggestions returned by the assistant',
  })
  availableSlots?: any[];

  @ApiPropertyOptional({
    example: {
      appointmentId: 'book-1778741622340-0p34i18t1',
      doctorName: 'Dr. Rajesh Kumar',
      date: '2026-05-15',
      time: '16:30',
    },
    description: 'Details of the appointment that was cancelled',
  })
  cancelledAppointment?: {
    appointmentId: string;
    doctorName: string;
    date: string;
    time: string;
  };

  @ApiPropertyOptional({
    example: ['Try: I need a skin doctor tomorrow evening'],
    description: 'Suggested user rewrites when the input cannot be understood',
  })
  suggestions?: string[];

  @ApiPropertyOptional({ example: false, description: 'Whether the booking flow requires user confirmation' })
  requiresConfirmation?: boolean;

  @ApiPropertyOptional({ example: 'Please confirm the appointment details', description: 'Follow-up confirmation message if required' })
  confirmationMessage?: string;

  @ApiPropertyOptional({ example: { entityType: 'doctor', value: 'Dr. Jatin Das' }, description: 'Entities extracted from the user message' })
  extractedEntities?: ExtractedEntity;
}
