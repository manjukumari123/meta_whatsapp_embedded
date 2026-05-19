import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsDateString, Matches, IsOptional } from 'class-validator';

export class BookAppointmentDto {
  @ApiProperty({
    example: 'doc-1',
    description: 'Doctor ID to book appointment with (optional if specialization is provided)',
    required: false,
  })
  @IsString()
  @IsOptional()
  doctorId?: string;

  @ApiProperty({
    example: 'dermatologist',
    description: 'Doctor specialization (optional if doctorId is provided)',
    required: false,
  })
  @IsString()
  @IsOptional()
  specialization?: string;

  @ApiProperty({
    example: '2026-05-20',
    description: 'Appointment date in YYYY-MM-DD format',
  })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({
    example: '10:00',
    description: 'Appointment time in HH:MM format (24-hour)',
  })
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Time must be in HH:MM format (24-hour)',
  })
  @IsString()
  @IsNotEmpty()
  time: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'Patient name',
  })
  @IsString()
  @IsNotEmpty()
  patientName: string;

  @ApiProperty({
    example: '919999999999',
    description: 'Patient phone number',
  })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({
    example: 'Regular checkup',
    description: 'Reason for appointment (optional)',
    required: false,
  })
  @IsString()
  reason?: string;
}
