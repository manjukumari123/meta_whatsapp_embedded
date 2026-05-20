import { Module } from '@nestjs/common';
import { SlotManagementService } from './services/slot-management.service';

@Module({
  providers: [SlotManagementService],
  exports: [SlotManagementService],
})
export class SlotManagementModule {}
