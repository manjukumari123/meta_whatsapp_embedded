import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsDateString, Matches, IsOptional } from 'class-validator';

export class SuggestSlotsDto {
  @ApiProperty({
    example: 'doc-1',
    description: 'Doctor ID to suggest alternate slots for',
  })
  @IsString()
  @IsNotEmpty()
  doctorId: string;

  @ApiProperty({
    example: '2026-05-20',
    description: 'Preferred date in YYYY-MM-DD format',
  })
  @IsDateString()
  @IsNotEmpty()
  preferredDate: string;

  @ApiProperty({
    example: '10:00',
    description: 'Preferred time in HH:MM format (24-hour)',
  })
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Time must be in HH:MM format (24-hour)',
  })
  @IsString()
  @IsNotEmpty()
  preferredTime: string;

  @ApiProperty({
    example: 3,
    description: 'Number of alternate slots to suggest (default: 5)',
    required: false,
  })
  @IsString()
  @IsOptional()
  limit?: string;
}
