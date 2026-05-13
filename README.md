# WhatsApp Appointment Notification API

A production-ready NestJS service for managing WhatsApp appointment notifications with template messaging, provider failover, and webhook verification.

## Overview

This API provides endpoints for creating appointments with automatic WhatsApp confirmation delivery, sending template messages for reminders and cancellations, handling provider failover between Meta WhatsApp and MessageBird, and processing webhook events for delivery status updates.

Key features:
- Appointment creation with WhatsApp template notifications
- Template messaging for confirmations, reminders, and cancellations
- Automatic provider failover and retry logic
- Meta webhook verification and signature validation
- Delivery status tracking and persistence

## Architecture

The service is built with:
- **AppointmentController/Service**: Handles appointment creation and WhatsApp notifications
- **TemplateController/Service**: Manages template message sending and delivery status
- **MetaController/Service**: Provides mock Meta signup flows and webhook handling
- **WhatsAppProviderFactory**: Selects primary and fallback providers
- **Provider Implementations**: MetaProvider and MessageBirdProvider for API-specific payloads

## Setup Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- npm

### Installation
```bash
npm install
```

### Environment Configuration
Create a `.env` file in the project root:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=whatsapp_meta_mock
PORT=3000
WHATSAPP_PROVIDER=META_WHATSAPP
WEBHOOK_VERIFY_TOKEN=mock_verify_token
META_APP_SECRET=your_meta_app_secret
```

### Running the Application
```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

The API will be available at `http://localhost:3000`.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DB_HOST` | Yes | — | PostgreSQL host |
| `DB_PORT` | Yes | — | PostgreSQL port |
| `DB_USERNAME` | Yes | — | Database username |
| `DB_PASSWORD` | Yes | — | Database password |
| `DB_DATABASE` | Yes | — | Database name |
| `PORT` | No | `3000` | HTTP server port |
| `WHATSAPP_PROVIDER` | No | `MESSAGE_BIRD` | Primary provider (`META_WHATSAPP` or `MESSAGE_BIRD`) |
| `WEBHOOK_VERIFY_TOKEN` | Yes for webhook verification | — | Token for Meta webhook verification |
| `META_APP_SECRET` | No | — | HMAC secret for webhook signature validation |

## API Reference

### Appointments

#### Create Appointment
`POST /appointments`

Creates an appointment and sends a WhatsApp confirmation template.

**Request Body:**
```json
{
  "patientName": "Manju Kumari",
  "phoneNumber": "919999999999",
  "appointmentDate": "2026-05-15",
  "doctorName": "Dr. Jatin Das",
  "appointmentTime": "10:30 AM",
  "hospitalName": "BMR Hospital"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "appointment": {
    "patientName": "Manju Kumari",
    "phoneNumber": "919999999999",
    "appointmentDate": "2026-05-15",
    "doctorName": "Dr. Jatin Das",
    "appointmentTime": "10:30 AM",
    "hospitalName": "BMR Hospital"
  },
  "whatsappResponse": {
    "success": true,
    "provider": "META_WHATSAPP",
    "messageId": "meta-tmpl-abc-123",
    "status": "SENT",
    "sentAt": "2026-05-13T08:30:00.000Z"
  }
}
```

**Error Response (400):**
```json
{
  "statusCode": 400,
  "message": ["phoneNumber must be 10-15 digits, no spaces or symbols"],
  "error": "Bad Request"
}
```

### Templates

#### Send Confirmation Template
`POST /templates/confirmation`

#### Send Reminder Template
`POST /templates/reminder`

#### Send Cancellation Template
`POST /templates/cancellation`

All template endpoints accept the same request body:

**Request Body:**
```json
{
  "templateName": "appointment_confirmation",
  "patientName": "Manju Kumari",
  "doctorName": "Dr. Jatin Das",
  "appointmentDate": "2026-05-15",
  "appointmentTime": "10:30 AM",
  "hospitalName": "BMR Hospital",
  "phoneNumber": "919999999999"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "provider": "META_WHATSAPP",
  "messageId": "meta-tmpl-abc-123",
  "to": "919999999999",
  "templateName": "appointment_confirmation",
  "status": "SENT",
  "sentAt": "2026-05-13T08:30:00.000Z",
  "retryCount": 0,
  "fallbackUsed": false
}
```

### Delivery Status

#### Simulate Delivery Webhook Event
`POST /templates/webhook/delivery`

**Request Body:**
```json
{
  "messageId": "meta-tmpl-abc-123",
  "status": "DELIVERED",
  "failureReason": null
}
```

**Response (200):**
```json
{
  "success": true,
  "messageId": "meta-tmpl-abc-123",
  "status": "DELIVERED",
  "updatedAt": "2026-05-13T08:35:00.000Z"
}
```

#### Get Template Status
`GET /templates/status/:messageId`

Returns the delivery status for a message ID.

**Response (200):**
```json
{
  "messageId": "meta-tmpl-abc-123",
  "templateName": "appointment_confirmation",
  "provider": "META_WHATSAPP",
  "status": "DELIVERED",
  "retryCount": 0,
  "failureReason": null,
  "sentAt": "2026-05-13T08:30:00.000Z",
  "updatedAt": "2026-05-13T08:35:00.000Z"
}
```

### Meta Integration

#### Start Mock Signup
`POST /meta/signup/start`

**Request Body:**
```json
{
  "businessId": "mock-business-123",
  "businessName": "Test Clinic",
  "phoneNumber": "919999999999"
}
```

#### Mock Signup Callback
`POST /meta/signup/callback`

**Request Body (Success):**
```json
{}
```

**Request Body (Failure):**
```json
{
  "fail": true,
  "errorCode": "ACCESS_DENIED"
}
```

#### Verify Webhook
`GET /meta/webhook`

Query parameters:
- `hub.mode=subscribe`
- `hub.verify_token=<WEBHOOK_VERIFY_TOKEN>`
- `hub.challenge=<challenge>`

Returns the challenge string on success.

#### Receive Webhook Event
`POST /meta/webhook`

If `META_APP_SECRET` is set, validates `X-Hub-Signature-256`.

## Webhook Verification Flow

1. Meta sends `GET /meta/webhook` with verification parameters.
2. Service validates `hub.mode=subscribe` and `hub.verify_token` matches `WEBHOOK_VERIFY_TOKEN`.
3. Returns `hub.challenge` to complete verification.

For event delivery:
1. Meta sends `POST /meta/webhook` with event payload.
2. If `META_APP_SECRET` configured, computes HMAC-SHA256 of raw body and compares to `X-Hub-Signature-256`.
3. Processes the webhook event if signature valid.

## Provider Fallback Flow

Provider selection is based on `WHATSAPP_PROVIDER`:
- `META_WHATSAPP`: Meta primary, MessageBird fallback
- `MESSAGE_BIRD`: MessageBird primary, Meta fallback

Fallback behavior:
1. Attempt primary provider up to 3 times.
2. If primary fails, switch to secondary provider.
3. Attempt secondary provider up to 3 times.
4. Return success if either provider succeeds, with `fallbackUsed: true` if secondary used.
5. Return failure if both providers fail.

## Retry Behavior

- Each provider is retried up to 3 times.
- Retry delay: `100ms * attempt` (100ms, 200ms, 300ms).
- Exponential backoff applied between attempts.
- Failures are logged with attempt details.

## Testing Instructions

Run the full test suite:
```bash
npm test
```

Run specific test file:
```bash
npm test -- --testPathPatterns="appointment.service.spec.ts" --runInBand
```

## Curl Examples

Create appointment:
```bash
curl -X POST http://localhost:3000/appointments \
  -H 'Content-Type: application/json' \
  -d '{
    "patientName": "Manju Kumari",
    "phoneNumber": "919999999999",
    "appointmentDate": "2026-05-15",
    "doctorName": "Dr. Jatin Das",
    "appointmentTime": "10:30 AM",
    "hospitalName": "BMR Hospital"
  }'
```

Send confirmation template:
```bash
curl -X POST http://localhost:3000/templates/confirmation \
  -H 'Content-Type: application/json' \
  -d '{
    "templateName": "appointment_confirmation",
    "patientName": "Manju Kumari",
    "doctorName": "Dr. Jatin Das",
    "appointmentDate": "2026-05-15",
    "appointmentTime": "10:30 AM",
    "hospitalName": "BMR Hospital",
    "phoneNumber": "919999999999"
  }'
```

Verify webhook:
```bash
curl 'http://localhost:3000/meta/webhook?hub.mode=subscribe&hub.verify_token=mock_verify_token&hub.challenge=challenge-123'
```

Post webhook event:
```bash
curl -X POST http://localhost:3000/meta/webhook \
  -H 'Content-Type: application/json' \
  -H 'X-Hub-Signature-256: sha256=<signature>' \
  -d '{ "object": "whatsapp_business_account", "entry": [] }'
```