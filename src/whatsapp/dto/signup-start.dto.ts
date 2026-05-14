import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SignupStartDto {
  @ApiPropertyOptional({
    example: 'https://app.example.com/oauth/callback',
    description: 'Optional redirect URI for Meta onboarding completion',
  })
  @IsOptional()
  @IsString()
  redirectUri?: string;

  @ApiPropertyOptional({
    example: 'mock-business-123',
    description: 'Business ID to onboard',
  })
  @IsOptional()
  @IsString()
  businessId?: string;

  @ApiPropertyOptional({
    example: 'Test Clinic',
    description: 'Business name',
  })
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiPropertyOptional({
    example: '919999999999',
    description: 'WhatsApp phone number to link',
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string;
}
