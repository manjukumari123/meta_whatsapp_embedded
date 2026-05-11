import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { IWhatsAppProvider } from './providers/whatsapp-provider.interface';
import { WhatsAppProviderFactory } from './providers/whatsapp-provider.factory';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly provider: IWhatsAppProvider;

  constructor(private providerFactory: WhatsAppProviderFactory) {
    this.provider = this.providerFactory.createProvider();
    this.logger.log(`WhatsappService initialized with provider: ${this.provider.getProviderName()}`);
  }

  async sendMessage(to: string, message: string) {
    this.logger.log(`[WhatsappService] Sending message to ${to}`);
    try {
      const result = await this.provider.sendMessage({ to, message });
      this.logger.log(`[WhatsappService] Message sent successfully: ${result.messageId}`);
      return result;
    } catch (error) {
      this.logger.error(`[WhatsappService] Failed to send message: ${error.message}`);
      throw new InternalServerErrorException('Failed to send message');
    }
  }

  async startSignup() {
    this.logger.log('[WhatsappService] Starting signup flow');
    try {
      const result = await this.provider.startSignup();
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
      const result = await this.provider.handleCallback(code, state);
      this.logger.log(`[WhatsappService] Callback handled: ${result.success}`);
      return result;
    } catch (error) {
      this.logger.error(`[WhatsappService] Failed to handle callback: ${error.message}`);
      throw new InternalServerErrorException('Failed to handle callback');
    }
  }

  async verifyWebhook(mode: string, token: string, challenge: string) {
    this.logger.log(`[WhatsappService] Verifying webhook - mode: ${mode}, token: ${token}`);
    try {
      const result = await this.provider.verifyWebhook(mode, token, challenge);
      if (result.error) {
        this.logger.warn(`[WhatsappService] Webhook verification failed: ${result.error}`);
      } else {
        this.logger.log('[WhatsappService] Webhook verification successful');
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
      const result = await this.provider.handleWebhook(payload);
      this.logger.log(`[WhatsappService] Webhook handled: ${result.success}`);
      return result;
    } catch (error) {
      this.logger.error(`[WhatsappService] Failed to handle webhook: ${error.message}`);
      throw new InternalServerErrorException('Failed to handle webhook');
    }
  }

  getProviderName(): string {
    return this.provider.getProviderName();
  }
}
