import { Injectable, Logger } from '@nestjs/common';
import { ExtractedEntity } from '../../nlp/dto/nlp-analysis.dto';
import { IntentType } from '../../nlp/enums/intent.enum';

export interface ConversationContext {
  sessionId: string;
  phoneNumber: string;
  lastIntent?: IntentType;
  lastEntities?: ExtractedEntity;
  pendingConfirmation?: boolean;
  confirmationData?: any;
  pendingCancellation?: boolean;
  cancellationData?: any;
  messageCount: number;
  createdAt: Date;
  lastUpdatedAt: Date;
}

@Injectable()
export class ConversationContextService {
  private readonly logger = new Logger(ConversationContextService.name);
  private contexts: Map<string, ConversationContext> = new Map();
  private readonly CONTEXT_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

  /**
   * Get or create conversation context for a phone number
   */
  getContext(phoneNumber: string): ConversationContext {
    let context = this.contexts.get(phoneNumber);

    if (!context) {
      context = {
        sessionId: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        phoneNumber,
        messageCount: 0,
        createdAt: new Date(),
        lastUpdatedAt: new Date(),
      };
      this.contexts.set(phoneNumber, context);
      this.logger.log(
        `Created new conversation context | phoneNumber: ${phoneNumber} | sessionId: ${context.sessionId}`,
      );
    } else {
      // Check if context has expired
      const now = new Date().getTime();
      const contextAge = now - context.lastUpdatedAt.getTime();

      if (contextAge > this.CONTEXT_EXPIRY_MS) {
        this.logger.log(
          `Context expired, resetting | phoneNumber: ${phoneNumber} | age: ${contextAge}ms`,
        );
        context = {
          sessionId: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          phoneNumber,
          messageCount: 0,
          createdAt: new Date(),
          lastUpdatedAt: new Date(),
        };
        this.contexts.set(phoneNumber, context);
      }
    }

    context.lastUpdatedAt = new Date();
    return context;
  }

  /**
   * Increment message count for user message processing
   */
  incrementMessageCount(phoneNumber: string): void {
    const context = this.getContext(phoneNumber);
    context.messageCount++;
    this.logger.log(
      `Incremented message count | phoneNumber: ${phoneNumber} | count: ${context.messageCount}`,
    );
  }

  /**
   * Update context with intent and entities
   */
  updateContext(
    phoneNumber: string,
    intent: IntentType,
    entities: ExtractedEntity,
  ): void {
    const context = this.getContext(phoneNumber);
    context.lastIntent = intent;
    context.lastEntities = entities;
    this.logger.log(
      `Updated context | phoneNumber: ${phoneNumber} | intent: ${intent} | entities: ${JSON.stringify(entities)}`,
    );
  }

  /**
   * Merge entities from multiple interactions
   */
  mergeEntities(
    phoneNumber: string,
    newEntities: ExtractedEntity,
  ): ExtractedEntity {
    const context = this.getContext(phoneNumber);
    const merged = { ...context.lastEntities, ...newEntities };

    // Remove undefined values
    Object.keys(merged).forEach((key) => merged[key] === undefined && delete merged[key]);

    this.logger.log(
      `Merged entities | phoneNumber: ${phoneNumber} | merged: ${JSON.stringify(merged)}`,
    );

    return merged;
  }

  /**
   * Set pending confirmation state
   */
  setPendingConfirmation(
    phoneNumber: string,
    confirmationData: any,
  ): void {
    const context = this.getContext(phoneNumber);
    context.pendingConfirmation = true;
    context.confirmationData = confirmationData;
    this.logger.log(
      `Set pending confirmation | phoneNumber: ${phoneNumber} | data: ${JSON.stringify(confirmationData)}`,
    );
  }

  /**
   * Clear pending confirmation
   */
  clearPendingConfirmation(phoneNumber: string): void {
    const context = this.getContext(phoneNumber);
    context.pendingConfirmation = false;
    context.confirmationData = undefined;
    this.logger.log(`Cleared pending confirmation | phoneNumber: ${phoneNumber}`);
  }

  /**
   * Get pending confirmation data
   */
  getPendingConfirmation(phoneNumber: string): any {
    const context = this.getContext(phoneNumber);
    return context.pendingConfirmation ? context.confirmationData : undefined;
  }

  /**
   * Set pending cancellation state
   */
  setPendingCancellation(phoneNumber: string, cancellationData: any): void {
    const context = this.getContext(phoneNumber);
    context.pendingCancellation = true;
    context.cancellationData = cancellationData;
    this.logger.log(
      `Set pending cancellation | phoneNumber: ${phoneNumber} | data: ${JSON.stringify(cancellationData)}`,
    );
  }

  /**
   * Clear pending cancellation
   */
  clearPendingCancellation(phoneNumber: string): void {
    const context = this.getContext(phoneNumber);
    context.pendingCancellation = false;
    context.cancellationData = undefined;
    this.logger.log(`Cleared pending cancellation | phoneNumber: ${phoneNumber}`);
  }

  /**
   * Get pending cancellation data
   */
  getPendingCancellation(phoneNumber: string): any {
    const context = this.getContext(phoneNumber);
    return context.pendingCancellation ? context.cancellationData : undefined;
  }

  /**
   * Reset context
   */
  resetContext(phoneNumber: string): void {
    this.contexts.delete(phoneNumber);
    this.logger.log(`Reset context | phoneNumber: ${phoneNumber}`);
  }

  /**
   * Clear all expired contexts (maintenance task)
   */
  clearExpiredContexts(): void {
    const now = new Date().getTime();
    let cleared = 0;

    this.contexts.forEach((context, phoneNumber) => {
      const contextAge = now - context.lastUpdatedAt.getTime();
      if (contextAge > this.CONTEXT_EXPIRY_MS) {
        this.contexts.delete(phoneNumber);
        cleared++;
      }
    });

    if (cleared > 0) {
      this.logger.log(`Cleared expired contexts | count: ${cleared}`);
    }
  }
}
