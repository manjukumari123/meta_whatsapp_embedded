import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsDateString, Matches } from 'class-validator';

export class RescheduleAppointmentDto {
  @ApiProperty({
    example: 'booking-123',
    description: 'Booking ID to reschedule',
  })
  @IsString()
  @IsNotEmpty()
  bookingId: string;

  @ApiProperty({
    example: '2026-05-21',
    description: 'New appointment date in YYYY-MM-DD format',
  })
  @IsDateString()
  @IsNotEmpty()
  newDate: string;

  @ApiProperty({
    example: '14:00',
    description: 'New appointment time in HH:MM format (24-hour)',
  })
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Time must be in HH:MM format (24-hour)',
  })
  @IsString()
  @IsNotEmpty()
  newTime: string;

  @ApiProperty({
    example: 'Schedule conflict',
    description: 'Reason for rescheduling (optional)',
    required: false,
  })
  @IsString()
  reason?: string;
}
