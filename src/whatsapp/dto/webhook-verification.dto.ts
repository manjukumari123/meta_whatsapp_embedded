export class WebhookVerificationDto {
  'hub.mode': string;
  'hub.verify_token': string;
  'hub.challenge': string;
}
