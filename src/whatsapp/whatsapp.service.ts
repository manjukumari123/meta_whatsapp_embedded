import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { IWhatsAppProvider } from './providers/whatsapp-provider.interface';
import { WhatsAppProviderFactory } from './providers/whatsapp-provider.factory';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly primaryProvider: IWhatsAppProvider;
  private readonly fallbackProvider: IWhatsAppProvider;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 1000;

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
    retryCount: number = 0,
  ): Promise<any> {
    const provider = retryCount >= this.MAX_RETRIES ? this.fallbackProvider : this.primaryProvider;
    const isFallbackAttempt = retryCount >= this.MAX_RETRIES;

    this.logger.log(
      `[WhatsappService] Attempt ${retryCount + 1}/${this.MAX_RETRIES + 1} | Provider: ${provider.getProviderName()} | Fallback: ${isFallbackAttempt}`,
    );

    try {
      const result = await provider.sendMessage({
        to,
        message,
        template,
        retryCount,
        fallbackAttempt: isFallbackAttempt,
      });

      if (result.success) {
        this.logger.log(
          `[WhatsappService] Message sent successfully via ${provider.getProviderName()} | messageId: ${result.messageId}`,
        );
        return {
          ...result,
          provider: provider.getProviderName(),
          retryCount,
          fallbackAttempt: isFallbackAttempt,
        };
      }

      this.logger.warn(
        `[WhatsappService] Send failed via ${provider.getProviderName()} | error: ${result.error} | failureReason: ${result.failureReason}`,
      );

      // Check if we should retry
      if (retryCount < this.MAX_RETRIES && result.retryMetadata) {
        const delay = result.retryMetadata.nextRetryIn || this.RETRY_DELAY_MS;
        this.logger.log(`[WhatsappService] Retrying in ${delay}ms...`);
        await this.sleep(delay);
        return this.sendMessageWithRetry(to, message, template, retryCount + 1);
      }

      // If primary provider failed after retries, try fallback
      if (retryCount < this.MAX_RETRIES) {
        this.logger.log(`[WhatsappService] Primary provider exhausted, switching to fallback provider`);
        await this.sleep(this.RETRY_DELAY_MS);
        return this.sendMessageWithRetry(to, message, template, this.MAX_RETRIES);
      }

      // All attempts failed
      throw new Error(result.error || 'Failed to send message after all retries and fallback');
    } catch (error) {
      this.logger.error(`[WhatsappService] Error in sendMessageWithRetry: ${error.message}`);
      
      // If not a max retry scenario, retry
      if (retryCount < this.MAX_RETRIES) {
        this.logger.log(`[WhatsappService] Retrying due to exception...`);
        await this.sleep(this.RETRY_DELAY_MS);
        return this.sendMessageWithRetry(to, message, template, retryCount + 1);
      }

      // If primary failed, try fallback
      if (retryCount < this.MAX_RETRIES) {
        this.logger.log(`[WhatsappService] Primary provider exhausted due to exception, switching to fallback`);
        await this.sleep(this.RETRY_DELAY_MS);
        return this.sendMessageWithRetry(to, message, template, this.MAX_RETRIES);
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
      const result = await this.primaryProvider.startSignup(options);
      this.logger.log(`[WhatsappService] Signup started: ${result.success}`);
      return result;
    } catch (error) {
      this.logger.error(`[WhatsappService] Failed to start signup: ${error.message}`);
      throw new InternalServerErrorException('Failed to start signup');
    }
  }

  async handleCallback(code: string, state?: string) {
    this.logger.log(`[WhatsappService] Handling callback with code: ${code}`);
    try {
      const result = await this.primaryProvider.handleCallback(code, state);
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
