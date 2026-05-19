import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsappService } from '../../whatsapp.service';
import { WebhookEventDto } from './dto/webhook-event.dto';

@Injectable()
export class MetaService {
  private readonly logger = new Logger(MetaService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly whatsappService: WhatsappService,
  ) {}

  async startSignup(body: {
    businessId?: string;
    businessName?: string;
    phoneNumber?: string;
  }) {
    this.logger.log('[MetaService] Delegating to WhatsappService for signup start');
    return this.whatsappService.startSignup(body);
  }

  async signupCallback(body: { code?: string; state?: string; fail?: boolean; errorCode?: string }) {
    this.logger.log('[MetaService] Delegating to WhatsappService for signup callback');
    
    // Handle mock failure mode for testing
    if (body.fail) {
      return {
        success: false,
        errorCode: body.errorCode ?? 'ACCESS_DENIED',
        message: 'Mock signup failed',
      };
    }

    if (!body.code) {
      throw new BadRequestException('code is required');
    }

    return this.whatsappService.handleCallback(body.code, body.state);
  }

  verifyWebhook(query: Record<string, string>) {
    this.logger.log('[MetaService] Delegating to WhatsappService for webhook verification');
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];
    return this.whatsappService.verifyWebhook(mode, token, challenge);
  }

  handleWebhook(
    payload: WebhookEventDto,
    signature: string | string[],
    rawBody: Buffer | string,
  ) {
    this.logger.log('[MetaService] Delegating to WhatsappService for webhook handling');
    
    // Validate signature if app secret is configured
    const appSecret = this.configService.get<string>('META_APP_SECRET');
    if (appSecret && rawBody) {
      const crypto = require('crypto');
      const raw = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
      const expectedSignature = `sha256=${crypto
        .createHmac('sha256', appSecret)
        .update(raw)
        .digest('hex')}`;

      const actualSignature = Array.isArray(signature) ? signature[0] : signature;
      if (!actualSignature || actualSignature !== expectedSignature) {
        this.logger.warn('Meta webhook payload signature mismatch');
        throw new BadRequestException('Invalid webhook signature');
      }
    }

    return this.whatsappService.handleWebhook(payload);
  }
}
