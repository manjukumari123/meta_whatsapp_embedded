import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { HealthcareService } from './healthcare.service';
import { BookAppointmentDto } from './dto/book-appointment.dto';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { CheckAvailabilityDto } from './dto/check-availability.dto';
import { SuggestSlotsDto } from './dto/suggest-slots.dto';
import { HealthcareSuccessResponse, HealthcareErrorResponse } from './dto/healthcare-response.dto';

@ApiTags('healthcare')
@Controller('healthcare')
export class HealthcareController {
  constructor(private readonly healthcareService: HealthcareService) {}

  @Post('book')
  @ApiOperation({ summary: 'Book a new appointment' })
  @ApiBody({
    type: BookAppointmentDto,
    examples: {
      byDoctorId: {
        summary: 'Book by doctor ID',
        value: {
          doctorId: 'doc-1',
          date: '2026-05-20',
          time: '10:00',
          patientName: 'John Doe',
          phoneNumber: '919999999999',
          reason: 'Regular checkup',
        },
      },
      bySpecialization: {
        summary: 'Book by specialization',
        value: {
          specialization: 'dermatologist',
          date: '2026-05-20',
          time: '10:00',
          patientName: 'John Doe',
          phoneNumber: '919999999999',
          reason: 'Regular checkup',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Appointment booked successfully.',
    headers: {
      'Content-Type': {
        description: 'Response content type',
        schema: { type: 'string', example: 'application/json' },
      },
    },
    schema: {
      example: {
        success: true,
        message: 'Appointment booked successfully',
        booking: {
          bookingId: 'book-1715678900-abc123',
          doctorId: 'doc-1',
          doctorName: 'Dr. Rajesh Kumar',
          specialization: 'dermatologist',
          date: '2026-05-20',
          time: '10:00',
          patientName: 'John Doe',
          phoneNumber: '919999999999',
          status: 'CONFIRMED',
          reason: 'Regular checkup',
          createdAt: '2026-05-14T09:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Booking failed due to validation or availability issues.',
    headers: {
      'Content-Type': {
        description: 'Response content type',
        schema: { type: 'string', example: 'application/json' },
      },
    },
    schema: {
      example: {
        success: false,
        error: 'Slot not available',
        details: 'The slot at 10:00 on 2026-05-20 is not available or already booked',
      },
    },
  })
  async bookAppointment(
    @Body() dto: BookAppointmentDto,
  ): Promise<HealthcareSuccessResponse | HealthcareErrorResponse> {
    return this.healthcareService.bookAppointment(dto);
  }

  @Post('cancel')
  @ApiOperation({ summary: 'Cancel an existing appointment' })
  @ApiBody({
    type: CancelAppointmentDto,
    examples: {
      example: {
        summary: 'Cancel appointment request',
        value: {
          bookingId: 'book-1715678900-abc123',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Appointment cancelled successfully.',
    headers: {
      'Content-Type': {
        description: 'Response content type',
        schema: { type: 'string', example: 'application/json' },
      },
    },
    schema: {
      example: {
        success: true,
        message: 'Appointment cancelled successfully',
        bookingId: 'book-1715678900-abc123',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Booking not found.',
    headers: {
      'Content-Type': {
        description: 'Response content type',
        schema: { type: 'string', example: 'application/json' },
      },
    },
    schema: {
      example: {
        success: false,
        error: 'Booking not found',
        details: 'No booking found with ID: book-1715678900-abc123',
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  async cancelAppointment(
    @Body() dto: CancelAppointmentDto,
  ): Promise<HealthcareSuccessResponse | HealthcareErrorResponse> {
    return this.healthcareService.cancelAppointment(dto);
  }

  @Post('reschedule')
  @ApiOperation({ summary: 'Reschedule an existing appointment' })
  @ApiBody({
    type: RescheduleAppointmentDto,
    examples: {
      example: {
        summary: 'Reschedule appointment request',
        value: {
          bookingId: 'book-1715678900-abc123',
          newDate: '2026-05-21',
          newTime: '14:00',
          reason: 'Schedule conflict',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Appointment rescheduled successfully.',
    headers: {
      'Content-Type': {
        description: 'Response content type',
        schema: { type: 'string', example: 'application/json' },
      },
    },
    schema: {
      example: {
        success: true,
        message: 'Appointment rescheduled successfully',
        booking: {
          bookingId: 'book-1715678901-def456',
          doctorId: 'doc-1',
          doctorName: 'Dr. Rajesh Kumar',
          specialization: 'dermatologist',
          date: '2026-05-21',
          time: '14:00',
          patientName: 'John Doe',
          phoneNumber: '919999999999',
          status: 'CONFIRMED',
          reason: 'Schedule conflict',
          createdAt: '2026-05-14T09:05:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Reschedule failed due to validation or availability issues.',
    headers: {
      'Content-Type': {
        description: 'Response content type',
        schema: { type: 'string', example: 'application/json' },
      },
    },
    schema: {
      example: {
        success: false,
        error: 'New slot not available',
        details: 'The slot at 14:00 on 2026-05-21 is not available or already booked',
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  async rescheduleAppointment(
    @Body() dto: RescheduleAppointmentDto,
  ): Promise<HealthcareSuccessResponse | HealthcareErrorResponse> {
    return this.healthcareService.rescheduleAppointment(dto);
  }

  @Post('availability')
  @ApiOperation({ summary: 'Check doctor availability for a specific date' })
  @ApiBody({
    type: CheckAvailabilityDto,
    examples: {
      byDoctorId: {
        summary: 'Check availability by doctor ID',
        value: {
          doctorId: 'doc-1',
          date: '2026-05-20',
        },
      },
      bySpecialization: {
        summary: 'Check availability by specialization',
        value: {
          specialization: 'dermatologist',
          date: '2026-05-20',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Availability retrieved successfully.',
    headers: {
      'Content-Type': {
        description: 'Response content type',
        schema: { type: 'string', example: 'application/json' },
      },
    },
    schema: {
      example: {
        success: true,
        message: 'Availability retrieved successfully',
        availability: {
          doctorId: 'doc-1',
          doctorName: 'Dr. Rajesh Kumar',
          specialization: 'dermatologist',
          date: '2026-05-20',
          slotDuration: 30,
          availableSlots: [
            { startTime: '09:00', endTime: '09:30', available: true },
            { startTime: '09:30', endTime: '10:00', available: true },
            { startTime: '10:00', endTime: '10:30', available: true },
          ],
          totalSlots: 8,
          dailyBookingLimit: 10,
          bookedSlots: 2,
          isUnavailable: false,
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Doctor not found.',
    headers: {
      'Content-Type': {
        description: 'Response content type',
        schema: { type: 'string', example: 'application/json' },
      },
    },
    schema: {
      example: {
        success: false,
        error: 'Doctor not found',
        details: 'No doctor found with ID: doc-999',
      },
    },
  })
  async checkAvailability(
    @Body() dto: CheckAvailabilityDto,
  ): Promise<HealthcareSuccessResponse | HealthcareErrorResponse> {
    return this.healthcareService.checkAvailability(dto);
  }

  @Post('suggest-slots')
  @ApiOperation({ summary: 'Suggest alternate slots when preferred slot is unavailable' })
  @ApiBody({
    type: SuggestSlotsDto,
    examples: {
      example: {
        summary: 'Suggest alternate slots request',
        value: {
          doctorId: 'doc-1',
          preferredDate: '2026-05-20',
          preferredTime: '10:00',
          limit: '3',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Alternate slots suggested successfully.',
    headers: {
      'Content-Type': {
        description: 'Response content type',
        schema: { type: 'string', example: 'application/json' },
      },
    },
    schema: {
      example: {
        success: true,
        message: 'Alternate slots suggested successfully',
        suggestedSlots: [
          { startTime: '09:00', endTime: '09:30', available: true },
          { startTime: '14:00', endTime: '14:30', available: true },
          { startTime: '14:30', endTime: '15:00', available: true },
        ],
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Doctor not found.',
    headers: {
      'Content-Type': {
        description: 'Response content type',
        schema: { type: 'string', example: 'application/json' },
      },
    },
    schema: {
      example: {
        success: false,
        error: 'Doctor not found',
        details: 'No doctor found with ID: doc-999',
      },
    },
  })
  async suggestAlternateSlots(
    @Body() dto: SuggestSlotsDto,
  ): Promise<HealthcareSuccessResponse | HealthcareErrorResponse> {
    return this.healthcareService.suggestAlternateSlots(dto);
  }
}
