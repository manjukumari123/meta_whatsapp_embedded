import { Body, Controller, Post, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { NlpBookingService } from './services/nlp-booking.service';
import { NlpBookingRequestDto, NlpBookingResponseDto } from './dto/nlp-booking.dto';

@ApiTags('booking')
@Controller('booking')
export class BookingController {
  private readonly logger = new Logger(BookingController.name);

  constructor(private readonly bookingService: NlpBookingService) {}

  @Post('message')
  @ApiOperation({ summary: 'Process a user booking message' })
  @ApiBody({
    type: NlpBookingRequestDto,
    examples: {
      example: {
        summary: 'Booking request with userId and message',
        value: {
          userId: 'user-123',
          message: 'I need a skin doctor tomorrow evening',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Returns detected intent and booking assistant response.',
    headers: {
      'Content-Type': {
        description: 'Response content type',
        schema: { type: 'string', example: 'application/json' },
      },
    },
    schema: {
      example: {
        success: true,
        intent: 'BOOK_APPOINTMENT',
        message: 'Your appointment with Dr. Jatin Das is confirmed for 2026-05-15 at 10:30 AM.',
        data: {
          bookingId: '12345',
          doctorName: 'Dr. Jatin Das',
          date: '2026-05-15',
          time: '10:30 AM',
          upcomingBookings: [],
          availableSlots: [],
          suggestions: [],
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request when required fields are missing.',
    headers: {
      'Content-Type': {
        description: 'Response content type',
        schema: { type: 'string', example: 'application/json' },
      },
    },
    schema: {
      example: {
        statusCode: 400,
        message: 'Request must include message or userMessage.',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal error processing the booking request.',
    headers: {
      'Content-Type': {
        description: 'Response content type',
        schema: { type: 'string', example: 'application/json' },
      },
    },
    schema: {
      example: {
        statusCode: 500,
        message: 'Unable to process booking message at this time.',
        error: 'Internal Server Error',
      },
    },
  })
  async handleUserMessage(
    @Body() body: NlpBookingRequestDto,
  ): Promise<NlpBookingResponseDto> {
    const phoneNumber = body.phoneNumber ?? body.userId;
    const userMessage = body.userMessage ?? body.message;

    if (!userMessage) {
      throw new BadRequestException(
        'Request must include message or userMessage.',
      );
    }

    if (!phoneNumber) {
      throw new BadRequestException(
        'Request must include phoneNumber or userId.',
      );
    }

    try {
      return await this.bookingService.processUserMessage({
        phoneNumber,
        userMessage,
        sessionId: body.sessionId,
      });
    } catch (error) {
      this.logger.error('Booking message processing failed', error as any);
      throw new InternalServerErrorException(
        'Unable to process booking message at this time.',
      );
    }
  }
}
