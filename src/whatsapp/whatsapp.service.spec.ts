import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { WhatsappService } from './whatsapp.service';
import { WhatsAppProviderFactory } from './providers/whatsapp-provider.factory';

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
});
