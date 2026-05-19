import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { WhatsAppProviderFactory } from './providers/whatsapp-provider.factory';
import { IWhatsAppProvider } from './providers/whatsapp-provider.interface';

describe('WhatsappService', () => {
  let service: WhatsappService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot()],
      providers: [WhatsappService, WhatsAppProviderFactory],
    }).compile();

    service = module.get<WhatsappService>(WhatsappService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should send message successfully on first attempt', async () => {
    const result = await service.sendMessage('919999999999', 'Test message');
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
    expect(result.provider).toBeDefined();
    expect(result.retryCount).toBe(0);
    expect(result.fallbackAttempt).toBe(false);
  });

  it('should send template message successfully', async () => {
    const template = {
      name: 'appointment_confirmation',
      language: { code: 'en_US' },
      components: [
        {
          type: 'BODY',
          parameters: [
            { type: 'text', text: 'John Doe' },
            { type: 'text', text: 'Dr. Smith' },
            { type: 'text', text: '2026-05-15' },
            { type: 'text', text: '10:00 AM' },
            { type: 'text', text: 'Test Hospital' },
          ],
        },
      ],
    };
    const result = await service.sendMessage('919999999999', undefined, template);
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
    expect(result.provider).toBeDefined();
  });

  it('should include provider status in response', async () => {
    const result = await service.sendMessage('919999999999', 'Test message');
    expect(result.providerStatus).toBeDefined();
    expect(result.sentAt).toBeDefined();
  });

  it('should handle retry metadata on successful retry', async () => {
    const template = {
      name: 'appointment_confirmation',
      language: { code: 'en_US' },
      components: [
        {
          type: 'BODY',
          parameters: [{ type: 'text', text: 'Test' }],
        },
      ],
    };
    const result = await service.sendMessage('919999999999', undefined, template);
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    // Meta provider simulates failure on retryCount=1, so retry metadata may be present
    if (result.retryCount > 0) {
      expect(result.retryMetadata).toBeDefined();
    }
  });

  it('should initialize with primary and fallback providers', () => {
    expect(service).toBeDefined();
    // The service should have both providers initialized
    const providerName = service.getProviderName();
    expect(providerName).toBeDefined();
    expect(['MetaWhatsApp', 'MessageBird']).toContain(providerName);
  });

  it('should get provider name', () => {
    const providerName = service.getProviderName();
    expect(providerName).toBeDefined();
    expect(typeof providerName).toBe('string');
  });

  describe('Retry and Fallback Behavior', () => {
    let mockPrimaryProvider: IWhatsAppProvider;
    let mockFallbackProvider: IWhatsAppProvider;
    let mockProviderFactory: WhatsAppProviderFactory;
    let customService: WhatsappService;

    beforeEach(async () => {
      mockPrimaryProvider = {
        getProviderName: () => 'MockPrimary',
        sendMessage: jest.fn(),
        startSignup: jest.fn(),
        handleCallback: jest.fn(),
        verifyWebhook: jest.fn(),
        handleWebhook: jest.fn(),
      };

      mockFallbackProvider = {
        getProviderName: () => 'MockFallback',
        sendMessage: jest.fn(),
        startSignup: jest.fn(),
        handleCallback: jest.fn(),
        verifyWebhook: jest.fn(),
        handleWebhook: jest.fn(),
      };

      mockProviderFactory = {
        createProvider: jest.fn().mockReturnValue(mockPrimaryProvider),
        createFallbackProvider: jest.fn().mockReturnValue(mockFallbackProvider),
      } as any;

      // Create service with mocked factory
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          WhatsappService,
          {
            provide: WhatsAppProviderFactory,
            useValue: mockProviderFactory,
          },
        ],
      }).compile();

      customService = module.get<WhatsappService>(WhatsappService);
    });

    it('should succeed without fallback when primary succeeds', async () => {
      (mockPrimaryProvider.sendMessage as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'msg-123',
      });

      const result = await customService.sendMessage('919999999999', 'Test');
      
      expect(result.success).toBe(true);
      expect(result.provider).toBe('MockPrimary');
      expect(result.fallbackAttempt).toBe(false);
      expect(mockPrimaryProvider.sendMessage).toHaveBeenCalledTimes(1);
      expect(mockFallbackProvider.sendMessage).not.toHaveBeenCalled();
    });

    it('should retry primary before switching to fallback', async () => {
      let attemptCount = 0;
      (mockPrimaryProvider.sendMessage as jest.Mock).mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return Promise.resolve({
            success: false,
            error: 'Temporary failure',
            retryMetadata: { nextRetryIn: 10 },
          });
        }
        return Promise.resolve({
          success: false,
          error: 'Final failure',
        });
      });

      (mockFallbackProvider.sendMessage as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'msg-fallback-123',
      });

      const result = await customService.sendMessage('919999999999', 'Test');
      
      expect(result.success).toBe(true);
      expect(result.provider).toBe('MockFallback');
      expect(result.fallbackAttempt).toBe(true);
      expect(mockPrimaryProvider.sendMessage).toHaveBeenCalledTimes(3);
      expect(mockFallbackProvider.sendMessage).toHaveBeenCalledTimes(1);
    });

    it('should use fallback after primary retries fail', async () => {
      (mockPrimaryProvider.sendMessage as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Primary failed',
      });

      (mockFallbackProvider.sendMessage as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'msg-fallback-123',
      });

      const result = await customService.sendMessage('919999999999', 'Test');
      
      expect(result.success).toBe(true);
      expect(result.provider).toBe('MockFallback');
      expect(result.fallbackAttempt).toBe(true);
      expect(mockPrimaryProvider.sendMessage).toHaveBeenCalledTimes(3);
      expect(mockFallbackProvider.sendMessage).toHaveBeenCalledTimes(1);
    });

    it('should throw error if both providers fail', async () => {
      (mockPrimaryProvider.sendMessage as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Primary failed',
      });

      (mockFallbackProvider.sendMessage as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Fallback failed',
      });

      await expect(customService.sendMessage('919999999999', 'Test')).rejects.toThrow('Failed to send message');
      
      expect(mockPrimaryProvider.sendMessage).toHaveBeenCalledTimes(3);
      expect(mockFallbackProvider.sendMessage).toHaveBeenCalledTimes(3);
    });

    it('should retry fallback provider before final error', async () => {
      (mockPrimaryProvider.sendMessage as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Primary failed',
      });

      let fallbackAttemptCount = 0;
      (mockFallbackProvider.sendMessage as jest.Mock).mockImplementation(() => {
        fallbackAttemptCount++;
        if (fallbackAttemptCount < 3) {
          return Promise.resolve({
            success: false,
            error: 'Fallback temporary failure',
            retryMetadata: { nextRetryIn: 10 },
          });
        }
        return Promise.resolve({
          success: false,
          error: 'Fallback final failure',
        });
      });

      await expect(customService.sendMessage('919999999999', 'Test')).rejects.toThrow('Failed to send message');
      
      expect(mockPrimaryProvider.sendMessage).toHaveBeenCalledTimes(3);
      expect(mockFallbackProvider.sendMessage).toHaveBeenCalledTimes(3);
    });
  });

  describe('Signup State Validation', () => {
    let mockPrimaryProvider: IWhatsAppProvider;
    let mockProviderFactory: WhatsAppProviderFactory;
    let customService: WhatsappService;

    beforeEach(async () => {
      mockPrimaryProvider = {
        getProviderName: () => 'MockPrimary',
        sendMessage: jest.fn(),
        startSignup: jest.fn(),
        handleCallback: jest.fn(),
        verifyWebhook: jest.fn(),
        handleWebhook: jest.fn(),
      };

      mockProviderFactory = {
        createProvider: jest.fn().mockReturnValue(mockPrimaryProvider),
        createFallbackProvider: jest.fn().mockReturnValue(mockPrimaryProvider),
      } as any;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          WhatsappService,
          {
            provide: WhatsAppProviderFactory,
            useValue: mockProviderFactory,
          },
        ],
      }).compile();

      customService = module.get<WhatsappService>(WhatsappService);
    });

    it('should create and return a valid state on signup start', async () => {
      (mockPrimaryProvider.startSignup as jest.Mock).mockImplementation(async (options) => {
        return {
          success: true,
          signupUrl: 'https://example.com/signup',
          state: options.state,
        };
      });

      const result = await customService.startSignup({ businessName: 'Test Clinic' });

      expect(result.success).toBe(true);
      expect(result.state).toBeDefined();
      expect(result.state).toMatch(/^signup-\d+-[a-z0-9]+$/);
      expect(mockPrimaryProvider.startSignup).toHaveBeenCalledWith(
        expect.objectContaining({
          state: expect.any(String),
        })
      );
    });

    it('should accept callback with valid state', async () => {
      // First, start signup to create a state
      const generatedState = 'signup-1234567890-abc123';
      (mockPrimaryProvider.startSignup as jest.Mock).mockImplementation(async (options) => {
        return {
          success: true,
          signupUrl: 'https://example.com/signup',
          state: options.state,
        };
      });

      const startResult = await customService.startSignup({ businessName: 'Test Clinic' });
      const validState = startResult.state;

      // Now handle callback with the valid state
      (mockPrimaryProvider.handleCallback as jest.Mock).mockResolvedValue({
        success: true,
        businessId: 'business-123',
        accessToken: 'token-123',
      });

      const callbackResult = await customService.handleCallback('auth-code', validState);

      expect(callbackResult.success).toBe(true);
      expect(mockPrimaryProvider.handleCallback).toHaveBeenCalledWith('auth-code', validState);
    });

    it('should reject callback with unknown state and return 400', async () => {
      (mockPrimaryProvider.handleCallback as jest.Mock).mockResolvedValue({
        success: true,
        businessId: 'business-123',
      });

      await expect(customService.handleCallback('auth-code', 'unknown-state-123')).rejects.toThrow(BadRequestException);
      expect(mockPrimaryProvider.handleCallback).not.toHaveBeenCalled();
    });

    it('should reject callback with missing state and return 400', async () => {
      (mockPrimaryProvider.handleCallback as jest.Mock).mockResolvedValue({
        success: true,
        businessId: 'business-123',
      });

      await expect(customService.handleCallback('auth-code', undefined)).rejects.toThrow(BadRequestException);
      expect(mockPrimaryProvider.handleCallback).not.toHaveBeenCalled();
    });

    it('should reject callback with expired state and return 400', async () => {
      // Create a service instance
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          WhatsappService,
          {
            provide: WhatsAppProviderFactory,
            useValue: mockProviderFactory,
          },
        ],
      }).compile();

      const testService = module.get<WhatsappService>(WhatsappService);

      // Manually insert an expired state
      const expiredState = 'expired-state-123';
      const pastDate = new Date(Date.now() - 20 * 60 * 1000); // 20 minutes ago
      (testService as any).signupStates.set(expiredState, {
        createdAt: pastDate,
        expiresAt: new Date(pastDate.getTime() + 10 * 60 * 1000), // Expired 10 minutes ago
      });

      (mockPrimaryProvider.handleCallback as jest.Mock).mockResolvedValue({
        success: true,
        businessId: 'business-123',
      });

      await expect(testService.handleCallback('auth-code', expiredState)).rejects.toThrow(BadRequestException);
      expect(mockPrimaryProvider.handleCallback).not.toHaveBeenCalled();
    });

    it('should reject reused state after successful callback', async () => {
      // Start signup to create a state
      (mockPrimaryProvider.startSignup as jest.Mock).mockImplementation(async (options) => {
        return {
          success: true,
          signupUrl: 'https://example.com/signup',
          state: options.state,
        };
      });

      const startResult = await customService.startSignup({ businessName: 'Test Clinic' });
      const validState = startResult.state;

      // First callback should succeed
      (mockPrimaryProvider.handleCallback as jest.Mock).mockResolvedValue({
        success: true,
        businessId: 'business-123',
        accessToken: 'token-123',
      });

      await customService.handleCallback('auth-code', validState);

      // Second callback with same state should fail
      await expect(customService.handleCallback('auth-code', validState)).rejects.toThrow('Invalid or expired state');
      expect(mockPrimaryProvider.handleCallback).toHaveBeenCalledTimes(1); // Only called once
    });
  });
});
