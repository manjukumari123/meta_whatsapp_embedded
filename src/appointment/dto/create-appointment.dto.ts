import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAppointmentDto {
  @ApiProperty({ example: 'Manju Kumari' })
  @IsString()
  @IsNotEmpty()
  patientName: string;

  @ApiProperty({ example: '919999999999' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{10,15}$/, {
    message: 'phoneNumber must be 10-15 digits, no spaces or symbols',
  })
  phoneNumber: string;

  @ApiProperty({ example: '2026-05-15' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'appointmentDate must be in YYYY-MM-DD format',
  })
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
