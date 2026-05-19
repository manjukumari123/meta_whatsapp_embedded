import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { NlpModule } from './nlp/nlp.module';
import { SlotManagementModule } from './slot-management/slot-management.module';
import { ConversationModule } from './conversation/conversation.module';
import { BookingModule } from './booking/booking.module';
import { AppointmentModule } from './appointment/appointment.module';
import { TemplateModule } from './template/template.module';
import { HealthcareModule } from './healthcare/healthcare.module';
import { MetaController } from './whatsapp/providers/meta/meta.controller';
import { MetaService } from './whatsapp/providers/meta/meta.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    WhatsappModule,
    AppointmentModule,
    TemplateModule,
    NlpModule,
    SlotManagementModule,
    ConversationModule,
    BookingModule,
    HealthcareModule,
  ],
  controllers: [AppController, MetaController],
  providers: [AppService, MetaService],
})
export class AppModule {}
