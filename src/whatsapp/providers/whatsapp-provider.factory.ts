import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IWhatsAppProvider } from './whatsapp-provider.interface';
import { MessageBirdProvider } from './message-bird.provider';
import { MetaWhatsAppProvider } from './meta-whatsapp.provider';

@Injectable()
export class WhatsAppProviderFactory {
  private readonly logger = new Logger(WhatsAppProviderFactory.name);
  private readonly providerType: string;

  constructor(private configService: ConfigService) {
    this.providerType = this.configService.get<string>('WHATSAPP_PROVIDER', 'META_WHATSAPP');
    this.logger.log(`WhatsAppProviderFactory initialized with provider: ${this.providerType}`);
  }

  createProvider(): IWhatsAppProvider {
    this.logger.log(`Creating WhatsApp provider: ${this.providerType}`);

    switch (this.providerType.toUpperCase()) {
      case 'MESSAGE_BIRD':
        this.logger.log('Selected MessageBird provider');
        return new MessageBirdProvider();
      
      case 'META_WHATSAPP':
        this.logger.log('Selected Meta WhatsApp provider');
        return new MetaWhatsAppProvider(this.configService);
      
      default:
        this.logger.error(`Unknown provider type: ${this.providerType}. Defaulting to META_WHATSAPP`);
        return new MetaWhatsAppProvider(this.configService);
    }
  }
}
