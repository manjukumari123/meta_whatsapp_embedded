# Healthcare AI Voicebot

A comprehensive NestJS-based healthcare appointment management system with WhatsApp integration, NLP-powered conversational workflows, and structured logging for monitoring and debugging.

## Project Overview

This service provides intelligent appointment booking, cancellation, and rescheduling capabilities through WhatsApp integration. It features:

- **NLP-Powered Conversations**: Intent detection and entity extraction for natural language processing
- **Appointment Management**: Book, cancel, reschedule, and view appointments
- **Slot Management**: Real-time slot availability and alternate suggestions
- **Conversational Workflows**: Multi-step conversational flows with context management
- **WhatsApp Integration**: Meta WhatsApp API with MessageBird fallback
- **Template Messaging**: WhatsApp template messages for confirmations, reminders, and cancellations
- **Structured Logging**: Comprehensive event logging for monitoring and debugging
- **Provider Failover**: Automatic fallback between WhatsApp providers

## Key Features

### Healthcare Workflows
- Book appointments with doctor selection, date/time scheduling
- Cancel appointments with validation
- Reschedule appointments with slot availability checks
- Check available slots for doctors and specializations
- View upcoming and past appointments

### Conversational AI
- Natural language processing for intent detection
- Entity extraction (doctor name, specialization, date, time)
- Context-aware conversations with session management
- Context switching between workflows
- Fallback handling with retry mechanisms
- Alternate slot suggestions when preferred slots unavailable

### WhatsApp Integration
- Meta WhatsApp API as primary provider
- MessageBird as fallback provider
- Template messaging for notifications
- Webhook verification and signature validation
- Delivery status tracking

### Monitoring & Logging
- Structured logging for all system events
- Intent detection and entity extraction logs
- Booking, cancellation, reschedule flow logs
- Slot allocation and suggestion logs
- API failure and retry logs
- Context switching and fallback trigger logs
- Workflow step progression logs

## Appointment Notification Flow

1. A client calls `POST /appointments` with appointment details.
2. `AppointmentController` forwards the request to `AppointmentService`.
3. `AppointmentService` delegates message delivery to `TemplateService.sendConfirmation()`.
4. `TemplateService` resolves provider order from `WhatsAppProviderFactory` and attempts to send the template.
5. The primary provider is retried up to 3 times on failure.
6. If the primary provider still fails, the service falls back to the secondary provider and retries again.
7. The send result is persisted to the `TemplateMessage` table and returned to the caller.

## Architecture

The main components are:

### Core Modules
- **HealthcareModule** - Healthcare service for appointment management
- **BookingModule** - NLP-powered booking service
- **ConversationModule** - Conversational workflow management
- **NlpModule** - Natural language processing service
- **SlotManagementModule** - Slot availability and allocation
- **LoggingModule** - Structured logging service
- **WhatsAppModule** - WhatsApp integration with provider failover
- **TemplateModule** - Template messaging engine
- **AppointmentModule** - Appointment record management

### Controllers
- **HealthcareController** - Healthcare endpoints (book, cancel, reschedule, availability)
- **BookingController** - NLP booking endpoint
- **VoicebotController** - Voicebot workflow endpoints
- **TemplateController** - Template send and delivery webhook endpoints
- **MetaController** - Mock Meta signup and webhook verification
- **WhatsappController** - WhatsApp send message endpoint

### Services
- **HealthcareService** - Appointment booking, cancellation, rescheduling
- **NlpBookingService** - NLP message processing and routing
- **NlpRecognitionService** - Intent detection and entity extraction
- **ConversationContextService** - Session and context management
- **VoicebotWorkflowsService** - Conversational workflow definitions
- **SlotManagementService** - Slot availability and allocation
- **StructuredLoggingService** - Comprehensive event logging
- **TemplateService** - Retry, fallback, persistence, and status handling
- **WhatsAppProviderFactory** - Provider selection and failover ordering
- **MetaProvider** and **MessageBirdProvider** - Provider-specific implementations

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         WhatsApp Layer                          │
│  ┌──────────────────┐         ┌──────────────────┐            │
│  │  Meta WhatsApp   │────────▶│  MessageBird      │            │
│  │      API         │(fallback)│      API          │            │
│  └──────────────────┘         └──────────────────┘            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │  Healthcare  │  │    Booking   │  │   Voicebot   │            │
│  │  Controller  │  │  Controller  │  │  Controller  │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Service Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │  Healthcare  │  │     NLP      │  │  Slot Mgmt   │            │
│  │   Service    │  │  Recognition │  │   Service    │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │  Booking     │  │  Context     │  │  Workflow    │            │
│  │   Service    │  │   Service    │  │   Service    │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │  WhatsApp    │  │   Template   │  │   Logging    │            │
│  │   Service    │  │   Service    │  │   Service    │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

## NLP Intent Handling

### Supported Intents
- **BOOK_APPOINTMENT** - Book a new appointment
- **CANCEL_APPOINTMENT** - Cancel an existing appointment
- **RESCHEDULE_APPOINTMENT** - Reschedule an appointment
- **VIEW_APPOINTMENTS** - View upcoming and past appointments
- **CHECK_SLOTS** - Check available slots for a doctor
- **ESCALATE_TO_AGENT** - Escalate to human agent
- **FALLBACK** - Default when no intent matches

### Entity Extraction
- Doctor name (e.g., "Dr. Rajesh", "Dr. Smith")
- Specialization (e.g., "dermatologist", "cardiologist")
- Date (e.g., "tomorrow", "2026-05-20", "Friday")
- Time (e.g., "10am", "14:00", "morning")
- Appointment ID (e.g., "12345")
- Slot ordinal (e.g., "first", "second", "third")

### Specialization Aliases
- Dermatologist: skin specialist, skin doctor, dermatology
- Physician: general doctor, general practitioner, gp, family doctor, internist
- Cardiologist: heart doctor, heart specialist, cardiology
- Dentist: dental surgeon, dental specialist, dental

## Provider Fallback Mechanism

Provider failover is driven by the `WHATSAPP_PROVIDER` environment variable.

- `WHATSAPP_PROVIDER=META_WHATSAPP`: Meta is primary, MessageBird is fallback.
- `WHATSAPP_PROVIDER=MESSAGE_BIRD`: MessageBird is primary, Meta is fallback.

Failover behavior:

- Each provider is attempted up to 3 times.
- Retry delays are incremental: 100ms, 200ms, then 300ms.
- If the primary provider exhausts retries, the service switches to the secondary provider.
- If the secondary provider succeeds, the response indicates `fallbackUsed: true`.
- If both providers fail, the send operation returns a failed response and logs the error.

## API Endpoints

### Healthcare Endpoints

#### Book Appointment
`POST /healthcare/book`
- Book a new appointment with doctor, date, time, and patient details

#### Cancel Appointment
`POST /healthcare/cancel`
- Cancel an existing appointment by booking ID

#### Reschedule Appointment
`POST /healthcare/reschedule`
- Reschedule an appointment to a new date/time

#### Check Availability
`POST /healthcare/availability`
- Check available slots for a doctor on a specific date

#### Suggest Alternate Slots
`POST /healthcare/suggest-slots`
- Get alternative slot suggestions when preferred slot is unavailable

### Booking/NLP Endpoints

#### Process User Message
`POST /booking/message`
- Process natural language booking requests
- Automatically detects intent and extracts entities
- Returns appropriate response based on detected intent

### Voicebot Endpoints

#### Start Workflow
`POST /voicebot/start`
- Start a conversational workflow for a specific intent

#### Process Input
`POST /voicebot/input`
- Process user input and advance workflow
- Handles context switching between workflows

#### Handle Retry
`POST /voicebot/retry`
- Handle retry for current workflow step

#### Cancel Workflow
`POST /voicebot/cancel`
- Cancel active workflow

#### Get Workflows
`GET /voicebot/workflows`
- Get all available workflows

#### Get Alternate Slots
`POST /voicebot/alternate-slots`
- Get alternate slot suggestions for voicebot

### WhatsApp Endpoints

#### Send Message
`POST /whatsapp/send-message`
- Send a WhatsApp message

#### Meta Webhook
`GET /whatsapp/meta/webhook` - Verification
`POST /whatsapp/meta/webhook` - Message receipt

### Template Endpoints

#### Send Confirmation Template
`POST /templates/confirmation`
- Send appointment confirmation template

#### Send Reminder Template
`POST /templates/reminder`
- Send appointment reminder template

#### Send Cancellation Template
`POST /templates/cancellation`
- Send appointment cancellation template

#### Get Message Status
`GET /templates/status/:messageId`
- Get delivery status for a template message

### Appointment Endpoints

#### Create Appointment
`POST /appointments`
- Create appointment record and send confirmation template

## Setup Instructions

### Requirements

- Node.js 18+
- npm or yarn
- Git

### Install dependencies

```bash
npm install
```

### Create environment config

Create a `.env` file in the project root:

```env
PORT=3000
NODE_ENV=development

# WhatsApp Configuration
WHATSAPP_PROVIDER=META_WHATSAPP
META_WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
META_WHATSAPP_ACCESS_TOKEN=your_access_token
META_WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_verify_token

# MessageBird Configuration (Fallback)
MESSAGEBIRD_ACCESS_KEY=your_access_key
MESSAGEBIRD_PHONE_NUMBER=your_phone_number

# Database Configuration (optional - uses in-memory mock by default)
# DB_HOST=localhost
# DB_PORT=5432
# DB_USERNAME=postgres
# DB_PASSWORD=postgres
# DB_DATABASE=healthcare_voicebot
```

### Run the application

```bash
npm run start:dev
```

Production build:

```bash
npm run build
npm run start:prod
```

The service will be available at `http://localhost:3000`.

### Access API Documentation

Interactive Swagger API documentation is available at:

```
http://localhost:3000/api
```

## Environment Variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `PORT` | No | `3000` | HTTP server port |
| `NODE_ENV` | No | `development` | Environment mode |
| `WHATSAPP_PROVIDER` | No | `META_WHATSAPP` | Primary provider selection (META_WHATSAPP or MESSAGE_BIRD) |
| `META_WHATSAPP_PHONE_NUMBER_ID` | Yes for Meta | - | Meta WhatsApp phone number ID |
| `META_WHATSAPP_ACCESS_TOKEN` | Yes for Meta | - | Meta WhatsApp access token |
| `META_WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Yes for webhook | - | Verification token for Meta webhook |
| `MESSAGEBIRD_ACCESS_KEY` | Yes for MessageBird | - | MessageBird access key |
| `MESSAGEBIRD_PHONE_NUMBER` | Yes for MessageBird | - | MessageBird phone number |
| `DB_HOST` | No | - | PostgreSQL host (optional - uses in-memory mock by default) |
| `DB_PORT` | No | - | PostgreSQL port |
| `DB_USERNAME` | No | - | Database username |
| `DB_PASSWORD` | No | - | Database password |
| `DB_DATABASE` | No | - | Database name |

## Sample Requests/Responses

### Book Appointment via NLP

**Request**:
```bash
curl -X POST http://localhost:3000/booking/message \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "919999999999",
    "userMessage": "I need to book an appointment with Dr. Rajesh tomorrow at 10am"
  }'
```

**Response**:
```json
{
  "success": true,
  "intent": "BOOK_APPOINTMENT",
  "message": "Your appointment with Dr. Rajesh Kumar is confirmed for May 20, 2026 at 10:00 AM",
  "entities": {
    "doctorName": "Dr. Rajesh",
    "date": "2026-05-20",
    "time": "10:00"
  }
}
```

### Cancel Appointment via NLP

**Request**:
```bash
curl -X POST http://localhost:3000/booking/message \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "919999999999",
    "userMessage": "Cancel my appointment"
  }'
```

**Response**:
```json
{
  "success": true,
  "intent": "CANCEL_APPOINTMENT",
  "message": "Your appointment has been cancelled successfully"
}
```

### Check Available Slots

**Request**:
```bash
curl -X POST http://localhost:3000/booking/message \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "919999999999",
    "userMessage": "Show me available slots for a dermatologist"
  }'
```

**Response**:
```json
{
  "success": true,
  "intent": "CHECK_SLOTS",
  "message": "Available slots for dermatologist:\n- May 20: 09:00, 10:00, 11:00\n- May 21: 09:00, 14:00, 15:00"
}
```

### Start Voicebot Workflow

**Request**:
```bash
curl -X POST http://localhost:3000/voicebot/start \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "919999999999",
    "intent": "BOOK_APPOINTMENT"
  }'
```

**Response**:
```json
{
  "success": true,
  "workflowId": "booking-workflow",
  "currentStep": 0,
  "prompt": "Welcome to Healthcare Voice Assistant. I can help you book an appointment. What type of doctor do you need?"
}
```

## Documentation

For comprehensive project documentation, including:

- Detailed system architecture
- Module structure and dependencies
- Complete API documentation with examples
- Healthcare workflows
- Conversational workflows
- NLP intent handling details
- Conversational continuity using sessionId
- Edge cases and test cases
- Logging and monitoring
- Known limitations
- Exotel integration guide
- Mock API explanation
- How to test the APIs

See: [docs/PROJECT_DOCUMENTATION.md](docs/PROJECT_DOCUMENTATION.md)

## Testing

### Run Unit Tests
```bash
npm test
```

### Run E2E Tests
```bash
npm run test:e2e
```

### Run with Coverage
```bash
npm run test:cov
```

### Edge Case Tests
See: [tests/edge-cases/healthcare-voicebot-edge-cases.md](tests/edge-cases/healthcare-voicebot-edge-cases.md)

## Logging

The application logs all system events through the StructuredLoggingService:

- Intent detection and entity extraction
- Booking, cancellation, reschedule flow events
- Slot allocation and suggestion events
- API failures and retry attempts
- Context switching and fallback triggers
- Workflow step progression
- Escalation to human agent

Logs are emitted via NestJS `Logger` and are visible in the console.

## Swagger / API Docs

The interactive Swagger API documentation is available at:

`http://localhost:3000/api`

## License

MIT
