import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsDateString, IsOptional } from 'class-validator';

export class CheckAvailabilityDto {
  @ApiProperty({
    example: 'doc-1',
    description: 'Doctor ID to check availability for (optional if specialization is provided)',
    required: false,
  })
  @IsString()
  @IsOptional()
  doctorId?: string;

  @ApiProperty({
    example: 'dermatologist',
    description: 'Doctor specialization to check availability for (optional if doctorId is provided)',
    required: false,
  })
  @IsString()
  @IsOptional()
  specialization?: string;

  @ApiProperty({
    example: '2026-05-20',
    description: 'Date to check availability in YYYY-MM-DD format',
  })
  @IsDateString()
  @IsNotEmpty()
  date: string;
}
