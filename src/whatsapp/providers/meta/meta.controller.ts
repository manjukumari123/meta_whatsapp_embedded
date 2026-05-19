import { Body, Controller, Get, Post, Query, Headers, Req } from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiBody,
  ApiOperation,
  ApiProperty,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { MetaService } from './meta.service';
import { WebhookEventDto } from './dto/webhook-event.dto';

export class StartSignupDto {
  @ApiProperty({
    example: 'mock-business-123',
    description: 'Business ID to onboard',
  })
  @IsString()
  @IsNotEmpty()
  businessId: string;

  @ApiProperty({ example: 'Test Clinic', description: 'Business name' })
  @IsString()
  @IsNotEmpty()
  businessName: string;

  @ApiProperty({
    example: '919999999999',
    description: 'WhatsApp phone number to link',
  })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;
}

export class SignupCallbackDto {
  @ApiProperty({
    example: 'auth_code_123',
    description: 'Authorization code from Meta',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    example: 'state-abc-123',
    description: 'State token for CSRF protection',
    required: false,
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({
    example: false,
    description: 'Set to true to simulate a signup failure (testing only)',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  fail?: boolean;

  @ApiProperty({
    example: 'ACCESS_DENIED',
    description: 'Error code returned on failure (testing only)',
    required: false,
    enum: ['ACCESS_DENIED', 'USER_DENIED', 'TOKEN_EXPIRED', 'INVALID_SCOPE'],
  })
  @IsOptional()
  @IsEnum(['ACCESS_DENIED', 'USER_DENIED', 'TOKEN_EXPIRED', 'INVALID_SCOPE'])
  errorCode?: string;
}

@ApiTags('meta')
@Controller('meta')
export class MetaController {
  constructor(private readonly metaService: MetaService) {}

  @Post('signup/start')
  @ApiOperation({
    summary: 'Start mock Meta Embedded Signup flow',
    description:
      'Simulates initiating Meta Embedded Signup for a business. Returns a mock signup URL and state token.',
  })
  @ApiBody({
    type: StartSignupDto,
    examples: {
      start: {
        summary: 'Start signup request',
        value: {
          businessId: 'mock-business-123',
          businessName: 'Test Clinic',
          phoneNumber: '919999999999',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Returns a mock signup URL for embedded onboarding.',
    schema: {
      example: {
        success: true,
        redirectUrl: 'https://www.facebook.com/v18.0/dialog/oauth?client_id=mock_client_id&redirect_uri=mock_redirect_url&scope=whatsapp_business_management',
      },
    },
  })
  startSignup(@Body() body: StartSignupDto) {
    return this.metaService.startSignup(body);
  }

  @Post('signup/callback')
  @ApiOperation({
    summary: 'Handle Meta signup callback',
    description:
      'Processes the callback after business completes Meta onboarding. Validates state token for security.',
  })
  @ApiBody({
    type: SignupCallbackDto,
    examples: {
      success: {
        summary: 'Successful callback request',
        value: {
          code: 'auth_code_123',
          state: 'signup-1779210000000-abc123',
        },
      },
      failure: {
        summary: 'Failure callback request (testing)',
        value: {
          code: 'auth_code_123',
          state: 'signup-1779210000000-abc123',
          fail: true,
          errorCode: 'ACCESS_DENIED',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Returns Meta onboarding credentials on success.',
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
  signupCallback(@Body() body: SignupCallbackDto) {
    return this.metaService.signupCallback(body);
  }

  @Get('webhook')
  @ApiOperation({
    summary: 'Mock Meta webhook verification',
    description:
      'Simulates Meta webhook verification handshake. Use mock_verify_token as the verify token.',
  })
  @ApiQuery({ name: 'hub.mode', required: true, example: 'subscribe' })
  @ApiQuery({
    name: 'hub.verify_token',
    required: true,
    example: 'mock_verify_token',
  })
  @ApiQuery({
    name: 'hub.challenge',
    required: true,
    example: 'challenge-abc-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the challenge string when verification is successful.',
    schema: {
      example: 'challenge-abc-123',
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden when the verify token is invalid.',
    schema: {
      example: 'Verification failed',
    },
  })
  verifyWebhook(@Query() query: Record<string, string>) {
    return this.metaService.verifyWebhook(query);
  }

  @Post('webhook')
  @ApiOperation({
    summary: 'Mock Meta webhook event',
    description:
      'Simulates receiving an incoming WhatsApp message webhook from Meta.',
  })
  @ApiBody({
    type: WebhookEventDto,
    examples: {
      event: {
        summary: 'Webhook event payload',
        value: {
          object: 'whatsapp_business_account',
          entry: [{ id: '12345', changes: [] }],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook event processed successfully.',
    schema: {
      example: {
        success: true,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request when payload validation fails or signature is invalid.',
    schema: {
      example: {
        success: false,
        error: 'Invalid webhook payload',
      },
    },
  })
  handleWebhook(
    @Req() req: Request,
    @Body() payload: WebhookEventDto,
    @Headers('x-hub-signature-256') signature: string | string[],
  ) {
    const rawBody = (req as any).rawBody;
    return this.metaService.handleWebhook(payload, signature, rawBody);
  }
}
