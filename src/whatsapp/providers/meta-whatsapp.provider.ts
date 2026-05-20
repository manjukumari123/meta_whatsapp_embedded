import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IWhatsAppProvider,
  SendMessageDto,
  SignupStartResponse,
  SignupCallbackResponse,
  WebhookVerificationResponse,
  ProviderSendResponse,
} from './whatsapp-provider.interface';

@Injectable()
export class MetaWhatsAppProvider implements IWhatsAppProvider {
  private readonly logger = new Logger(MetaWhatsAppProvider.name);
  private readonly mockMode: boolean;
  private readonly verifyToken: string;
  private readonly mockBusinessId: string;
  private readonly mockWabaId: string;
  private readonly mockPhoneNumberId: string;
  private readonly mockAccessToken: string;

  constructor(private configService: ConfigService) {
    this.mockMode = this.configService.get<string>('META_MOCK_MODE', 'true') === 'true';
    this.verifyToken = this.configService.get<string>('META_VERIFY_TOKEN', 'mock_verify_token_123');
    this.mockBusinessId = this.configService.get<string>('META_BUSINESS_ID', 'mock_business_123');
    this.mockWabaId = this.configService.get<string>('META_WABA_ID', 'mock_waba_123');
    this.mockPhoneNumberId = this.configService.get<string>('META_PHONE_NUMBER_ID', 'mock_phone_123');
    this.mockAccessToken = this.configService.get<string>('META_ACCESS_TOKEN', 'mock_meta_access_token');
  }

  async sendMessage(dto: SendMessageDto): Promise<ProviderSendResponse> {
    this.logger.log(
      `[MetaWhatsApp] Sending message to ${dto.to} | retryCount: ${dto.retryCount ?? 0} | fallbackAttempt: ${dto.fallbackAttempt ?? false}`,
    );

    const payload = dto.template
      ? {
          messaging_product: 'whatsapp',
          to: dto.to,
          type: 'template',
          template: {
            name: dto.template.name,
            language: dto.template.language,
            components: dto.template.components,
          },
        }
      : {
          messaging_product: 'whatsapp',
          to: dto.to,
          type: 'text',
          text: {
            body: dto.message,
          },
        };

    this.logger.debug(`[MetaWhatsApp] Prepared payload: ${JSON.stringify(payload)}`);

    const sentAt = new Date().toISOString();
    const attempt = dto.retryCount ?? 0;
    const MAX_RETRIES = 3;

    if (this.mockMode) {
      this.logger.log('[MetaWhatsApp] Using mock mode for send message');
      
      // Simulate occasional failure for testing retry/fallback
      const shouldFail = attempt === 1 && !dto.fallbackAttempt;
      
      if (shouldFail) {
        this.logger.warn('[MetaWhatsApp] Simulating failure for retry testing');
        return {
          success: false,
          error: 'Rate limit exceeded',
          providerStatus: 'FAILED',
          sentAt,
          failureReason: 'RATE_LIMIT_EXCEEDED',
          retryMetadata: {
            attempt: attempt + 1,
            maxRetries: MAX_RETRIES,
            nextRetryIn: 5000,
          },
        };
      }

      return {
        success: true,
        messageId: `wamid.HbL${Date.now()}@${dto.to}`,
        providerStatus: 'SENT',
        sentAt,
        retryMetadata: attempt > 0 ? {
          attempt: attempt + 1,
          maxRetries: MAX_RETRIES,
        } : undefined,
      };
    }

    // Real implementation would call Meta API here
    this.logger.log('[MetaWhatsApp] Real Meta API call would be made here');
    return {
      success: true,
      messageId: `wamid.HbL${Date.now()}@${dto.to}`,
      providerStatus: 'SENT',
      sentAt,
    };
  }

  async startSignup(options?: any): Promise<SignupStartResponse> {
    this.logger.log('[MetaWhatsApp] Starting embedded signup flow');
    
    const businessId = options?.businessId ?? 'mock-business-123';
    const businessName = options?.businessName ?? 'Test Clinic';
    const phoneNumber = options?.phoneNumber ?? '919999999999';
    const state = options?.state ?? `mock-state-${Date.now()}`;
    
    if (this.mockMode) {
      this.logger.log('[MetaWhatsApp] Using mock mode for signup start');
      return {
        success: true,
        signupUrl: `https://www.facebook.com/dialog/oauth?mock=true&state=${state}`,
        redirectUrl: `https://www.facebook.com/v18.0/dialog/oauth?client_id=mock_client_id&redirect_uri=mock_redirect_url&scope=whatsapp_business_management`,
        state,
        businessId,
        businessName,
        phoneNumber,
        expiresIn: 600,
        instructions: 'Redirect the business user to signupUrl to begin onboarding.',
      };
    }

    // Real implementation would call Meta Embedded Signup API
    this.logger.log('[MetaWhatsApp] Real Meta Embedded Signup API call would be made here');
    return {
      success: true,
      signupUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
      redirectUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
      state,
      businessId,
      businessName,
      phoneNumber,
      expiresIn: 600,
      instructions: 'Redirect the business user to signupUrl to begin onboarding.',
    };
  }

  async handleCallback(code: string, state?: string): Promise<SignupCallbackResponse> {
    this.logger.log(`[MetaWhatsApp] Handling callback with code: ${code}, state: ${state}`);
    
    if (this.mockMode) {
      this.logger.log('[MetaWhatsApp] Using mock mode for callback');
      return {
        success: true,
        businessId: this.mockBusinessId,
        wabaId: this.mockWabaId,
        phoneNumberId: this.mockPhoneNumberId,
        accessToken: this.mockAccessToken,
      };
    }

    // Real implementation would exchange code for access token and fetch credentials
    this.logger.log('[MetaWhatsApp] Real Meta token exchange would be made here');
    return {
      success: true,
      businessId: this.mockBusinessId,
      wabaId: this.mockWabaId,
      phoneNumberId: this.mockPhoneNumberId,
      accessToken: this.mockAccessToken,
    };
  }

  async verifyWebhook(mode: string, token: string, challenge: string): Promise<WebhookVerificationResponse> {
    this.logger.log(`[MetaWhatsApp] Verifying webhook - mode: ${mode}, token: ${token}, challenge: ${challenge}`);
    this.logger.debug(`[MetaWhatsApp] Expected verify token: ${this.verifyToken}`);
    
    // Normalize inputs
    const normalizedMode = mode?.trim().toLowerCase();
    const normalizedToken = token?.trim();
    const expectedToken = this.verifyToken?.trim();
    
    this.logger.debug(`[MetaWhatsApp] Mode comparison: "${normalizedMode}" === "subscribe" ? ${normalizedMode === 'subscribe'}`);
    this.logger.debug(`[MetaWhatsApp] Token comparison: "${normalizedToken}" === "${expectedToken}" ? ${normalizedToken === expectedToken}`);
    
    if (normalizedMode === 'subscribe' && normalizedToken === expectedToken) {
      this.logger.log('[MetaWhatsApp] Webhook verification successful');
      return {
        challenge,
      };
    }

    this.logger.warn(`[MetaWhatsApp] Webhook verification failed - mode: ${normalizedMode}, token match: ${normalizedToken === expectedToken}`);
    return {
      error: 'Verification failed',
    };
  }

  async handleWebhook(payload: any): Promise<{ success: boolean; error?: string }> {
    this.logger.log('[MetaWhatsApp] Handling webhook payload');
    this.logger.debug(`[MetaWhatsApp] Payload: ${JSON.stringify(payload)}`);
    
    if (this.mockMode) {
      this.logger.log('[MetaWhatsApp] Using mock mode for webhook handling');
      return {
        success: true,
      };
    }

    // Real implementation would process webhook events
    this.logger.log('[MetaWhatsApp] Real webhook processing would happen here');
    return {
      success: true,
    };
  }

  getProviderName(): string {
    return 'MetaWhatsApp';
  }
}
