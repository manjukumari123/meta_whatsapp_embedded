import { ApiProperty } from '@nestjs/swagger';

export class WebhookVerificationDto {
  @ApiProperty({
    example: 'subscribe',
    description: 'Webhook mode used by Meta during verification',
  })
  'hub.mode': string;

  @ApiProperty({
    example: 'mock_verify_token',
    description: 'Verification token to confirm webhook setup',
  })
  'hub.verify_token': string;

  @ApiProperty({
    example: 'challenge-abc-123',
    description: 'Challenge string to be echoed back during verification',
  })
  'hub.challenge': string;
}
