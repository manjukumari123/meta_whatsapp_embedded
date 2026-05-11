import { Controller, Post, Get, Body, Query, HttpCode, HttpStatus, Res, BadRequestException, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { WhatsappService } from './whatsapp.service';
import { SendMessageDto, SignupStartDto, SignupCallbackDto, WebhookVerificationDto } from './dto';

@Controller('whatsapp')
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  constructor(private readonly whatsappService: WhatsappService) {}

  @Post('send-message')
  async sendMessage(@Body() dto: SendMessageDto) {
    this.logger.log(`[Controller] POST /whatsapp/send-message - to: ${dto.to}`);
    
    if (!dto.to || !dto.message) {
      throw new BadRequestException('to and message are required');
    }

    const result = await this.whatsappService.sendMessage(dto.to, dto.message);
    return result;
  }

  @Post('meta/signup/start')
  async startSignup(@Body() dto: SignupStartDto) {
    this.logger.log('[Controller] POST /whatsapp/meta/signup/start');
    const result = await this.whatsappService.startSignup();
    return result;
  }

  @Post('meta/signup/callback')
  async handleCallback(@Body() dto: SignupCallbackDto) {
    this.logger.log(`[Controller] POST /whatsapp/meta/signup/callback - code: ${dto.code}`);
    
    if (!dto.code) {
      throw new BadRequestException('code is required');
    }

    const result = await this.whatsappService.handleCallback(dto.code, dto.state);
    return result;
  }

  @Get('meta/webhook')
  async verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    this.logger.log(`[Controller] GET /whatsapp/meta/webhook - mode: ${mode}, token: ${token}`);
    
    if (!mode || !token || !challenge) {
      throw new BadRequestException('hub.mode, hub.verify_token, and hub.challenge are required');
    }

    const result = await this.whatsappService.verifyWebhook(mode, token, challenge);
    
    if (result.error) {
      return res.status(HttpStatus.FORBIDDEN).send(result.error);
    }

    return res.status(HttpStatus.OK).send(result.challenge);
  }

  @Post('meta/webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() payload: any) {
    this.logger.log('[Controller] POST /whatsapp/meta/webhook');
    const result = await this.whatsappService.handleWebhook(payload);
    return result;
  }
}
