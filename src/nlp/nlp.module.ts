import { Module } from '@nestjs/common';
import { NlpRecognitionService } from './services/nlp-recognition.service';

@Module({
  providers: [NlpRecognitionService],
  exports: [NlpRecognitionService],
})
export class NlpModule {}
