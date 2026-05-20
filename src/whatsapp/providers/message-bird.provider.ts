import { Injectable, Logger } from '@nestjs/common';
import {
  IWhatsAppProvider,
  SendMessageDto,
  SignupStartResponse,
  SignupCallbackResponse,
  WebhookVerificationResponse,
  ProviderSendResponse,
} from './whatsapp-provider.interface';

@Injectable()
export class MessageBirdProvider implements IWhatsAppProvider {
  private readonly logger = new Logger(MessageBirdProvider.name);

  async sendMessage(dto: SendMessageDto): Promise<ProviderSendResponse> {
    this.logger.log(
      `[MessageBird] Sending message to ${dto.to} | retryCount: ${dto.retryCount ?? 0} | fallbackAttempt: ${dto.fallbackAttempt ?? false}`,
    );

    const payload = dto.template
      ? {
          to: dto.to,
          type: 'hsm',
          hsm: {
            namespace: 'default_messagebird_namespace',
            templateName: dto.template.name,
            language: {
              policy: 'deterministic',
              code: dto.template.language.code,
            },
            components: dto.template.components,
          },
        }
      : {
          to: dto.to,
          type: 'text',
          content: {
            text: dto.message,
          },
        };

    this.logger.debug(`[MessageBird] Prepared payload: ${JSON.stringify(payload)}`);

    const sentAt = new Date().toISOString();
    const attempt = dto.retryCount ?? 0;
    const MAX_RETRIES = 3;

    // Stub implementation - returns mock success with realistic response
    return {
      success: true,
      messageId: `msg_bird_${Date.now()}_${dto.to}`,
      providerStatus: 'SENT',
      sentAt,
      retryMetadata: attempt > 0 ? {
        attempt: attempt + 1,
        maxRetries: MAX_RETRIES,
      } : undefined,
    };
  }

  async startSignup(options?: any): Promise<SignupStartResponse> {
    this.logger.log('[MessageBird] Starting signup flow');
    
    const businessId = options?.businessId ?? 'mock-business-123';
    const businessName = options?.businessName ?? 'Test Clinic';
    const phoneNumber = options?.phoneNumber ?? '919999999999';
    const state = `mock-state-${Date.now()}`;
    
    // Stub implementation - returns mock signup URL and redirect
    return {
      success: true,
      signupUrl: `https://messagebird.com/mock-signup?state=${state}`,
      redirectUrl: 'https://messagebird.com/mock-signup',
      state,
      businessId,
      businessName,
      phoneNumber,
      expiresIn: 600,
      instructions: 'Redirect the business user to signupUrl to begin onboarding.',
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
