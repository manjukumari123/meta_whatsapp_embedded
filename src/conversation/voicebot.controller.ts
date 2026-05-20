import { Controller, Post, Body, HttpCode, HttpStatus, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { VoicebotWorkflowsService, Workflow, WorkflowStep } from './workflows/voicebot-workflows.service';
import { IntentType } from '../nlp/enums/intent.enum';
import { NlpRecognitionService } from '../nlp/services/nlp-recognition.service';
import { HealthcareService } from '../healthcare/healthcare.service';
import { StructuredLoggingService } from '../logging/services/structured-logging.service';

@ApiTags('voicebot')
@Controller('voicebot')
export class VoicebotController {
  constructor(
    private readonly workflowsService: VoicebotWorkflowsService,
    private readonly nlpService: NlpRecognitionService,
    private readonly healthcareService: HealthcareService,
    private readonly structuredLogger: StructuredLoggingService,
  ) {}

  @Post('start')
  @ApiOperation({ summary: 'Start a voicebot workflow for a specific intent' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        phoneNumber: { type: 'string', example: '919999999999' },
        intent: { type: 'string', enum: ['BOOK_APPOINTMENT', 'CANCEL_APPOINTMENT', 'RESCHEDULE_APPOINTMENT', 'CHECK_SLOTS', 'ESCALATE_TO_AGENT'], example: 'BOOK_APPOINTMENT' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Workflow started successfully',
    schema: {
      example: {
        success: true,
        workflowId: 'booking-workflow',
        currentStep: 0,
        prompt: 'Welcome to Healthcare Voice Assistant. I can help you book an appointment. What type of doctor do you need?',
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  startWorkflow(@Body() body: { phoneNumber: string; intent: IntentType }) {
    const workflow = this.workflowsService.getWorkflow(body.intent);
    if (!workflow) {
      return {
        success: false,
        error: 'Workflow not found for this intent',
      };
    }

    this.workflowsService.initializeWorkflow(body.phoneNumber, workflow.workflowId);

    // Handle reschedule workflow: check if user has multiple bookings
    if (body.intent === IntentType.RESCHEDULE_APPOINTMENT) {
      const upcomingBookings = this.healthcareService.getUpcomingBookingsByPhone(body.phoneNumber);

      if (upcomingBookings.length === 0) {
        this.workflowsService.clearWorkflowState(body.phoneNumber);
        return {
          success: false,
          error: 'No upcoming appointments found',
        };
      }

      if (upcomingBookings.length === 1) {
        // Only one booking, skip selection step and proceed to new-date
        const booking = upcomingBookings[0];
        this.workflowsService.updateWorkflowState(body.phoneNumber, {
          currentStepIndex: 2, // Skip list-appointments and select-appointment, go to new-date
          collectedData: {
            appointmentId: booking.bookingId,
            doctorName: booking.doctorId,
            date: booking.date,
          },
        });
      } else {
        // Multiple bookings, show them to user
        const bookingList = upcomingBookings.map((b, index) =>
          `${index + 1}. ${b.doctorId} on ${b.date} at ${b.startTime} (ID: ${b.bookingId})`,
        ).join('\n');
        this.workflowsService.updateWorkflowState(body.phoneNumber, {
          collectedData: { upcomingBookings },
        });
      }
    }

    const prompt = this.workflowsService.getCurrentStepPrompt(body.phoneNumber);

    // Log workflow start
    this.structuredLogger.logWorkflowStep({
      phoneNumber: body.phoneNumber,
      workflowId: workflow.workflowId,
      stepId: workflow.steps[0].stepId,
      stepIndex: 0,
      status: 'START',
    });

    return {
      success: true,
      workflowId: workflow.workflowId,
      currentStep: this.workflowsService.getWorkflowState(body.phoneNumber)?.currentStepIndex || 0,
      prompt,
      upcomingBookings: body.intent === IntentType.RESCHEDULE_APPOINTMENT
        ? this.healthcareService.getUpcomingBookingsByPhone(body.phoneNumber)
        : undefined,
    };
  }

  @Post('input')
  @ApiOperation({ summary: 'Process user input and advance workflow' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        phoneNumber: { type: 'string', example: '919999999999' },
        userMessage: { type: 'string', example: 'I need a dermatologist' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Input processed successfully',
    schema: {
      example: {
        success: true,
        nextStep: 1,
        prompt: 'What date would you like to schedule your appointment?',
        collectedData: { specialization: 'dermatologist' },
        requiresAlternateSlots: false,
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  processInput(@Body() body: { phoneNumber: string; userMessage: string }) {
    const state = this.workflowsService.getWorkflowState(body.phoneNumber);
    if (!state) {
      return {
        success: false,
        error: 'No active workflow. Please start a workflow first.',
      };
    }

    const nlpResult = this.nlpService.analyzeUserInput(body.userMessage, undefined, body.phoneNumber);
    
    // Check for context switch (intent change)
    if (nlpResult.intent !== IntentType.FALLBACK) {
      const workflow = this.workflowsService.getWorkflowById(state.workflowId);
      if (workflow && workflow.intent !== nlpResult.intent) {
        // Context switch detected
        this.structuredLogger.logContextSwitch({
          phoneNumber: body.phoneNumber,
          previousIntent: workflow.intent,
          newIntent: nlpResult.intent,
          trigger: 'user_intent_change',
        });

        const contextSwitchPrompt = workflow.contextSwitchHandler?.(nlpResult.intent);
        this.workflowsService.clearWorkflowState(body.phoneNumber);
        
        // Start new workflow
        const newWorkflow = this.workflowsService.getWorkflow(nlpResult.intent);
        if (newWorkflow) {
          this.workflowsService.initializeWorkflow(body.phoneNumber, newWorkflow.workflowId);
          return {
            success: true,
            contextSwitched: true,
            newIntent: nlpResult.intent,
            prompt: contextSwitchPrompt || newWorkflow.steps[0].prompt,
          };
        }
      }
    }

    // Log workflow step
    this.structuredLogger.logWorkflowStep({
      phoneNumber: body.phoneNumber,
      workflowId: state.workflowId,
      stepId: state.currentStepIndex.toString(),
      stepIndex: state.currentStepIndex,
      status: 'SUCCESS',
      userInput: body.userMessage,
    });

    // Collect data from NLP entities
    state.collectedData = { ...state.collectedData, ...nlpResult.extractedEntities };

    // Handle appointment selection for reschedule workflow
    if (nlpResult.intent === IntentType.RESCHEDULE_APPOINTMENT && state.currentStepIndex === 1) {
      // User is at select-appointment step
      const upcomingBookings = state.collectedData.upcomingBookings as any[];
      if (upcomingBookings && upcomingBookings.length > 1) {
        // Match user input to one of the appointments
        const selectedBooking = this.matchAppointmentSelection(body.userMessage, upcomingBookings, nlpResult.extractedEntities);

        if (!selectedBooking) {
          // Selection didn't match, retry
          const retryPrompt = this.workflowsService.handleRetry(body.phoneNumber);
          const currentState = this.workflowsService.getWorkflowState(body.phoneNumber);

          if (!retryPrompt) {
            return {
              success: false,
              error: 'Max retries exceeded. Please start a new workflow.',
            };
          }

          return {
            success: true,
            retry: true,
            retryCount: currentState?.retryCount || 0,
            prompt: retryPrompt,
            collectedData: state.collectedData,
          };
        }

        // Selection successful, store the selected appointment
        state.collectedData.appointmentId = selectedBooking.bookingId;
        state.collectedData.doctorName = selectedBooking.doctorId;
        state.collectedData.date = selectedBooking.date;
      }
    }

    // Validate if required input was captured before advancing
    const validation = this.workflowsService.validateStepInput(body.phoneNumber, state.collectedData);

    if (!validation.valid) {
      // Required input is missing, retry current step
      const retryPrompt = this.workflowsService.handleRetry(body.phoneNumber);
      const currentState = this.workflowsService.getWorkflowState(body.phoneNumber);

      if (!retryPrompt) {
        // Max retries exceeded
        this.structuredLogger.logFallbackTrigger({
          phoneNumber: body.phoneNumber,
          intent: undefined,
          reason: 'Max retries exceeded - missing required input',
          fallbackType: 'MAX_RETRIES',
          retryCount: currentState?.retryCount,
        });

        return {
          success: false,
          error: 'Max retries exceeded. Please start a new workflow.',
        };
      }

      this.structuredLogger.logRetry({
        phoneNumber: body.phoneNumber,
        operation: 'workflow_step_validation',
        attempt: currentState?.retryCount || 0,
        maxRetries: 2,
        reason: `Missing required input: ${validation.missingFields?.join(', ')}`,
      });

      return {
        success: true,
        retry: true,
        retryCount: currentState?.retryCount || 0,
        prompt: retryPrompt,
        collectedData: state.collectedData,
        missingFields: validation.missingFields,
      };
    }

    // Validation passed, advance to next step
    const advanced = this.workflowsService.advanceToNextStep(body.phoneNumber);
    const nextPrompt = this.workflowsService.getCurrentStepPrompt(body.phoneNumber);

    return {
      success: true,
      nextStep: state.currentStepIndex,
      prompt: nextPrompt,
      collectedData: state.collectedData,
      requiresAlternateSlots: this.shouldSuggestAlternateSlots(nlpResult.intent, state.collectedData),
    };
  }

  @Post('retry')
  @ApiOperation({ summary: 'Handle retry for current step' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        phoneNumber: { type: 'string', example: '919999999999' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Retry prompt returned',
    schema: {
      example: {
        success: true,
        retryCount: 1,
        prompt: 'Could you please specify the type of doctor you need?',
        maxRetriesReached: false,
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  handleRetry(@Body() body: { phoneNumber: string }) {
    const retryPrompt = this.workflowsService.handleRetry(body.phoneNumber);
    const state = this.workflowsService.getWorkflowState(body.phoneNumber);

    if (!retryPrompt) {
      // Log fallback trigger when max retries exceeded
      if (state) {
        this.structuredLogger.logFallbackTrigger({
          phoneNumber: body.phoneNumber,
          intent: undefined,
          reason: 'Max retries exceeded',
          fallbackType: 'MAX_RETRIES',
          retryCount: state.retryCount,
        });
      }

      return {
        success: false,
        error: 'No active workflow or max retries exceeded',
      };
    }

    // Log retry event
    if (state) {
      this.structuredLogger.logRetry({
        phoneNumber: body.phoneNumber,
        operation: 'workflow_step',
        attempt: state.retryCount,
        maxRetries: 2,
        reason: 'User input unclear or invalid',
      });
    }

    return {
      success: true,
      retryCount: state?.retryCount || 0,
      prompt: retryPrompt,
      maxRetriesReached: !this.workflowsService.getWorkflowState(body.phoneNumber),
    };
  }

  @Post('cancel')
  @ApiOperation({ summary: 'Cancel active workflow' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        phoneNumber: { type: 'string', example: '919999999999' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Workflow cancelled successfully',
    schema: {
      example: {
        success: true,
        message: 'Workflow cancelled',
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  cancelWorkflow(@Body() body: { phoneNumber: string }) {
    this.workflowsService.clearWorkflowState(body.phoneNumber);
    return {
      success: true,
      message: 'Workflow cancelled',
    };
  }

  @Get('workflows')
  @ApiOperation({ summary: 'Get all available workflows' })
  @ApiResponse({
    status: 200,
    description: 'List of all workflows',
    schema: {
      example: {
        workflows: [
          {
            workflowId: 'booking-workflow',
            intent: 'BOOK_APPOINTMENT',
            steps: [
              { stepId: 'greeting', prompt: '...' },
              { stepId: 'date', prompt: '...' },
            ],
          },
        ],
      },
    },
  })
  getAllWorkflows() {
    const workflows = this.workflowsService.getAllWorkflows();
    return {
      workflows: workflows.map((w) => ({
        workflowId: w.workflowId,
        intent: w.intent,
        stepCount: w.steps.length,
        steps: w.steps.map((s) => ({
          stepId: s.stepId,
          prompt: s.prompt,
          maxRetries: s.maxRetries,
        })),
      })),
    };
  }

  @Post('alternate-slots')
  @ApiOperation({ summary: 'Get alternate slot suggestions' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        phoneNumber: { type: 'string', example: '919999999999' },
        doctorId: { type: 'string', example: 'doc-1' },
        preferredDate: { type: 'string', example: '2026-05-20' },
        preferredTime: { type: 'string', example: '10:00' },
        limit: { type: 'number', example: 3 },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Alternate slots suggested',
    schema: {
      example: {
        success: true,
        alternateSlots: [
          { date: '2026-05-20', time: '09:00', available: true },
          { date: '2026-05-20', time: '14:00', available: true },
          { date: '2026-05-21', time: '10:00', available: true },
        ],
        message: 'Here are some alternative time slots',
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  async getAlternateSlots(@Body() body: { phoneNumber: string; doctorId?: string; preferredDate: string; preferredTime: string; limit?: number }) {
    const limit = body.limit || 3;
    
    if (!body.doctorId) {
      // Fallback response if no doctorId provided
      this.structuredLogger.logAlternateSlotSuggestion({
        phoneNumber: body.phoneNumber,
        preferredDate: body.preferredDate,
        preferredTime: body.preferredTime,
        suggestedSlots: 3,
        status: 'NO_SLOTS',
      });

      return {
        success: true,
        alternateSlots: [
          { date: body.preferredDate, time: '09:00', available: true },
          { date: body.preferredDate, time: '14:00', available: true },
          { date: body.preferredDate, time: '16:00', available: true },
        ].slice(0, limit),
        message: `Here are ${limit} alternative time slots for ${body.preferredDate}`,
      };
    }
    
    try {
      // Use healthcare service to get actual alternate slots
      const suggestSlotsDto = {
        doctorId: body.doctorId,
        preferredDate: body.preferredDate,
        preferredTime: body.preferredTime,
        limit: limit.toString(),
      };
      
      const result = await this.healthcareService.suggestAlternateSlots(suggestSlotsDto);
      
      if (result.success && 'suggestedSlots' in result) {
        this.structuredLogger.logAlternateSlotSuggestion({
          phoneNumber: body.phoneNumber,
          doctorId: body.doctorId,
          preferredDate: body.preferredDate,
          preferredTime: body.preferredTime,
          suggestedSlots: (result as any).suggestedSlots?.length || 0,
          status: 'SUCCESS',
        });

        return {
          success: true,
          alternateSlots: (result as any).suggestedSlots?.map((slot: any) => ({
            date: body.preferredDate,
            time: slot.startTime,
            endTime: slot.endTime,
            available: slot.available,
          })),
          message: `Here are ${(result as any).suggestedSlots?.length || 0} alternative time slots for ${body.preferredDate}`,
        };
      }
      
      // Fallback to placeholder if healthcare service fails
      this.structuredLogger.logAlternateSlotSuggestion({
        phoneNumber: body.phoneNumber,
        doctorId: body.doctorId,
        preferredDate: body.preferredDate,
        preferredTime: body.preferredTime,
        suggestedSlots: 3,
        status: 'FAILURE',
      });

      return {
        success: true,
        alternateSlots: [
          { date: body.preferredDate, time: '09:00', available: true },
          { date: body.preferredDate, time: '14:00', available: true },
          { date: body.preferredDate, time: '16:00', available: true },
        ].slice(0, limit),
        message: `Here are ${limit} alternative time slots for ${body.preferredDate}`,
      };
    } catch (error) {
      // Log API failure
      this.structuredLogger.logApiFailure({
        phoneNumber: body.phoneNumber,
        apiEndpoint: '/healthcare/suggest-slots',
        method: 'POST',
        error: error instanceof Error ? error.message : 'Unknown error',
        retryCount: 0,
      });

      // Fallback response on error
      return {
        success: true,
        alternateSlots: [
          { date: body.preferredDate, time: '09:00', available: true },
          { date: body.preferredDate, time: '14:00', available: true },
          { date: body.preferredDate, time: '16:00', available: true },
        ].slice(0, limit),
        message: `Here are ${limit} alternative time slots for ${body.preferredDate}`,
      };
    }
  }

  /**
   * Determine if alternate slots should be suggested based on intent and collected data
   */
  private shouldSuggestAlternateSlots(intent: IntentType, collectedData: any): boolean {
    if (intent === IntentType.BOOK_APPOINTMENT || intent === IntentType.RESCHEDULE_APPOINTMENT) {
      // If user has provided date and time, suggest alternatives if slot might be unavailable
      return !!(collectedData.date && collectedData.time);
    }
    return false;
  }

  /**
   * Match user input to an appointment from the list
   * Supports matching by: booking ID, doctor name, date, or slot number/index
   */
  private matchAppointmentSelection(userInput: string, bookings: any[], entities: any): any | null {
    const lowerInput = userInput.toLowerCase();

    // Check by appointmentId entity
    if (entities.appointmentId) {
      const match = bookings.find((b) => b.bookingId === entities.appointmentId);
      if (match) return match;
    }

    // Check by doctorName entity
    if (entities.doctorName) {
      const match = bookings.find((b) => b.doctorId.toLowerCase().includes(entities.doctorName.toLowerCase()));
      if (match) return match;
    }

    // Check by date entity
    if (entities.date) {
      const match = bookings.find((b) => b.date === entities.date);
      if (match) return match;
    }

    // Check by slot number/index (e.g., "1", "first", "option 1")
    const slotMatch = lowerInput.match(/^(\d+|first|second|third|fourth|fifth)/i);
    if (slotMatch) {
      let index = 0;
      const word = slotMatch[1].toLowerCase();
      if (word === 'first') index = 0;
      else if (word === 'second') index = 1;
      else if (word === 'third') index = 2;
      else if (word === 'fourth') index = 3;
      else if (word === 'fifth') index = 4;
      else index = parseInt(word) - 1;

      if (index >= 0 && index < bookings.length) {
        return bookings[index];
      }
    }

    // Check by booking ID in input string
    for (const booking of bookings) {
      if (lowerInput.includes(booking.bookingId.toLowerCase())) {
        return booking;
      }
    }

    // Check by doctor name in input string
    for (const booking of bookings) {
      if (lowerInput.includes(booking.doctorId.toLowerCase())) {
        return booking;
      }
    }

    // Check by date in input string
    for (const booking of bookings) {
      if (lowerInput.includes(booking.date)) {
        return booking;
      }
    }

    return null;
  }
}
