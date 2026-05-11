import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { WhatsAppProviderFactory } from './providers/whatsapp-provider.factory';

@Module({
  imports: [ConfigModule],
  controllers: [WhatsappController],
  providers: [WhatsappService, WhatsAppProviderFactory],
  exports: [WhatsappService],
})
export class WhatsappModule {}
