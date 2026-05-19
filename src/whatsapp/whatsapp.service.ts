import { Injectable, Logger, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { IWhatsAppProvider } from './providers/whatsapp-provider.interface';
import { WhatsAppProviderFactory } from './providers/whatsapp-provider.factory';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly primaryProvider: IWhatsAppProvider;
  private readonly fallbackProvider: IWhatsAppProvider;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 1000;
  private readonly STATE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
  private readonly signupStates = new Map<string, { createdAt: Date; expiresAt: Date }>();

  constructor(private providerFactory: WhatsAppProviderFactory) {
    this.primaryProvider = this.providerFactory.createProvider();
    this.fallbackProvider = this.providerFactory.createFallbackProvider();
    this.logger.log(`WhatsappService initialized with primary provider: ${this.primaryProvider.getProviderName()}`);
    this.logger.log(`WhatsappService initialized with fallback provider: ${this.fallbackProvider.getProviderName()}`);
  }

  async sendMessage(to: string, message?: string, template?: any) {
    this.logger.log(`[WhatsappService] Sending message to ${to}`);
    try {
      const result = await this.sendMessageWithRetry(to, message, template);
      this.logger.log(`[WhatsappService] Message sent successfully: ${result.messageId}`);
      return result;
    } catch (error) {
      this.logger.error(`[WhatsappService] Failed to send message: ${error.message}`);
      throw new InternalServerErrorException('Failed to send message');
    }
  }

  private async sendMessageWithRetry(
    to: string,
    message?: string,
    template?: any,
  ): Promise<any> {
    // Try primary provider with retries
    try {
      const primaryResult = await this.sendWithRetry(
        this.primaryProvider,
        to,
        message,
        template,
        false,
      );
      return primaryResult;
    } catch (primaryError) {
      this.logger.log(`[WhatsappService] Primary provider failed after all retries, switching to fallback provider`);
      
      // Try fallback provider with retries
      try {
        const fallbackResult = await this.sendWithRetry(
          this.fallbackProvider,
          to,
          message,
          template,
          true,
        );
        return fallbackResult;
      } catch (fallbackError) {
        this.logger.error(`[WhatsappService] Both primary and fallback providers failed`);
        throw new Error('Failed to send message after all retries with both providers');
      }
    }
  }

  private async sendWithRetry(
    provider: IWhatsAppProvider,
    to: string,
    message?: string,
    template?: any,
    isFallback: boolean = false,
    retryCount: number = 0,
  ): Promise<any> {
    const providerName = provider.getProviderName();
    this.logger.log(
      `[WhatsappService] Attempt ${retryCount + 1}/${this.MAX_RETRIES} | Provider: ${providerName} | Fallback: ${isFallback}`,
    );

    try {
      const result = await provider.sendMessage({
        to,
        message,
        template,
        retryCount,
        fallbackAttempt: isFallback,
      });

      if (result.success) {
        this.logger.log(
          `[WhatsappService] Message sent successfully via ${providerName} | messageId: ${result.messageId}`,
        );
        return {
          ...result,
          provider: providerName,
          retryCount,
          fallbackAttempt: isFallback,
        };
      }

      this.logger.warn(
        `[WhatsappService] Send failed via ${providerName} | error: ${result.error} | failureReason: ${result.failureReason}`,
      );

      // Retry if we haven't exhausted retries
      if (retryCount < this.MAX_RETRIES - 1) {
        const delay = result.retryMetadata?.nextRetryIn || this.RETRY_DELAY_MS;
        this.logger.log(`[WhatsappService] Retrying in ${delay}ms...`);
        await this.sleep(delay);
        return this.sendWithRetry(provider, to, message, template, isFallback, retryCount + 1);
      }

      // All retries exhausted for this provider
      throw new Error(result.error || `Failed to send message via ${providerName} after ${this.MAX_RETRIES} retries`);
    } catch (error) {
      this.logger.error(`[WhatsappService] Error in sendWithRetry: ${error.message}`);
      
      // Retry if we haven't exhausted retries
      if (retryCount < this.MAX_RETRIES - 1) {
        this.logger.log(`[WhatsappService] Retrying due to exception...`);
        await this.sleep(this.RETRY_DELAY_MS);
        return this.sendWithRetry(provider, to, message, template, isFallback, retryCount + 1);
      }

      throw error;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async startSignup(options?: any) {
    this.logger.log('[WhatsappService] Starting signup flow');
    try {
      // Generate unique state
      const state = `signup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const createdAt = new Date();
      const expiresAt = new Date(createdAt.getTime() + this.STATE_EXPIRY_MS);

      // Store state with expiry
      this.signupStates.set(state, { createdAt, expiresAt });
      this.logger.log(`[WhatsappService] Created signup state: ${state} | expiresAt: ${expiresAt.toISOString()}`);

      // Pass state to provider
      const result = await this.primaryProvider.startSignup({ ...options, state });
      this.logger.log(`[WhatsappService] Signup started: ${result.success}`);
      return result;
    } catch (error) {
      this.logger.error(`[WhatsappService] Failed to start signup: ${error.message}`);
      throw new InternalServerErrorException('Failed to start signup');
    }
  }

  async handleCallback(code: string, state?: string) {
    this.logger.log(`[WhatsappService] Handling callback with code: ${code}, state: ${state}`);
    
    // Validate state
    if (!state) {
      this.logger.error('[WhatsappService] Callback missing state parameter');
      throw new BadRequestException('Missing state parameter');
    }

    const stateRecord = this.signupStates.get(state);
    
    if (!stateRecord) {
      this.logger.error(`[WhatsappService] Unknown state: ${state}`);
      throw new BadRequestException('Invalid or expired state');
    }

    // Check if state has expired
    const now = new Date();
    if (now > stateRecord.expiresAt) {
      this.logger.error(`[WhatsappService] State expired: ${state} | expiresAt: ${stateRecord.expiresAt.toISOString()}`);
      this.signupStates.delete(state);
      throw new BadRequestException('State has expired');
    }

    this.logger.log(`[WhatsappService] State validated: ${state}`);

    try {
      const result = await this.primaryProvider.handleCallback(code, state);
      
      // Delete state after successful callback to prevent reuse
      this.signupStates.delete(state);
      this.logger.log(`[WhatsappService] State deleted after successful callback: ${state}`);
      
      this.logger.log(`[WhatsappService] Callback handled: ${result.success}`);
      return result;
    } catch (error) {
      this.logger.error(`[WhatsappService] Failed to handle callback: ${error.message}`);
      throw new InternalServerErrorException('Failed to handle callback');
    }
  }

  async verifyWebhook(mode: string, token: string, challenge: string) {
    this.logger.log(`[WhatsappService] Verifying webhook - mode: ${mode}, token: ${token}, challenge: ${challenge}`);
    try {
      const result = await this.primaryProvider.verifyWebhook(mode, token, challenge);
      if (result.error) {
        this.logger.warn(`[WhatsappService] Webhook verification failed: ${result.error} | Provider: ${this.primaryProvider.getProviderName()}`);
      } else {
        this.logger.log(`[WhatsappService] Webhook verification successful | Provider: ${this.primaryProvider.getProviderName()}`);
      }
      return result;
    } catch (error) {
      this.logger.error(`[WhatsappService] Failed to verify webhook: ${error.message}`);
      throw new InternalServerErrorException('Failed to verify webhook');
    }
  }

  async handleWebhook(payload: any) {
    this.logger.log('[WhatsappService] Handling webhook payload');
    this.logger.debug(`[WhatsappService] Payload: ${JSON.stringify(payload)}`);
    try {
      const result = await this.primaryProvider.handleWebhook(payload);
      this.logger.log(`[WhatsappService] Webhook handled: ${result.success}`);
      return result;
    } catch (error) {
      this.logger.error(`[WhatsappService] Failed to handle webhook: ${error.message}`);
      throw new InternalServerErrorException('Failed to handle webhook');
    }
  }

  getProviderName(): string {
    return this.primaryProvider.getProviderName();
  }
}
