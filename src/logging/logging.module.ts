import { Module } from '@nestjs/common';
import { StructuredLoggingService } from './services/structured-logging.service';

@Module({
  providers: [StructuredLoggingService],
  exports: [StructuredLoggingService],
})
export class LoggingModule {}
