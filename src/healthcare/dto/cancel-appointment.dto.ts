import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CancelAppointmentDto {
  @ApiProperty({
    example: 'booking-123',
    description: 'Booking ID to cancel',
  })
  @IsString()
  @IsNotEmpty()
  bookingId: string;
}
