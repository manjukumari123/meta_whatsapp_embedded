import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SignupCallbackDto {
  @ApiProperty({
    example: 'auth_code_123',
    description: 'Authorization code returned by Meta after signup',
  })
  code: string;

  @ApiPropertyOptional({
    example: 'state-abc-123',
    description: 'Optional state value to verify callback integrity',
  })
  state?: string;
}
