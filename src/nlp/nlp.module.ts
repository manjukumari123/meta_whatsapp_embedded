import { Module } from '@nestjs/common';
import { NlpRecognitionService } from './services/nlp-recognition.service';
import { LoggingModule } from '../logging/logging.module';

@Module({
  imports: [LoggingModule],
  providers: [NlpRecognitionService],
  exports: [NlpRecognitionService],
})
export class NlpModule {}
