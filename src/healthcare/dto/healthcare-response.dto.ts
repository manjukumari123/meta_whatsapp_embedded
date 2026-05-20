import { ApiProperty } from '@nestjs/swagger';

export class SlotResponse {
  @ApiProperty({ example: '2026-05-20', description: 'Slot date' })
  date: string;

  @ApiProperty({ example: '09:00', description: 'Slot start time' })
  startTime: string;

  @ApiProperty({ example: '09:30', description: 'Slot end time' })
  endTime: string;

  @ApiProperty({ example: true, description: 'Whether the slot is available' })
  available: boolean;
}

export class DoctorAvailabilityResponse {
  @ApiProperty({ example: 'doc-1', description: 'Doctor ID' })
  doctorId: string;

  @ApiProperty({ example: 'Dr. Rajesh Kumar', description: 'Doctor name' })
  doctorName: string;

  @ApiProperty({ example: 'dermatologist', description: 'Doctor specialization' })
  specialization: string;

  @ApiProperty({ example: '2026-05-20', description: 'Date checked' })
  date: string;

  @ApiProperty({ example: '30', description: 'Slot duration in minutes' })
  slotDuration: number;

  @ApiProperty({ type: [SlotResponse], description: 'Available slots' })
  availableSlots: SlotResponse[];

  @ApiProperty({ example: 8, description: 'Total available slots' })
  totalSlots: number;

  @ApiProperty({ example: 10, description: 'Daily booking limit' })
  dailyBookingLimit: number;

  @ApiProperty({ example: 2, description: 'Already booked slots' })
  bookedSlots: number;

  @ApiProperty({ example: false, description: 'Whether doctor is unavailable on this date' })
  isUnavailable: boolean;

  @ApiProperty({ example: 'Conference', description: 'Reason if unavailable', required: false })
  unavailableReason?: string;
}

export class BookingResponse {
  @ApiProperty({ example: 'booking-123', description: 'Booking ID' })
  bookingId: string;

  @ApiProperty({ example: 'doc-1', description: 'Doctor ID' })
  doctorId: string;

  @ApiProperty({ example: 'Dr. Rajesh Kumar', description: 'Doctor name' })
  doctorName: string;

  @ApiProperty({ example: 'dermatologist', description: 'Doctor specialization' })
  specialization: string;

  @ApiProperty({ example: '2026-05-20', description: 'Appointment date' })
  date: string;

  @ApiProperty({ example: '10:00', description: 'Appointment time' })
  time: string;

  @ApiProperty({ example: 'John Doe', description: 'Patient name' })
  patientName: string;

  @ApiProperty({ example: '919999999999', description: 'Patient phone number' })
  phoneNumber: string;

  @ApiProperty({ example: 'CONFIRMED', description: 'Booking status' })
  status: string;

  @ApiProperty({ example: 'Regular checkup', description: 'Reason for appointment', required: false })
  reason?: string;

  @ApiProperty({ example: '2026-05-14T09:00:00.000Z', description: 'Booking timestamp' })
  createdAt: string;
}

export class HealthcareSuccessResponse {
  @ApiProperty({ example: true, description: 'Success status' })
  success: boolean;

  @ApiProperty({ example: 'Appointment booked successfully', description: 'Success message' })
  message: string;

  @ApiProperty({ type: BookingResponse, description: 'Booking details (for booking operations)' })
  booking?: BookingResponse;

  @ApiProperty({ example: 'booking-123', description: 'Booking ID (for cancellation/reschedule)' })
  bookingId?: string;

  @ApiProperty({ type: DoctorAvailabilityResponse, description: 'Availability details (for check availability)' })
  availability?: DoctorAvailabilityResponse;

  @ApiProperty({ type: [SlotResponse], description: 'Suggested slots (for slot suggestions)' })
  suggestedSlots?: SlotResponse[];

  @ApiProperty({ example: 'Conference', description: 'Reason if unavailable', required: false })
  reason?: string;
}

export class HealthcareErrorResponse {
  @ApiProperty({ example: false, description: 'Success status' })
  success: boolean;

  @ApiProperty({ example: 'Doctor not found', description: 'Error message' })
  error: string;

  @ApiProperty({ example: 'Doctor with ID doc-999 does not exist', description: 'Detailed error description' })
  details?: string;
}
