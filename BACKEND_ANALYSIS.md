# 📋 WhatsApp Meta Mock Integration Backend - Comprehensive Analysis

---

## 🎯 Project Overview

**Project Name:** `whatsapp-meta-mock`  
**Type:** Mock Meta Embedded Signup & WhatsApp Template Message Management API  
**Purpose:** Simulates Meta's Embedded Signup flow and WhatsApp API for healthcare appointment scheduling and notifications  
**Version:** 0.0.1

---

## 🏗️ Tech Stack & Architecture

### **Core Technologies**
| Component | Technology | Version |
|-----------|-----------|---------|
| **Framework** | NestJS | ^11.0.1 |
| **Runtime** | Node.js | - |
| **Database** | PostgreSQL + TypeORM | 0.3.29 |
| **Validation** | class-validator | 0.15.1 |
| **Data Transformation** | class-transformer | 0.5.1 |
| **API Documentation** | Swagger/OpenAPI | 11.4.2 |
| **Testing** | Jest + Supertest | Latest |
| **Linting** | ESLint | 9.18.0 |

### **Project Structure**
```
src/
├── app/                              # Root application module
│   ├── app.controller.ts            # Simple GET / endpoint
│   ├── app.service.ts               # Basic service
│   └── app.module.ts                # Main module with all imports
│
├── appointment/                      # Appointment Management Module
│   ├── appointment.controller.ts     # Routes: POST /appointments
│   ├── appointment.service.ts        # Business logic for appointments
│   ├── appointment.module.ts         # Module definition
│   └── dto/
│       ├── create-appointment.dto.ts # Request DTO
│       └── appointment-response.dto.ts # Response DTO
│
├── template/                         # WhatsApp Template Messages Module
│   ├── template.controller.ts        # Routes: POST/GET /templates/*
│   ├── template.service.ts           # Template sending & retry logic
│   ├── template.module.ts            # Module definition
│   ├── dto/
│   │   ├── send-template.dto.ts      # Template send request
│   │   └── webhook-delivery-event.dto.ts # Webhook event
│   └── entities/
│       └── template-message.entity.ts # Database entity
│
├── whatsapp/                         # WhatsApp Provider Abstraction
│   ├── whatsapp.controller.ts        # (Empty - no routes)
│   ├── whatsapp.module.ts            # Module definition
│   ├── whatsapp.service.ts           # Service definition
│   ├── enums/
│   │   └── whatsapp-provider.enum.ts # Provider types (META, MESSAGEBIRD)
│   ├── factory/
│   │   └── whatsapp-provider.factory.ts # Factory pattern implementation
│   ├── providers/
│   │   ├── interfaces/
│   │   │   └── whatsapp-provider.interface.ts # IWhatsAppProvider contract
│   │   ├── meta/
│   │   │   ├── meta.controller.ts    # Routes: POST/GET /meta/*
│   │   │   ├── meta.service.ts       # Meta signup & webhook handling
│   │   │   ├── meta.provider.ts      # Meta WhatsApp provider
│   │   │   ├── meta.module.ts        # Module definition
│   │   │   ├── dto/
│   │   │   │   └── webhook-event.dto.ts # Meta webhook event
│   │   │   └── entities/
│   │   │       └── signup-state.entity.ts # OAuth state persistence
│   │   └── messagebird/
│   │       └── messagebird.provider.ts # MessageBird provider impl
│   └── entities/
│       └── whatsapp-integration.entity.ts # Integration config
│
├── main.ts                           # App bootstrap & configuration
└── app.module.ts                     # Root module

test/
├── app.e2e-spec.ts                  # End-to-end tests
└── jest-e2e.json                    # Jest config for E2E
```

---

## 🗄️ Database Schema

### **Entity 1: TemplateMessage** 
**Table:** `template_message`  
**Purpose:** Stores WhatsApp template message records with delivery tracking

| Column | Type | Nullable | Default | Purpose |
|--------|------|----------|---------|---------|
| id | UUID | NO | PK | Unique message identifier |
| messageId | VARCHAR | NO | - | External provider message ID |
| provider | VARCHAR | NO | - | Provider name (META_WHATSAPP, MESSAGE_BIRD) |
| templateName | ENUM | NO | - | Template type (confirmation, reminder, cancellation) |
| patientName | VARCHAR | NO | - | Patient name |
| doctorName | VARCHAR | NO | - | Doctor name |
| hospitalName | VARCHAR | NO | - | Hospital name |
| appointmentDate | VARCHAR | NO | - | Appointment date (YYYY-MM-DD) |
| appointmentTime | VARCHAR | NO | - | Appointment time (HH:MM AM/PM) |
| phoneNumber | VARCHAR | NO | - | WhatsApp phone number (10-15 digits) |
| status | ENUM | NO | SENT | Message status (SENT, DELIVERED, FAILED) |
| failureReason | VARCHAR | YES | NULL | Error message if failed |
| retryCount | INT | NO | 0 | Number of retry attempts |
| createdAt | TIMESTAMP | NO | NOW() | Creation timestamp |
| updatedAt | TIMESTAMP | NO | NOW() | Last update timestamp |

**Enums:**
- `TemplateStatus`: SENT, DELIVERED, FAILED
- `TemplateType`: appointment_confirmation, appointment_reminder, appointment_cancellation

---

### **Entity 2: SignupState** 
**Table:** `signup_state`  
**Purpose:** Stores OAuth state tokens for Meta Embedded Signup flow

| Column | Type | Nullable | Default | Purpose |
|--------|------|----------|---------|---------|
| id | UUID | NO | PK | Unique state identifier |
| state | VARCHAR | NO | UNIQUE | OAuth state token (for CSRF protection) |
| businessId | VARCHAR | NO | - | Meta business ID |
| businessName | VARCHAR | NO | - | Business name |
| phoneNumber | VARCHAR | NO | - | WhatsApp phone number |
| expiresAt | TIMESTAMP | NO | - | State token expiration time |
| createdAt | TIMESTAMP | NO | NOW() | Creation timestamp |

---

### **Entity 3: WhatsAppIntegration** 
**Table:** `whatsapp_integration`  
**Purpose:** Stores WhatsApp provider configuration (currently not actively used in current implementation)

---

## 🔌 Design Patterns Used

### **1. Factory Pattern**
- **Location:** [src/whatsapp/factory/whatsapp-provider.factory.ts](src/whatsapp/factory/whatsapp-provider.factory.ts)
- **Purpose:** Dynamically select WhatsApp provider (Meta or MessageBird) based on environment config
- **Benefit:** Easy to switch providers without changing business logic

### **2. Provider/Strategy Pattern**
- **Location:** [src/whatsapp/providers/](src/whatsapp/providers/)
- **Interface:** [IWhatsAppProvider](src/whatsapp/providers/interfaces/whatsapp-provider.interface.ts)
- **Implementations:** MetaProvider, MessageBirdProvider
- **Purpose:** Abstraction layer for different WhatsApp implementations

### **3. Retry Pattern with Exponential Backoff**
- **Location:** [src/template/template.service.ts](src/template/template.service.ts)
- **Config:** MAX_RETRIES = 3, RETRY_DELAY_MS = 100ms
- **Logic:** Exponential backoff formula: `delay = RETRY_DELAY_MS * attempt`

### **4. Data Transfer Objects (DTO)**
- Input validation via class-validator
- Automatic type transformation via class-transformer
- Swagger documentation via @ApiProperty decorators

---

## 🚀 API Endpoints Reference

### **Base URL:** `http://localhost:3000`  
### **API Documentation:** `http://localhost:3000/api-docs` (Swagger UI)

---

## 📊 API ENDPOINTS

---

### **🏥 APPOINTMENTS MODULE** 
Base Path: `/appointments`

#### **1. Create Appointment & Send Message**
```
POST /appointments
```

**Purpose:** Create a new appointment and send a WhatsApp notification to patient

**Request Body:**
```json
{
  "patientName": "Manju Kumari",
  "phoneNumber": "919999999999",
  "appointmentDate": "2026-05-15"
}
```

**Request Schema:**
| Field | Type | Required | Validation | Example |
|-------|------|----------|-----------|---------|
| patientName | string | ✅ | Non-empty | "Manju Kumari" |
| phoneNumber | string | ✅ | 10-15 digits | "919999999999" |
| appointmentDate | string | ✅ | YYYY-MM-DD | "2026-05-15" |

**Success Response (200):**
```json
{
  "success": true,
  "appointment": {
    "patientName": "Manju Kumari",
    "phoneNumber": "919999999999",
    "appointmentDate": "2026-05-15"
  },
  "whatsappResponse": {
    "success": true,
    "provider": "META_WHATSAPP",
    "messageId": "meta-msg-abc-123"
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

**Postman Setup:**
- **Method:** POST
- **URL:** `{{base_url}}/appointments`
- **Headers:** `Content-Type: application/json`
- **Body (raw JSON):** See Request Body above

---

### **📨 TEMPLATES MODULE**
Base Path: `/templates`

#### **1. Send Confirmation Template**
```
POST /templates/confirmation
```

**Purpose:** Send appointment confirmation WhatsApp template message

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

**Request Schema:**
| Field | Type | Required | Validation | Example |
|-------|------|----------|-----------|---------|
| templateName | enum | ✅ | appointment_confirmation | "appointment_confirmation" |
| patientName | string | ✅ | Non-empty | "Manju Kumari" |
| doctorName | string | ✅ | Non-empty | "Dr. Jatin Das" |
| appointmentDate | string | ✅ | YYYY-MM-DD | "2026-05-15" |
| appointmentTime | string | ✅ | Non-empty | "10:30 AM" |
| hospitalName | string | ✅ | Non-empty | "BMR Hospital" |
| phoneNumber | string | ✅ | 10-15 digits | "919999999999" |

**Success Response (200/201):**
```json
{
  "success": true,
  "provider": "META_WHATSAPP",
  "messageId": "meta-tmpl-abc-123",
  "to": "919999999999",
  "templateName": "appointment_confirmation",
  "status": "SENT",
  "sentAt": "2026-05-12T10:30:00.000Z",
  "retryCount": 0
}
```

**Postman Setup:**
- **Method:** POST
- **URL:** `{{base_url}}/templates/confirmation`
- **Headers:** `Content-Type: application/json`
- **Body:** Raw JSON (see above)

---

#### **2. Send Reminder Template**
```
POST /templates/reminder
```

**Purpose:** Send appointment reminder WhatsApp template message

**Request Body:** (Same schema as confirmation)
```json
{
  "templateName": "appointment_reminder",
  "patientName": "Manju Kumari",
  "doctorName": "Dr. Jatin Das",
  "appointmentDate": "2026-05-15",
  "appointmentTime": "10:30 AM",
  "hospitalName": "BMR Hospital",
  "phoneNumber": "919999999999"
}
```

**Success Response (200/201):**
```json
{
  "success": true,
  "provider": "META_WHATSAPP",
  "messageId": "meta-tmpl-reminder-456",
  "to": "919999999999",
  "templateName": "appointment_reminder",
  "status": "SENT",
  "sentAt": "2026-05-12T11:00:00.000Z",
  "retryCount": 0
}
```

**Postman Setup:**
- **Method:** POST
- **URL:** `{{base_url}}/templates/reminder`
- **Headers:** `Content-Type: application/json`

---

#### **3. Send Cancellation Template**
```
POST /templates/cancellation
```

**Purpose:** Send appointment cancellation WhatsApp template message

**Request Body:** (Same schema as confirmation)
```json
{
  "templateName": "appointment_cancellation",
  "patientName": "Manju Kumari",
  "doctorName": "Dr. Jatin Das",
  "appointmentDate": "2026-05-15",
  "appointmentTime": "10:30 AM",
  "hospitalName": "BMR Hospital",
  "phoneNumber": "919999999999"
}
```

**Success Response (200/201):**
```json
{
  "success": true,
  "provider": "META_WHATSAPP",
  "messageId": "meta-tmpl-cancel-789",
  "to": "919999999999",
  "templateName": "appointment_cancellation",
  "status": "SENT",
  "sentAt": "2026-05-12T12:00:00.000Z",
  "retryCount": 0
}
```

**Postman Setup:**
- **Method:** POST
- **URL:** `{{base_url}}/templates/cancellation`

---

#### **4. Get Template Message Status**
```
GET /templates/status/:messageId
```

**Purpose:** Retrieve current delivery status of a template message

**Path Parameters:**
| Parameter | Type | Required | Example |
|-----------|------|----------|---------|
| messageId | string | ✅ | "meta-tmpl-abc-123" |

**Success Response (200):**
```json
{
  "messageId": "meta-tmpl-abc-123",
  "templateName": "appointment_confirmation",
  "provider": "META_WHATSAPP",
  "status": "DELIVERED",
  "retryCount": 0,
  "failureReason": null,
  "sentAt": "2026-05-12T10:30:00.000Z",
  "updatedAt": "2026-05-12T10:31:00.000Z"
}
```

**Error Response (404):**
```json
{
  "statusCode": 404,
  "message": "No template message found for messageId: invalid-id",
  "error": "Not Found"
}
```

**Postman Setup:**
- **Method:** GET
- **URL:** `{{base_url}}/templates/status/meta-tmpl-abc-123`
- **Headers:** None required

---

#### **5. Handle Template Delivery Webhook Event**
```
POST /templates/webhook/delivery
```

**Purpose:** Simulate Meta webhook event for message delivery status updates

**Request Body:**
```json
{
  "messageId": "meta-tmpl-abc-123",
  "status": "DELIVERED",
  "failureReason": null
}
```

**Request Schema:**
| Field | Type | Required | Options | Example |
|-------|------|----------|---------|---------|
| messageId | string | ✅ | Any | "meta-tmpl-abc-123" |
| status | enum | ✅ | SENT, DELIVERED, FAILED | "DELIVERED" |
| failureReason | string | ❌ | Any reason | "Network timeout" |

**Success Response (200):**
```json
{
  "success": true,
  "messageId": "meta-tmpl-abc-123",
  "status": "DELIVERED",
  "updatedAt": "2026-05-12T10:31:00.000Z"
}
```

**Error Responses:**
- **404 - Not Found:**
```json
{
  "statusCode": 404,
  "message": "No template message found for messageId: invalid-id",
  "error": "Not Found"
}
```

**Postman Setup:**
- **Method:** POST
- **URL:** `{{base_url}}/templates/webhook/delivery`
- **Headers:** `Content-Type: application/json`
- **Body (raw JSON):**
```json
{
  "messageId": "meta-tmpl-abc-123",
  "status": "DELIVERED",
  "failureReason": null
}
```

---

### **🔐 META INTEGRATION MODULE**
Base Path: `/meta`

#### **1. Start Meta Embedded Signup Flow**
```
POST /meta/signup/start
```

**Purpose:** Initiate mock Meta Embedded Signup flow for business onboarding

**Request Body:**
```json
{
  "businessId": "mock-business-123",
  "businessName": "Test Clinic",
  "phoneNumber": "919999999999"
}
```

**Request Schema:**
| Field | Type | Required | Validation | Example |
|-------|------|----------|-----------|---------|
| businessId | string | ✅ | Non-empty | "mock-business-123" |
| businessName | string | ✅ | Non-empty | "Test Clinic" |
| phoneNumber | string | ✅ | Any format | "919999999999" |

**Success Response (200/201):**
```json
{
  "success": true,
  "signupUrl": "https://www.facebook.com/dialog/oauth?mock=true&state=mock-state-abc-123&business_id=mock-business-123",
  "state": "mock-state-abc-123",
  "businessId": "mock-business-123",
  "businessName": "Test Clinic",
  "phoneNumber": "919999999999",
  "expiresIn": 600,
  "instructions": "Redirect the business user to signupUrl to begin onboarding."
}
```

**Postman Setup:**
- **Method:** POST
- **URL:** `{{base_url}}/meta/signup/start`
- **Headers:** `Content-Type: application/json`
- **Body (raw JSON):**
```json
{
  "businessId": "mock-business-123",
  "businessName": "Test Clinic",
  "phoneNumber": "919999999999"
}
```

---

#### **2. Meta Signup Callback (Success)**
```
POST /meta/signup/callback
```

**Purpose:** Simulate successful Meta signup callback with credentials

**Request Body (Success):**
```json
{
  "fail": false
}
```

**Success Response (200/201):**
```json
{
  "success": true,
  "businessId": "mock-biz-abc-123",
  "phoneNumberId": "mock-ph-xyz-789",
  "accessToken": "EAAMockABC123XYZ...",
  "tokenType": "bearer",
  "grantedScopes": [
    "whatsapp_business_messaging",
    "whatsapp_business_management"
  ]
}
```

**Postman Setup:**
- **Method:** POST
- **URL:** `{{base_url}}/meta/signup/callback`
- **Headers:** `Content-Type: application/json`
- **Body (raw JSON):**
```json
{
  "fail": false
}
```

---

#### **3. Meta Signup Callback (Failure Simulation)**
```
POST /meta/signup/callback
```

**Purpose:** Simulate failed Meta signup callback with error code

**Request Body (Failure):**
```json
{
  "fail": true,
  "errorCode": "ACCESS_DENIED"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "errorCode": "ACCESS_DENIED",
  "message": "Mock Meta signup failed — business user declined or an error occurred."
}
```

**Available Error Codes:**
- `ACCESS_DENIED` - User denied access
- `USER_DENIED` - User explicitly denied
- `TOKEN_EXPIRED` - Token expired
- `INVALID_SCOPE` - Invalid OAuth scope

**Postman Setup:**
- **Method:** POST
- **URL:** `{{base_url}}/meta/signup/callback`
- **Headers:** `Content-Type: application/json`
- **Body (raw JSON):**
```json
{
  "fail": true,
  "errorCode": "ACCESS_DENIED"
}
```

---

#### **4. Verify Meta Webhook (GET)**
```
GET /meta/webhook
```

**Purpose:** Handle Meta webhook verification handshake

**Query Parameters:**
| Parameter | Type | Required | Example | Purpose |
|-----------|------|----------|---------|---------|
| hub.mode | string | ✅ | "subscribe" | Webhook mode |
| hub.verify_token | string | ✅ | "mock_verify_token" | Verification token |
| hub.challenge | string | ✅ | "challenge-abc-123" | Challenge string |

**Success Response (200):**
```
challenge-abc-123
```
*(Plain text, not JSON)*

**Postman Setup:**
- **Method:** GET
- **URL:** `{{base_url}}/meta/webhook?hub.mode=subscribe&hub.verify_token=mock_verify_token&hub.challenge=challenge-abc-123`
- **Headers:** None

---

#### **5. Handle Meta Webhook Event (POST)**
```
POST /meta/webhook
```

**Purpose:** Receive incoming WhatsApp message webhook events from Meta

**Request Body:**
```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "mock-business-account-id",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "mock-display-phone-number",
              "phone_number_id": "mock-phone-number-id"
            },
            "messages": [
              {
                "from": "919999999999",
                "id": "wamid.mock-message-id-001",
                "type": "text",
                "text": {
                  "body": "Appointment Confirmed for 2026-05-15"
                }
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

**Success Response (200):**
```json
{
  "success": true,
  "processed": 1,
  "messages": [
    {
      "messageId": "wamid.mock-message-id-001",
      "from": "919999999999",
      "type": "text",
      "body": "Appointment Confirmed for 2026-05-15",
      "phoneNumberId": "mock-phone-number-id",
      "processedAt": "2026-05-12T10:35:00.000Z"
    }
  ]
}
```

**Headers:**
| Header | Required | Example | Purpose |
|--------|----------|---------|---------|
| Content-Type | ✅ | application/json | Request content type |
| x-hub-signature-256 | ❌ | sha256=abc123... | HMAC signature (optional, validated if META_APP_SECRET set) |

**Postman Setup:**
- **Method:** POST
- **URL:** `{{base_url}}/meta/webhook`
- **Headers:** 
  - `Content-Type: application/json`
  - `x-hub-signature-256: sha256=<HMAC>` (optional)
- **Body (raw JSON):** See above

---

### **🏠 ROOT ENDPOINT**
Base Path: `/`

#### **1. Health Check**
```
GET /
```

**Purpose:** Basic health check endpoint

**Success Response (200):**
```json
"Hello World!"
```

**Postman Setup:**
- **Method:** GET
- **URL:** `{{base_url}}/`
- **Headers:** None

---

## 🧪 Postman Collection Setup

### **Step 1: Create Environment Variables**

Create a Postman environment with these variables:

```json
{
  "variables": [
    {
      "key": "base_url",
      "value": "http://localhost:3000",
      "type": "default"
    },
    {
      "key": "messageId",
      "value": "meta-tmpl-abc-123",
      "type": "default"
    },
    {
      "key": "stateToken",
      "value": "mock-state-abc-123",
      "type": "default"
    }
  ]
}
```

### **Step 2: Sample Postman Requests**

#### Request 1: Create Appointment
```
POST {{base_url}}/appointments
Content-Type: application/json

{
  "patientName": "Manju Kumari",
  "phoneNumber": "919999999999",
  "appointmentDate": "2026-05-15"
}
```

#### Request 2: Send Confirmation Template
```
POST {{base_url}}/templates/confirmation
Content-Type: application/json

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

#### Request 3: Get Template Status
```
GET {{base_url}}/templates/status/{{messageId}}
```

#### Request 4: Start Meta Signup
```
POST {{base_url}}/meta/signup/start
Content-Type: application/json

{
  "businessId": "mock-business-123",
  "businessName": "Test Clinic",
  "phoneNumber": "919999999999"
}
```

#### Request 5: Meta Signup Success Callback
```
POST {{base_url}}/meta/signup/callback
Content-Type: application/json

{
  "fail": false
}
```

#### Request 6: Verify Meta Webhook
```
GET {{base_url}}/meta/webhook?hub.mode=subscribe&hub.verify_token=mock_verify_token&hub.challenge=challenge-abc-123
```

#### Request 7: Send Meta Webhook Event
```
POST {{base_url}}/meta/webhook
Content-Type: application/json

{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "mock-business-account-id",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "mock-display-phone-number",
              "phone_number_id": "mock-phone-number-id"
            },
            "messages": [
              {
                "from": "919999999999",
                "id": "wamid.mock-message-id-001",
                "type": "text",
                "text": {
                  "body": "Hello, appointment confirmed!"
                }
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

---

## ⚙️ Environment Configuration

### **Required Environment Variables**

Create a `.env` file in the project root:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=whatsapp_meta_mock

# Application
PORT=3000

# WhatsApp Provider (MESSAGE_BIRD or META_WHATSAPP)
WHATSAPP_PROVIDER=META_WHATSAPP

# Meta Configuration
META_APP_SECRET=your_meta_app_secret
WEBHOOK_VERIFY_TOKEN=mock_verify_token
```

### **Default Values**
- **PORT:** 3000
- **WHATSAPP_PROVIDER:** MESSAGE_BIRD
- **WEBHOOK_VERIFY_TOKEN:** mock_verify_token

---

## 🚀 Running the Project

### **1. Prerequisites**
- Node.js (v18+)
- PostgreSQL (v12+)
- npm or yarn

### **2. Installation**
```bash
npm install
```

### **3. Database Setup**
```bash
# Create PostgreSQL database
createdb whatsapp_meta_mock

# Run migrations (auto-sync in dev mode)
npm run start:dev
```

### **4. Start Development Server**
```bash
npm run start:dev
```

**Output:**
```
[NestFactory] Starting NestApplication...
Application running on: http://localhost:3000
Swagger docs: http://localhost:3000/api-docs
```

### **5. Run Tests**
```bash
npm run test           # Unit tests
npm run test:cov       # With coverage
npm run test:e2e       # End-to-end tests
```

### **6. Build for Production**
```bash
npm run build
npm run start:prod
```

---

## 📋 API Summary Table

| Endpoint | Method | Purpose | Auth | Response |
|----------|--------|---------|------|----------|
| `/` | GET | Health check | No | String |
| `/appointments` | POST | Create appointment | No | AppointmentResponseDto |
| `/templates/confirmation` | POST | Send confirmation | No | TemplateMessageResponse |
| `/templates/reminder` | POST | Send reminder | No | TemplateMessageResponse |
| `/templates/cancellation` | POST | Send cancellation | No | TemplateMessageResponse |
| `/templates/status/:messageId` | GET | Get message status | No | StatusResponse |
| `/templates/webhook/delivery` | POST | Webhook delivery event | No | DeliveryEventResponse |
| `/meta/signup/start` | POST | Start signup flow | No | SignupStartResponse |
| `/meta/signup/callback` | POST | Signup callback | No | SignupCallbackResponse |
| `/meta/webhook` | GET | Verify webhook | No | Challenge (string) |
| `/meta/webhook` | POST | Handle webhook | No | WebhookResponse |

---

## 🔄 Message Flow Diagrams

### **Appointment Creation Flow**
```
POST /appointments
    ↓
AppointmentController.create()
    ↓
AppointmentService.createAppointment()
    ↓
WhatsAppProviderFactory.getProvider()
    ↓
[MetaProvider or MessageBirdProvider]
    ↓
IWhatsAppProvider.sendAppointmentMessage()
    ↓
Response (messageId, provider, status)
```

### **Template Message Flow**
```
POST /templates/confirmation
    ↓
TemplateController.sendConfirmation()
    ↓
TemplateService.sendWithRetry()
    ↓
[Retry Logic: 3 attempts with exponential backoff]
    ↓
WhatsAppProviderFactory.getProvider()
    ↓
IWhatsAppProvider.sendTemplateMessage()
    ↓
Save to TemplateMessage Entity
    ↓
Response (messageId, status, retryCount)
```

### **Delivery Status Update Flow**
```
POST /templates/webhook/delivery
    ↓
TemplateController.handleDeliveryEvent()
    ↓
TemplateService.handleDeliveryEvent()
    ↓
Find TemplateMessage by messageId
    ↓
Update status (SENT → DELIVERED/FAILED)
    ↓
Save to database
    ↓
Response (success, messageId, status)
```

---

## 🔐 Security Features

✅ **Input Validation**
- class-validator decorators on all DTOs
- Phone number format validation
- Date format validation (YYYY-MM-DD)

✅ **HMAC Signature Verification**
- Meta webhook signature validation using `x-hub-signature-256`
- Configurable via `META_APP_SECRET`

✅ **CSRF Protection**
- OAuth state tokens stored in database
- State expiration (10 minutes)

✅ **Error Handling**
- Global validation pipe with whitelist enabled
- Standardized error responses
- Non-exposive error messages

---

## 📊 Key Features

| Feature | Implementation | Status |
|---------|----------------|--------|
| WhatsApp Template Messages | TemplateService with retry logic | ✅ Implemented |
| Meta OAuth Signup | MetaService with state token | ✅ Implemented |
| Webhook Verification | MetaService.verifyWebhook() | ✅ Implemented |
| Message Status Tracking | TemplateMessage entity + webhook | ✅ Implemented |
| Provider Factory Pattern | WhatsAppProviderFactory | ✅ Implemented |
| Retry Mechanism | 3 retries, exponential backoff | ✅ Implemented |
| API Documentation | Swagger/OpenAPI | ✅ Implemented |
| Database Persistence | PostgreSQL + TypeORM | ✅ Implemented |

---

## 📝 Development Tips

### **Tips for Testing in Postman**

1. **Start the server first:**
   ```bash
   npm run start:dev
   ```

2. **Use Postman environment variables** for easier request management

3. **Test flows in order:**
   - Health check (GET /)
   - Create appointment
   - Send template
   - Get status
   - Update delivery status

4. **Use realistic phone numbers** (10-15 digits)

5. **Dates must be YYYY-MM-DD format**

6. **Copy messageId from creation response** to test status endpoint

### **Common Errors & Solutions**

| Error | Cause | Solution |
|-------|-------|----------|
| 400 - Invalid phone number | Format not 10-15 digits | Use format: 919999999999 |
| 400 - Invalid date | Date format not YYYY-MM-DD | Use: 2026-05-15 |
| 404 - Not found | Invalid messageId | Copy messageId from creation response |
| 500 - Database error | DB not running | Start PostgreSQL service |
| Connection refused | Server not running | Run: npm run start:dev |

---

## 📚 Additional Resources

- **Swagger UI:** http://localhost:3000/api-docs
- **NestJS Docs:** https://docs.nestjs.com
- **TypeORM Docs:** https://typeorm.io
- **Meta WhatsApp API:** https://developers.facebook.com/docs/whatsapp/cloud-api

---

**Document Generated:** May 12, 2026  
**Backend Version:** 0.0.1  
**Last Updated:** 2026-05-12
