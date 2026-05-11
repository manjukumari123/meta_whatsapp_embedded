import { Injectable, Logger } from '@nestjs/common';
import {
  IWhatsAppProvider,
  SendMessageDto,
  SignupStartResponse,
  SignupCallbackResponse,
  WebhookVerificationResponse,
} from './whatsapp-provider.interface';

@Injectable()
export class MessageBirdProvider implements IWhatsAppProvider {
  private readonly logger = new Logger(MessageBirdProvider.name);

  async sendMessage(dto: SendMessageDto): Promise<{ success: boolean; messageId?: string; error?: string }> {
    this.logger.log(`[MessageBird] Sending message to ${dto.to}`);
    // Stub implementation - returns mock success
    return {
      success: true,
      messageId: `msg_bird_${Date.now()}`,
    };
  }

  async startSignup(): Promise<SignupStartResponse> {
    this.logger.log('[MessageBird] Starting signup flow');
    // Stub implementation - returns mock redirect URL
    return {
      success: true,
      redirectUrl: 'https://messagebird.com/mock-signup',
    };
  }

  async handleCallback(code: string, state?: string): Promise<SignupCallbackResponse> {
    this.logger.log(`[MessageBird] Handling callback with code: ${code}`);
    // Stub implementation - returns mock credentials
    return {
      success: true,
      businessId: 'mock_messagebird_business_123',
      wabaId: 'mock_messagebird_waba_123',
      phoneNumberId: 'mock_messagebird_phone_123',
      accessToken: 'mock_messagebird_token_123',
    };
  }

  async verifyWebhook(mode: string, token: string, challenge: string): Promise<WebhookVerificationResponse> {
    this.logger.log(`[MessageBird] Verifying webhook - mode: ${mode}`);
    // Stub implementation - accepts any verification
    return {
      challenge,
    };
  }

  async handleWebhook(payload: any): Promise<{ success: boolean; error?: string }> {
    this.logger.log(`[MessageBird] Handling webhook payload`);
    // Stub implementation
    return {
      success: true,
    };
  }

  getProviderName(): string {
    return 'MessageBird';
  }
}
