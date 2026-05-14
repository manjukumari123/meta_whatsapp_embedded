import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateAppointmentDto {
  @ApiProperty({ example: 'Manju Kumari' })
  @IsString()
  @IsNotEmpty()
  patientName: string;

  @ApiProperty({ example: '919999999999' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({ example: '2026-05-15' })
  @IsString()
  @IsNotEmpty()
  appointmentDate: string;

  @ApiProperty({ example: 'Dr. Jatin Das' })
  @IsString()
  @IsNotEmpty()
  doctorName: string;

  @ApiProperty({ example: '10:30 AM' })
  @IsString()
  @IsNotEmpty()
  appointmentTime: string;

  @ApiProperty({ example: 'BMR Hospital' })
  @IsString()
  @IsNotEmpty()
  hospitalName: string;
}
