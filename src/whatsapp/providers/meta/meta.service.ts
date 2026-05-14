import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { WebhookEventDto } from './dto/webhook-event.dto';
import { SignupState } from './entities/signup-state.entity';

@Injectable()
export class MetaService {
  private readonly logger = new Logger(MetaService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(SignupState)
    private readonly signupStateRepo: Repository<SignupState>,
  ) {}

  async startSignup(body: {
    businessId?: string;
    businessName?: string;
    phoneNumber?: string;
  }) {
    const state = `mock-state-${crypto.randomUUID()}`;
    const record = this.signupStateRepo.create({
      state,
      businessId: body.businessId ?? 'mock-business-001',
      businessName: body.businessName ?? 'Mock Business',
      phoneNumber: body.phoneNumber ?? 'mock-phone-number',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    await this.signupStateRepo.save(record);

    this.logger.log(`Created mock signup state for ${record.businessId}`);

    return {
      success: true,
      signupUrl: `https://www.facebook.com/dialog/oauth?mock=true&state=${state}`,
      state,
      businessId: record.businessId,
      businessName: record.businessName,
      phoneNumber: record.phoneNumber,
      expiresIn: 600,
    };
  }

  async signupCallback(body: { fail?: boolean; errorCode?: string }) {
    this.logger.log('Received mock signup callback');

    if (body.fail) {
      return {
        success: false,
        errorCode: body.errorCode ?? 'ACCESS_DENIED',
        message: 'Mock signup failed',
      };
    }

    return {
      success: true,
      message: 'Mock signup completed successfully',
    };
  }

  verifyWebhook(query: Record<string, string>) {
    const verifyToken = this.configService.get<string>('WEBHOOK_VERIFY_TOKEN');
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    if (mode !== 'subscribe' || token !== verifyToken) {
      this.logger.warn('Meta webhook verification failed');
      throw new BadRequestException('Invalid webhook verification request');
    }

    this.logger.log('Meta webhook verification success');
    return challenge;
  }

  handleWebhook(
    payload: WebhookEventDto,
    signature: string | string[],
    rawBody: Buffer | string,
  ) {
    const appSecret = this.configService.get<string>('META_APP_SECRET');

    if (appSecret) {
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

    this.logger.log('Received mock Meta webhook event');
    return {
      success: true,
      received: payload,
    };
  }
}
