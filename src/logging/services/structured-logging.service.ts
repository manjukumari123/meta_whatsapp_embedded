import { Injectable, Logger } from '@nestjs/common';
import { IntentType } from '../../nlp/enums/intent.enum';

export interface LogContext {
  sessionId?: string;
  phoneNumber?: string;
  intent?: IntentType;
  eventName: string;
  status: 'START' | 'SUCCESS' | 'FAILURE' | 'RETRY' | 'TRANSITION' | 'FALLBACK' | 'PARTIAL' | 'NO_SLOTS';
  timestamp: string;
  metadata?: Record<string, any>;
  errorDetails?: {
    error: string;
    stack?: string;
    code?: string;
  };
}

@Injectable()
export class StructuredLoggingService {
  private readonly logger = new Logger(StructuredLoggingService.name);

  /**
   * Log intent detection event
   */
  logIntentDetection(context: {
    sessionId?: string;
    phoneNumber?: string;
    userMessage: string;
    detectedIntent: IntentType;
    confidence: number;
    status: 'SUCCESS' | 'FALLBACK';
    processingTime?: number;
  }) {
    this.log({
      sessionId: context.sessionId,
      phoneNumber: context.phoneNumber,
      intent: context.detectedIntent,
      eventName: 'INTENT_DETECTION',
      status: context.status,
      timestamp: new Date().toISOString(),
      metadata: {
        userMessage: context.userMessage,
        confidence: context.confidence,
        processingTime: context.processingTime,
      },
    });
  }

  /**
   * Log entity extraction event
   */
  logEntityExtraction(context: {
    sessionId?: string;
    phoneNumber?: string;
    intent: IntentType;
    entities: Record<string, any>;
    status: 'SUCCESS' | 'PARTIAL' | 'FAILURE';
  }) {
    this.log({
      sessionId: context.sessionId,
      phoneNumber: context.phoneNumber,
      intent: context.intent,
      eventName: 'ENTITY_EXTRACTION',
      status: context.status,
      timestamp: new Date().toISOString(),
      metadata: {
        entities: context.entities,
      },
    });
  }

  /**
   * Log booking flow event
   */
  logBookingFlow(context: {
    sessionId?: string;
    phoneNumber?: string;
    event: 'START' | 'VALIDATION' | 'SLOT_CHECK' | 'CONFIRMATION' | 'SUCCESS' | 'FAILURE';
    bookingId?: string;
    doctorId?: string;
    date?: string;
    time?: string;
    status: 'START' | 'SUCCESS' | 'FAILURE';
    errorDetails?: any;
  }) {
    this.log({
      sessionId: context.sessionId,
      phoneNumber: context.phoneNumber,
      intent: IntentType.BOOK_APPOINTMENT,
      eventName: `BOOKING_FLOW_${context.event}`,
      status: context.status,
      timestamp: new Date().toISOString(),
      metadata: {
        bookingId: context.bookingId,
        doctorId: context.doctorId,
        date: context.date,
        time: context.time,
      },
      errorDetails: context.errorDetails,
    });
  }

  /**
   * Log cancellation flow event
   */
  logCancellationFlow(context: {
    sessionId?: string;
    phoneNumber?: string;
    event: 'START' | 'VALIDATION' | 'SUCCESS' | 'FAILURE';
    bookingId?: string;
    status: 'START' | 'SUCCESS' | 'FAILURE';
    errorDetails?: any;
  }) {
    this.log({
      sessionId: context.sessionId,
      phoneNumber: context.phoneNumber,
      intent: IntentType.CANCEL_APPOINTMENT,
      eventName: `CANCELLATION_FLOW_${context.event}`,
      status: context.status,
      timestamp: new Date().toISOString(),
      metadata: {
        bookingId: context.bookingId,
      },
      errorDetails: context.errorDetails,
    });
  }

  /**
   * Log reschedule flow event
   */
  logRescheduleFlow(context: {
    sessionId?: string;
    phoneNumber?: string;
    event: 'START' | 'VALIDATION' | 'SLOT_CHECK' | 'CANCEL_OLD' | 'BOOK_NEW' | 'SUCCESS' | 'FAILURE' | 'ROLLBACK';
    bookingId?: string;
    oldDate?: string;
    oldTime?: string;
    newDate?: string;
    newTime?: string;
    newBookingId?: string;
    status: 'START' | 'SUCCESS' | 'FAILURE' | 'RETRY';
    errorDetails?: any;
  }) {
    this.log({
      sessionId: context.sessionId,
      phoneNumber: context.phoneNumber,
      intent: IntentType.RESCHEDULE_APPOINTMENT,
      eventName: `RESCHEDULE_FLOW_${context.event}`,
      status: context.status,
      timestamp: new Date().toISOString(),
      metadata: {
        bookingId: context.bookingId,
        oldDate: context.oldDate,
        oldTime: context.oldTime,
        newDate: context.newDate,
        newTime: context.newTime,
        newBookingId: context.newBookingId,
      },
      errorDetails: context.errorDetails,
    });
  }

  /**
   * Log slot allocation event
   */
  logSlotAllocation(context: {
    sessionId?: string;
    phoneNumber?: string;
    doctorId: string;
    date: string;
    time: string;
    available: boolean;
    status: 'SUCCESS' | 'FAILURE';
    reason?: string;
  }) {
    this.log({
      sessionId: context.sessionId,
      phoneNumber: context.phoneNumber,
      eventName: 'SLOT_ALLOCATION',
      status: context.status,
      timestamp: new Date().toISOString(),
      metadata: {
        doctorId: context.doctorId,
        date: context.date,
        time: context.time,
        available: context.available,
        reason: context.reason,
      },
    });
  }

  /**
   * Log alternate slot suggestion event
   */
  logAlternateSlotSuggestion(context: {
    sessionId?: string;
    phoneNumber?: string;
    doctorId?: string;
    preferredDate: string;
    preferredTime: string;
    suggestedSlots: number;
    status: 'SUCCESS' | 'FAILURE' | 'NO_SLOTS';
  }) {
    this.log({
      sessionId: context.sessionId,
      phoneNumber: context.phoneNumber,
      eventName: 'ALTERNATE_SLOT_SUGGESTION',
      status: context.status,
      timestamp: new Date().toISOString(),
      metadata: {
        doctorId: context.doctorId,
        preferredDate: context.preferredDate,
        preferredTime: context.preferredTime,
        suggestedSlots: context.suggestedSlots,
      },
    });
  }

  /**
   * Log API failure
   */
  logApiFailure(context: {
    sessionId?: string;
    phoneNumber?: string;
    apiEndpoint: string;
    method: string;
    error: string;
    statusCode?: number;
    retryCount?: number;
  }) {
    this.log({
      sessionId: context.sessionId,
      phoneNumber: context.phoneNumber,
      eventName: 'API_FAILURE',
      status: 'FAILURE',
      timestamp: new Date().toISOString(),
      metadata: {
        apiEndpoint: context.apiEndpoint,
        method: context.method,
        statusCode: context.statusCode,
        retryCount: context.retryCount,
      },
      errorDetails: {
        error: context.error,
      },
    });
  }

  /**
   * Log retry event
   */
  logRetry(context: {
    sessionId?: string;
    phoneNumber?: string;
    operation: string;
    attempt: number;
    maxRetries: number;
    reason: string;
  }) {
    this.log({
      sessionId: context.sessionId,
      phoneNumber: context.phoneNumber,
      eventName: 'RETRY',
      status: 'RETRY',
      timestamp: new Date().toISOString(),
      metadata: {
        operation: context.operation,
        attempt: context.attempt,
        maxRetries: context.maxRetries,
        reason: context.reason,
      },
    });
  }

  /**
   * Log escalation event
   */
  logEscalation(context: {
    sessionId?: string;
    phoneNumber?: string;
    reason?: string;
    status: 'START' | 'SUCCESS' | 'FAILURE';
  }) {
    this.log({
      sessionId: context.sessionId,
      phoneNumber: context.phoneNumber,
      intent: IntentType.ESCALATE_TO_AGENT,
      eventName: 'ESCALATION',
      status: context.status,
      timestamp: new Date().toISOString(),
      metadata: {
        reason: context.reason,
      },
    });
  }

  /**
   * Log flow transition
   */
  logFlowTransition(context: {
    sessionId?: string;
    phoneNumber?: string;
    fromIntent?: IntentType;
    toIntent: IntentType;
    reason: string;
  }) {
    this.log({
      sessionId: context.sessionId,
      phoneNumber: context.phoneNumber,
      intent: context.toIntent,
      eventName: 'FLOW_TRANSITION',
      status: 'TRANSITION',
      timestamp: new Date().toISOString(),
      metadata: {
        fromIntent: context.fromIntent,
        toIntent: context.toIntent,
        reason: context.reason,
      },
    });
  }

  /**
   * Log context switching
   */
  logContextSwitch(context: {
    sessionId?: string;
    phoneNumber?: string;
    previousIntent: IntentType;
    newIntent: IntentType;
    trigger: string;
  }) {
    this.log({
      sessionId: context.sessionId,
      phoneNumber: context.phoneNumber,
      intent: context.newIntent,
      eventName: 'CONTEXT_SWITCH',
      status: 'TRANSITION',
      timestamp: new Date().toISOString(),
      metadata: {
        previousIntent: context.previousIntent,
        newIntent: context.newIntent,
        trigger: context.trigger,
      },
    });
  }

  /**
   * Log fallback trigger
   */
  logFallbackTrigger(context: {
    sessionId?: string;
    phoneNumber?: string;
    intent?: IntentType;
    reason: string;
    fallbackType: 'MAX_RETRIES' | 'NO_UNDERSTANDING' | 'API_FAILURE' | 'VALIDATION_ERROR';
    retryCount?: number;
  }) {
    this.log({
      sessionId: context.sessionId,
      phoneNumber: context.phoneNumber,
      intent: context.intent,
      eventName: 'FALLBACK_TRIGGER',
      status: 'FALLBACK',
      timestamp: new Date().toISOString(),
      metadata: {
        reason: context.reason,
        fallbackType: context.fallbackType,
        retryCount: context.retryCount,
      },
    });
  }

  /**
   * Log workflow step
   */
  logWorkflowStep(context: {
    sessionId?: string;
    phoneNumber?: string;
    workflowId: string;
    stepId: string;
    stepIndex: number;
    status: 'START' | 'SUCCESS' | 'FAILURE';
    userInput?: string;
  }) {
    this.log({
      sessionId: context.sessionId,
      phoneNumber: context.phoneNumber,
      eventName: 'WORKFLOW_STEP',
      status: context.status,
      timestamp: new Date().toISOString(),
      metadata: {
        workflowId: context.workflowId,
        stepId: context.stepId,
        stepIndex: context.stepIndex,
        userInput: context.userInput,
      },
    });
  }

  /**
   * Generic log method
   */
  private log(context: LogContext) {
    const logMessage = `[${context.eventName}] ${context.status}`;
    const logData = {
      sessionId: context.sessionId,
      phoneNumber: context.phoneNumber,
      intent: context.intent,
      eventName: context.eventName,
      status: context.status,
      timestamp: context.timestamp,
      metadata: context.metadata,
      errorDetails: context.errorDetails,
    };

    switch (context.status) {
      case 'FAILURE':
        this.logger.error(logMessage, logData);
        break;
      case 'FALLBACK':
        this.logger.warn(logMessage, logData);
        break;
      case 'RETRY':
        this.logger.warn(logMessage, logData);
        break;
      case 'TRANSITION':
        this.logger.log(logMessage, logData);
        break;
      default:
        this.logger.debug(logMessage, logData);
    }
  }
}
