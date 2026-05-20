import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendTemplateDto {
  @ApiProperty({ example: 'appointment_confirmation' })
  @IsString()
  @IsNotEmpty()
  templateName: string;

  @ApiProperty({ example: 'Manju Kumari' })
  @IsString()
  @IsNotEmpty()
  patientName: string;

  @ApiProperty({ example: 'Dr. Jatin Das' })
  @IsString()
  @IsNotEmpty()
  doctorName: string;

  @ApiProperty({ example: '2026-05-15' })
  @IsString()
  @IsNotEmpty()
  appointmentDate: string;

  @ApiProperty({ example: '10:30 AM' })
  @IsString()
  @IsNotEmpty()
  appointmentTime: string;

  @ApiProperty({ example: 'BMR Hospital' })
  @IsString()
  @IsNotEmpty()
  hospitalName: string;

  @ApiProperty({ example: '919999999999' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiPropertyOptional({ example: 'en_US', description: 'Optional template language code' })
  @IsString()
  @IsOptional()
  templateLanguage?: string;
}
