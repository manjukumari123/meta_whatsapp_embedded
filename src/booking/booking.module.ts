import { Module } from '@nestjs/common';
import { NlpModule } from '../nlp/nlp.module';
import { SlotManagementModule } from '../slot-management/slot-management.module';
import { ConversationModule } from '../conversation/conversation.module';
import { LoggingModule } from '../logging/logging.module';
import { NlpBookingService } from './services/nlp-booking.service';
import { BookingController } from './booking.controller';

@Module({
  imports: [NlpModule, SlotManagementModule, ConversationModule, LoggingModule],
  controllers: [BookingController],
  providers: [NlpBookingService],
  exports: [NlpBookingService],
})
export class BookingModule {}
