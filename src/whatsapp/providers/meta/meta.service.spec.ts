import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MetaService } from './meta.service';
import { WhatsappService } from '../../whatsapp.service';

describe('MetaService', () => {
  let service: MetaService;
  let whatsappService: WhatsappService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetaService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: WhatsappService,
          useValue: {
            startSignup: jest.fn(),
            handleCallback: jest.fn(),
            verifyWebhook: jest.fn(),
            handleWebhook: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MetaService>(MetaService);
    whatsappService = module.get<WhatsappService>(WhatsappService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Signup Flow Delegation', () => {
    it('should delegate startSignup to WhatsappService', async () => {
      const mockResult = {
        success: true,
        signupUrl: 'https://example.com/signup',
        state: 'signup-123',
      };
      (whatsappService.startSignup as jest.Mock).mockResolvedValue(mockResult);

      const result = await service.startSignup({
        businessId: 'test-business',
        businessName: 'Test Business',
        phoneNumber: '919999999999',
      });

      expect(result).toEqual(mockResult);
      expect(whatsappService.startSignup).toHaveBeenCalledWith({
        businessId: 'test-business',
        businessName: 'Test Business',
        phoneNumber: '919999999999',
      });
    });

    it('should delegate signupCallback to WhatsappService with code and state', async () => {
      const mockResult = {
        success: true,
        businessId: 'mock_business_123',
        accessToken: 'token-123',
      };
      (whatsappService.handleCallback as jest.Mock).mockResolvedValue(mockResult);

      const result = await service.signupCallback({
        code: 'auth-code-123',
        state: 'signup-123',
      });

      expect(result).toEqual(mockResult);
      expect(whatsappService.handleCallback).toHaveBeenCalledWith('auth-code-123', 'signup-123');
    });

    it('should handle mock failure mode for testing', async () => {
      const result = await service.signupCallback({
        code: 'auth-code-123',
        state: 'signup-123',
        fail: true,
        errorCode: 'ACCESS_DENIED',
      });

      expect(result).toEqual({
        success: false,
        errorCode: 'ACCESS_DENIED',
        message: 'Mock signup failed',
      });
      expect(whatsappService.handleCallback).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when code is missing', async () => {
      await expect(
        service.signupCallback({
          state: 'signup-123',
        })
      ).rejects.toThrow(BadRequestException);
      expect(whatsappService.handleCallback).not.toHaveBeenCalled();
    });
  });

  describe('Webhook Flow Delegation', () => {
    it('should delegate verifyWebhook to WhatsappService', () => {
      const mockChallenge = 'challenge-123';
      (whatsappService.verifyWebhook as jest.Mock).mockReturnValue({
        challenge: mockChallenge,
      });

      const query = {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'token-123',
        'hub.challenge': mockChallenge,
      };

      const result = service.verifyWebhook(query);

      expect(result).toEqual({ challenge: mockChallenge });
      expect(whatsappService.verifyWebhook).toHaveBeenCalledWith('subscribe', 'token-123', mockChallenge);
    });

    it('should delegate handleWebhook to WhatsappService', () => {
      const mockPayload = {
        object: 'whatsapp_business_account',
        entry: [],
      };
      const mockResult = { success: true };
      (whatsappService.handleWebhook as jest.Mock).mockReturnValue(mockResult);

      const result = service.handleWebhook(mockPayload, 'signature', 'raw-body');

      expect(result).toEqual(mockResult);
      expect(whatsappService.handleWebhook).toHaveBeenCalledWith(mockPayload);
    });

    it('should validate signature when app secret is configured', () => {
      const configService = service['configService'];
      (configService.get as jest.Mock).mockReturnValue('app-secret-123');

      const crypto = require('crypto');
      const rawBody = 'test-payload';
      const expectedSignature = `sha256=${crypto
        .createHmac('sha256', 'app-secret-123')
        .update(rawBody)
        .digest('hex')}`;

      const mockPayload = {
        object: 'whatsapp_business_account',
        entry: [],
      };
      (whatsappService.handleWebhook as jest.Mock).mockReturnValue({ success: true });

      const result = service.handleWebhook(mockPayload, expectedSignature, rawBody);

      expect(result).toEqual({ success: true });
      expect(whatsappService.handleWebhook).toHaveBeenCalledWith(mockPayload);
    });

    it('should throw BadRequestException for invalid signature', () => {
      const configService = service['configService'];
      (configService.get as jest.Mock).mockReturnValue('app-secret-123');

      const mockPayload = {
        object: 'whatsapp_business_account',
        entry: [],
      };

      expect(() => {
        service.handleWebhook(mockPayload, 'invalid-signature', 'raw-body');
      }).toThrow(BadRequestException);
      expect(whatsappService.handleWebhook).not.toHaveBeenCalled();
    });
  });
});
