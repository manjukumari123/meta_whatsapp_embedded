import { Module } from '@nestjs/common';
import { HealthcareController } from './healthcare.controller';
import { HealthcareService } from './healthcare.service';
import { SlotManagementModule } from 'src/slot-management/slot-management.module';
import { LoggingModule } from '../logging/logging.module';

@Module({
  imports: [SlotManagementModule, LoggingModule],
  controllers: [HealthcareController],
  providers: [HealthcareService],
  exports: [HealthcareService],
})
export class HealthcareModule {}
