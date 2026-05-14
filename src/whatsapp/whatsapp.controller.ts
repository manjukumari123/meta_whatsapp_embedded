import { Controller, Post, Get, Body, Query, HttpCode, HttpStatus, Res, BadRequestException, Logger } from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { WhatsappService } from './whatsapp.service';
import { SendMessageDto, SignupStartDto, SignupCallbackDto } from './dto';

@ApiTags('whatsapp')
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
  @ApiOperation({ summary: 'Start Meta signup flow', description: 'Initiates Meta Embedded Signup for WhatsApp onboarding.' })
  @ApiBody({
    type: SignupStartDto,
    examples: {
      start: {
        summary: 'Start signup request with business details',
        value: {
          businessId: 'mock-business-123',
          businessName: 'Test Clinic',
          phoneNumber: '919999999999',
          redirectUri: 'https://app.example.com/oauth/callback',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Returns signup URL and business details for Meta onboarding.',
    headers: {
      'Content-Type': {
        description: 'Response content type',
        schema: { type: 'string', example: 'application/json' },
      },
    },
    schema: {
      example: {
        success: true,
        signupUrl: 'https://www.facebook.com/dialog/oauth?mock=true&state=mock-state-1715678900000',
        redirectUrl:
          'https://www.facebook.com/v18.0/dialog/oauth?client_id=mock_client_id&redirect_uri=mock_redirect_url&scope=whatsapp_business_management',
        state: 'mock-state-1715678900000',
        businessId: 'mock-business-123',
        businessName: 'Test Clinic',
        phoneNumber: '919999999999',
        expiresIn: 600,
        instructions: 'Redirect the business user to signupUrl to begin onboarding.',
      },
    },
  })
  async startSignup(@Body() dto: SignupStartDto) {
    this.logger.log('[Controller] POST /whatsapp/meta/signup/start');
    const result = await this.whatsappService.startSignup(dto);
    return result;
  }

  @Post('meta/signup/callback')
  @ApiOperation({ summary: 'Handle Meta signup callback', description: 'Processes the callback after Meta onboarding completes.' })
  @ApiBody({
    type: SignupCallbackDto,
    examples: {
      success: {
        summary: 'Successful signup callback',
        value: {
          code: 'auth_code_123',
          state: 'state-abc-123',
        },
      },
      failure: {
        summary: 'Failed signup callback',
        value: {
          code: 'auth_code_123',
          state: 'state-abc-123',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Returns Meta onboarding credentials on success.',
    headers: {
      'Content-Type': {
        description: 'Response content type',
        schema: { type: 'string', example: 'application/json' },
      },
    },
    schema: {
      example: {
        success: true,
        businessId: 'mock_business_123',
        wabaId: 'mock_waba_123',
        phoneNumberId: 'mock_phone_123',
        accessToken: 'mock_meta_access_token',
      },
    },
  })
  async handleCallback(@Body() dto: SignupCallbackDto) {
    this.logger.log(`[Controller] POST /whatsapp/meta/signup/callback - code: ${dto.code}`);
    
    if (!dto.code) {
      throw new BadRequestException('code is required');
    }

    const result = await this.whatsappService.handleCallback(dto.code, dto.state);
    return result;
  }

  @Get('meta/webhook')
  @ApiOperation({ summary: 'Verify Meta webhook', description: 'Handles Meta webhook verification handshake.' })
  @ApiQuery({ name: 'hub.mode', required: true, example: 'subscribe' })
  @ApiQuery({ name: 'hub.verify_token', required: true, example: 'mock_verify_token_123' })
  @ApiQuery({ name: 'hub.challenge', required: true, example: 'challenge-abc-123' })
  @ApiResponse({
    status: 200,
    description: 'Returns the challenge string when verification is successful.',
    headers: {
      'Content-Type': {
        description: 'Response content type',
        schema: { type: 'string', example: 'text/plain' },
      },
    },
    schema: {
      example: 'challenge-abc-123',
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden when verification fails.',
    headers: {
      'Content-Type': {
        description: 'Response content type',
        schema: { type: 'string', example: 'text/plain' },
      },
    },
    schema: {
      example: 'Verification failed',
    },
  })
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
  @ApiOperation({ summary: 'Receive Meta webhook events', description: 'Receives incoming Meta WhatsApp webhook payloads.' })
  @ApiBody({
    schema: {
      example: {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: '12345',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '919999999999',
                    phone_number_id: '1234567890',
                  },
                  contacts: [
                    {
                      profile: { name: 'John Doe' },
                      wa_id: '919999999999',
                    },
                  ],
                  messages: [
                    {
                      from: '919999999999',
                      id: 'wamid.HBgM...',
                      timestamp: '1715678900',
                      text: { body: 'Hello' },
                      type: 'text',
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook event processed successfully.',
    headers: {
      'Content-Type': {
        description: 'Response content type',
        schema: { type: 'string', example: 'application/json' },
      },
    },
    schema: {
      example: {
        success: true,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request when payload validation fails or signature is invalid.',
    headers: {
      'Content-Type': {
        description: 'Response content type',
        schema: { type: 'string', example: 'application/json' },
      },
    },
    schema: {
      example: {
        success: false,
        error: 'Invalid webhook payload',
      },
    },
  })
  async handleWebhook(@Body() payload: any) {
    this.logger.log('[Controller] POST /whatsapp/meta/webhook');
    const result = await this.whatsappService.handleWebhook(payload);
    return result;
  }
}
