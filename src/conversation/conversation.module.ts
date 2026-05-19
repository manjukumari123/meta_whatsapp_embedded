import { Module } from '@nestjs/common';
import { ConversationContextService } from './services/conversation-context.service';
import { VoicebotWorkflowsService } from './workflows/voicebot-workflows.service';
import { VoicebotController } from './voicebot.controller';
import { NlpModule } from '../nlp/nlp.module';
import { HealthcareModule } from '../healthcare/healthcare.module';
import { LoggingModule } from '../logging/logging.module';

@Module({
  imports: [NlpModule, HealthcareModule, LoggingModule],
  providers: [ConversationContextService, VoicebotWorkflowsService],
  controllers: [VoicebotController],
  exports: [ConversationContextService, VoicebotWorkflowsService],
})
export class ConversationModule {}
