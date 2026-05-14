import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class DeliveryStatusDto {
  @ApiProperty({ example: 'meta-tmpl-abc-123' })
  @IsString()
  @IsNotEmpty()
  messageId: string;

  @ApiProperty({ example: 'DELIVERED' })
  @IsString()
  @IsNotEmpty()
  status: string;

  @ApiProperty({ example: null })
  @IsOptional()
  @IsString()
  failureReason?: string | null;
}
