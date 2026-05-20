import { Injectable, Logger } from '@nestjs/common';
import { IntentType } from '../../nlp/enums/intent.enum';
import { ExtractedEntity } from '../../nlp/dto/nlp-analysis.dto';
import { ConversationContextService } from '../services/conversation-context.service';

export interface WorkflowStep {
  stepId: string;
  prompt: string;
  expectedInput?: string[];
  fallbackPrompt?: string;
  maxRetries?: number;
}

export interface Workflow {
  workflowId: string;
  intent: IntentType;
  steps: WorkflowStep[];
  fallbackHandler?: (error: string) => string;
  contextSwitchHandler?: (newIntent: IntentType) => string;
}

export interface WorkflowState {
  currentStepIndex: number;
  retryCount: number;
  collectedData: any;
  workflowId: string;
}

@Injectable()
export class VoicebotWorkflowsService {
  private readonly logger = new Logger(VoicebotWorkflowsService.name);
  private workflowStates: Map<string, WorkflowState> = new Map();

  constructor(private readonly contextService: ConversationContextService) {}

  /**
   * Get workflow for a specific intent
   */
  getWorkflow(intent: IntentType): Workflow | null {
    const workflows = this.getAllWorkflows();
    return workflows.find((w) => w.intent === intent) || null;
  }

  /**
   * Get all available workflows
   */
  getAllWorkflows(): Workflow[] {
    return [
      this.getBookingWorkflow(),
      this.getCancellationWorkflow(),
      this.getRescheduleWorkflow(),
      this.getAvailabilityWorkflow(),
      this.getEscalationWorkflow(),
    ];
  }

  /**
   * Initialize workflow for a phone number
   */
  initializeWorkflow(phoneNumber: string, workflowId: string): void {
    const workflowState: WorkflowState = {
      currentStepIndex: 0,
      retryCount: 0,
      collectedData: {},
      workflowId,
    };
    this.workflowStates.set(phoneNumber, workflowState);
    this.logger.log(
      `Initialized workflow | phoneNumber: ${phoneNumber} | workflowId: ${workflowId}`,
    );
  }

  /**
   * Get current workflow state
   */
  getWorkflowState(phoneNumber: string): WorkflowState | undefined {
    return this.workflowStates.get(phoneNumber);
  }

  /**
   * Update workflow state
   */
  updateWorkflowState(
    phoneNumber: string,
    data: Partial<WorkflowState>,
  ): void {
    const state = this.workflowStates.get(phoneNumber);
    if (state) {
      Object.assign(state, data);
      this.logger.log(
        `Updated workflow state | phoneNumber: ${phoneNumber} | step: ${state.currentStepIndex}`,
      );
    }
  }

  /**
   * Clear workflow state
   */
  clearWorkflowState(phoneNumber: string): void {
    this.workflowStates.delete(phoneNumber);
    this.logger.log(`Cleared workflow state | phoneNumber: ${phoneNumber}`);
  }

  /**
   * Get current step prompt
   */
  getCurrentStepPrompt(phoneNumber: string): string | null {
    const state = this.workflowStates.get(phoneNumber);
    if (!state) return null;

    const workflow = this.getWorkflowById(state.workflowId);
    if (!workflow || state.currentStepIndex >= workflow.steps.length) {
      return null;
    }

    return workflow.steps[state.currentStepIndex].prompt;
  }

  /**
   * Validate if required input was captured for the current step
   * If multiple expected inputs are provided, at least one must be present (OR logic)
   */
  validateStepInput(phoneNumber: string, collectedData: any): { valid: boolean; missingFields?: string[] } {
    const state = this.workflowStates.get(phoneNumber);
    if (!state) return { valid: false };

    const workflow = this.getWorkflowById(state.workflowId);
    if (!workflow) return { valid: false };

    const currentStep = workflow.steps[state.currentStepIndex];
    if (!currentStep || !currentStep.expectedInput || currentStep.expectedInput.length === 0) {
      // No expected input required for this step
      return { valid: true };
    }

    // Check if at least one expected input is present (OR logic)
    const hasAtLeastOne = currentStep.expectedInput.some((expected) => collectedData[expected]);

    if (hasAtLeastOne) {
      return { valid: true };
    }

    // All expected inputs are missing
    return {
      valid: false,
      missingFields: currentStep.expectedInput,
    };
  }

  /**
   * Advance to next step
   */
  advanceToNextStep(phoneNumber: string): boolean {
    const state = this.workflowStates.get(phoneNumber);
    if (!state) return false;

    const workflow = this.getWorkflowById(state.workflowId);
    if (!workflow) return false;

    if (state.currentStepIndex < workflow.steps.length - 1) {
      state.currentStepIndex++;
      state.retryCount = 0;
      this.logger.log(
        `Advanced to next step | phoneNumber: ${phoneNumber} | step: ${state.currentStepIndex}`,
      );
      return true;
    }

    return false;
  }

  /**
   * Handle retry for current step
   */
  handleRetry(phoneNumber: string): string | null {
    const state = this.workflowStates.get(phoneNumber);
    if (!state) return null;

    const workflow = this.getWorkflowById(state.workflowId);
    if (!workflow) return null;

    const currentStep = workflow.steps[state.currentStepIndex];
    const maxRetries = currentStep.maxRetries || 2;

    if (state.retryCount >= maxRetries) {
      this.clearWorkflowState(phoneNumber);
      return this.getFallbackPrompt(workflow.intent);
    }

    state.retryCount++;
    return currentStep.fallbackPrompt || currentStep.prompt;
  }

  /**
   * Get workflow by ID
   */
  getWorkflowById(workflowId: string): Workflow | null {
    const workflows = this.getAllWorkflows();
    return workflows.find((w) => w.workflowId === workflowId) || null;
  }

  /**
   * Get fallback prompt for intent
   */
  private getFallbackPrompt(intent: IntentType): string {
    const fallbacks: { [key in IntentType]?: string } = {
      [IntentType.BOOK_APPOINTMENT]:
        "I'm having trouble understanding. Please say 'book' to start a new booking or 'help' to speak with an agent.",
      [IntentType.CANCEL_APPOINTMENT]:
        "I'm having trouble finding your appointment. Please provide your booking ID or say 'help' to speak with an agent.",
      [IntentType.RESCHEDULE_APPOINTMENT]:
        "I'm having trouble with the reschedule. Please say 'book' to start over or 'help' to speak with an agent.",
      [IntentType.VIEW_APPOINTMENTS]:
        "I'm having trouble retrieving your appointments. Please say 'help' to speak with an agent.",
      [IntentType.CHECK_SLOTS]:
        "I'm having trouble checking slots. Please specify a date and doctor, or say 'help' to speak with an agent.",
      [IntentType.ESCALATE_TO_AGENT]:
        "Connecting you to our support team...",
    };
    return fallbacks[intent] || "I'm having trouble understanding. Please say 'help' to speak with an agent.";
  }

  /**
   * Booking Workflow
   */
  private getBookingWorkflow(): Workflow {
    return {
      workflowId: 'booking-workflow',
      intent: IntentType.BOOK_APPOINTMENT,
      steps: [
        {
          stepId: 'greeting',
          prompt:
            'Welcome to Healthcare Voice Assistant. I can help you book an appointment. What type of doctor do you need? For example: dermatologist, cardiologist, or general physician.',
          expectedInput: ['specialization'],
          fallbackPrompt:
            'Could you please specify the type of doctor you need? For example: skin specialist, heart doctor, or general physician.',
          maxRetries: 2,
        },
        {
          stepId: 'date',
          prompt: 'What date would you like to schedule your appointment?',
          expectedInput: ['date'],
          fallbackPrompt: 'Please provide a specific date, like tomorrow, next Monday, or May 20th.',
          maxRetries: 2,
        },
        {
          stepId: 'time',
          prompt:
            'What time would you prefer? Morning, afternoon, or evening? Or a specific time like 10 AM.',
          expectedInput: ['time', 'timePeriod'],
          fallbackPrompt: 'Please specify a time preference: morning, afternoon, evening, or a specific time.',
          maxRetries: 2,
        },
        {
          stepId: 'confirmation',
          prompt: 'Thank you. Let me check availability and confirm your appointment.',
          expectedInput: [],
        },
      ],
      fallbackHandler: (error: string) => {
        return `I encountered an error: ${error}. Would you like to try again or speak with an agent?`;
      },
      contextSwitchHandler: (newIntent: IntentType) => {
        if (newIntent === IntentType.ESCALATE_TO_AGENT) {
          return 'I understand you want to speak with a human. Let me connect you to our support team.';
        }
        if (newIntent === IntentType.CANCEL_APPOINTMENT) {
          return 'I can help you cancel an appointment. Please provide your booking ID.';
        }
        return `I understand you want to ${newIntent}. Let me help you with that.`;
      },
    };
  }

  /**
   * Cancellation Workflow
   */
  private getCancellationWorkflow(): Workflow {
    return {
      workflowId: 'cancellation-workflow',
      intent: IntentType.CANCEL_APPOINTMENT,
      steps: [
        {
          stepId: 'identify-appointment',
          prompt:
            'I can help you cancel your appointment. Please provide your booking ID or say "my appointments" to see your bookings.',
          expectedInput: ['appointmentId'],
          fallbackPrompt:
            'Please provide your booking ID (it should be in your confirmation message) or say "my appointments" to view them.',
          maxRetries: 2,
        },
        {
          stepId: 'confirm',
          prompt:
            'Are you sure you want to cancel this appointment? Please say "yes" to confirm or "no" to keep it.',
          expectedInput: [],
          fallbackPrompt: 'Please say "yes" to cancel or "no" to keep your appointment.',
          maxRetries: 1,
        },
      ],
      fallbackHandler: (error: string) => {
        return `I encountered an error: ${error}. Would you like to try again or speak with an agent?`;
      },
      contextSwitchHandler: (newIntent: IntentType) => {
        if (newIntent === IntentType.ESCALATE_TO_AGENT) {
          return 'I understand you want to speak with a human. Let me connect you to our support team.';
        }
        if (newIntent === IntentType.BOOK_APPOINTMENT) {
          return 'I can help you book a new appointment instead.';
        }
        return `I understand you want to ${newIntent}. Let me help you with that.`;
      },
    };
  }

  /**
   * Reschedule Workflow
   */
  private getRescheduleWorkflow(): Workflow {
    return {
      workflowId: 'reschedule-workflow',
      intent: IntentType.RESCHEDULE_APPOINTMENT,
      steps: [
        {
          stepId: 'list-appointments',
          prompt:
            'I can help you reschedule your appointment. Please provide your booking ID, or say "my appointments" to see your upcoming appointments.',
          expectedInput: [],
          fallbackPrompt:
            'Please provide your booking ID or say "my appointments" to view your upcoming appointments.',
          maxRetries: 2,
        },
        {
          stepId: 'select-appointment',
          prompt: 'Please select the appointment you want to reschedule by providing the booking ID, doctor name, or date.',
          expectedInput: ['appointmentId', 'doctorName', 'date'],
          fallbackPrompt:
            'Please select an appointment by providing the booking ID, doctor name, or date.',
          maxRetries: 2,
        },
        {
          stepId: 'new-date',
          prompt: 'What new date would you like to reschedule to?',
          expectedInput: ['date'],
          fallbackPrompt: 'Please provide a new date, like tomorrow, next Friday, or a specific date.',
          maxRetries: 2,
        },
        {
          stepId: 'new-time',
          prompt: 'What time would you prefer on that date?',
          expectedInput: ['time', 'timePeriod'],
          fallbackPrompt: 'Please specify a time: morning, afternoon, evening, or a specific time.',
          maxRetries: 2,
        },
        {
          stepId: 'confirmation',
          prompt: 'Let me check availability and confirm the reschedule.',
          expectedInput: [],
        },
      ],
      fallbackHandler: (error: string) => {
        return `I encountered an error: ${error}. Would you like to try again or speak with an agent?`;
      },
      contextSwitchHandler: (newIntent: IntentType) => {
        if (newIntent === IntentType.ESCALATE_TO_AGENT) {
          return 'I understand you want to speak with a human. Let me connect you to our support team.';
        }
        if (newIntent === IntentType.BOOK_APPOINTMENT) {
          return 'I can help you book a new appointment instead of rescheduling.';
        }
        return `I understand you want to ${newIntent}. Let me help you with that.`;
      },
    };
  }

  /**
   * Doctor Availability Workflow
   */
  private getAvailabilityWorkflow(): Workflow {
    return {
      workflowId: 'availability-workflow',
      intent: IntentType.CHECK_SLOTS,
      steps: [
        {
          stepId: 'doctor-type',
          prompt:
            'I can check doctor availability for you. What type of doctor are you looking for?',
          expectedInput: ['specialization', 'doctorName'],
          fallbackPrompt:
            'Please specify the doctor type: dermatologist, cardiologist, or provide a doctor name.',
          maxRetries: 2,
        },
        {
          stepId: 'date',
          prompt: 'What date would you like to check availability for?',
          expectedInput: ['date'],
          fallbackPrompt: 'Please provide a date: today, tomorrow, next Monday, or a specific date.',
          maxRetries: 2,
        },
        {
          stepId: 'show-slots',
          prompt: 'Let me check the available slots for you.',
          expectedInput: [],
        },
      ],
      fallbackHandler: (error: string) => {
        return `I encountered an error: ${error}. Would you like to try again or speak with an agent?`;
      },
      contextSwitchHandler: (newIntent: IntentType) => {
        if (newIntent === IntentType.BOOK_APPOINTMENT) {
          return 'I can help you book an appointment based on the available slots.';
        }
        if (newIntent === IntentType.ESCALATE_TO_AGENT) {
          return 'I understand you want to speak with a human. Let me connect you to our support team.';
        }
        return `I understand you want to ${newIntent}. Let me help you with that.`;
      },
    };
  }

  /**
   * Escalation Workflow
   */
  private getEscalationWorkflow(): Workflow {
    return {
      workflowId: 'escalation-workflow',
      intent: IntentType.ESCALATE_TO_AGENT,
      steps: [
        {
          stepId: 'reason',
          prompt:
            'I understand you want to speak with a human agent. Could you briefly describe what you need help with?',
          expectedInput: [],
          fallbackPrompt:
            'Could you please tell me what you need help with so I can assist you better?',
          maxRetries: 2,
        },
        {
          stepId: 'confirm',
          prompt:
            'Thank you. I\'m connecting you to our support team. A human agent will assist you shortly.',
          expectedInput: [],
        },
      ],
      fallbackHandler: (error: string) => {
        return `I encountered an error: ${error}. Please try again or call our support line directly.`;
      },
      contextSwitchHandler: (newIntent: IntentType) => {
        return `I understand you changed your mind. Let me help you with ${newIntent} instead.`;
      },
    };
  }
}
