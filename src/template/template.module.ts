import { Module } from '@nestjs/common';
import { WhatsappModule } from 'src/whatsapp/whatsapp.module';
import { TemplateController } from './template.controller';
import { TemplateService } from './template.service';

@Module({
  imports: [WhatsappModule],
  controllers: [TemplateController],
  providers: [TemplateService],
  exports: [TemplateService],
})
export class TemplateModule {}
