# 🚀 Quick API Reference for Postman Testing

## Setup Instructions

### 1. Import Postman Collection
1. Open Postman
2. Click **Import** → Select **Postman_Collection.json**
3. Collection will be loaded with all endpoints

### 2. Set Environment Variables
1. Create new environment: **WhatsApp Meta Mock**
2. Add these variables:
```
base_url        = http://localhost:3000
messageId       = meta-tmpl-abc-123 (update after each template send)
stateToken      = mock-state-abc-123 (update after each signup start)
accessToken     = (optional, returned from signup callback)
```

### 3. Start Backend Server
```bash
npm run start:dev
```

Server will start at: `http://localhost:3000`  
Swagger docs available at: `http://localhost:3000/api-docs`

---

## 🧪 Testing Workflow

### Workflow 1: Complete Appointment Flow
```
1. POST /appointments
   ↓ Get appointment response with messageId
2. GET /templates/status/:messageId
   ↓ Check message delivery status
3. POST /templates/webhook/delivery
   ↓ Simulate delivery status update
4. GET /templates/status/:messageId
   ✓ Status should be updated
```

### Workflow 2: Complete Meta Signup Flow
```
1. POST /meta/signup/start
   ↓ Get signupUrl and state token
2. POST /meta/signup/callback (success)
   ↓ Get businessId, phoneNumberId, accessToken
3. OR POST /meta/signup/callback (failure with errorCode)
   ✓ See error response
```

### Workflow 3: Webhook Verification & Event Handling
```
1. GET /meta/webhook?hub.mode=subscribe&hub.verify_token=mock_verify_token&hub.challenge=challenge-abc-123
   ↓ Returns challenge string
2. POST /meta/webhook
   ↓ Send incoming message webhook event
   ✓ Should return processed messages
```

---

## 📋 Quick API Reference by Endpoint

### Appointments
| Endpoint | Method | Body Required | Quick Test |
|----------|--------|---|---|
| `/appointments` | POST | ✅ Yes | Create new appointment |

**Sample Body:**
```json
{
  "patientName": "Manju Kumari",
  "phoneNumber": "919999999999",
  "appointmentDate": "2026-05-15"
}
```

---

### Templates
| Endpoint | Method | Body Required | Status Codes |
|----------|--------|---|---|
| `/templates/confirmation` | POST | ✅ Yes | 200, 201, 400 |
| `/templates/reminder` | POST | ✅ Yes | 200, 201, 400 |
| `/templates/cancellation` | POST | ✅ Yes | 200, 201, 400 |
| `/templates/status/:messageId` | GET | ❌ No | 200, 404 |
| `/templates/webhook/delivery` | POST | ✅ Yes | 200, 404 |

**Sample Body (for all template endpoints):**
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

---

### Meta Integration
| Endpoint | Method | Body Required | Purpose |
|----------|--------|---|---|
| `/meta/signup/start` | POST | ✅ Yes | Initiate signup |
| `/meta/signup/callback` | POST | ✅ Yes | Callback after signup |
| `/meta/webhook` | GET | ❌ No | Verify webhook |
| `/meta/webhook` | POST | ✅ Yes | Handle webhook event |

---

## ✅ Validation Rules

### Phone Number Format
- **Required:** 10-15 digits (no spaces, no symbols)
- **Examples:** ✅ 919999999999, ✅ 14155552671, ❌ +91 9999999999, ❌ 9999999999

### Date Format
- **Required:** YYYY-MM-DD
- **Examples:** ✅ 2026-05-15, ✅ 2026-12-31, ❌ 05-15-2026, ❌ 15/05/2026

### Template Names
- Valid values: `appointment_confirmation`, `appointment_reminder`, `appointment_cancellation`

### Template Status
- Valid values: `SENT`, `DELIVERED`, `FAILED`

### Error Codes (for failed signup)
- `ACCESS_DENIED` - User denied access
- `USER_DENIED` - User explicitly denied
- `TOKEN_EXPIRED` - Token expired
- `INVALID_SCOPE` - Invalid OAuth scope

---

## 🔍 Common Test Scenarios

### Scenario 1: Send Appointment Confirmation
```bash
curl -X POST http://localhost:3000/templates/confirmation \
  -H "Content-Type: application/json" \
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

**Expected Response:**
```json
{
  "success": true,
  "provider": "META_WHATSAPP",
  "messageId": "meta-tmpl-xyz-789",
  "to": "919999999999",
  "templateName": "appointment_confirmation",
  "status": "SENT",
  "sentAt": "2026-05-12T10:30:00.000Z",
  "retryCount": 0
}
```

### Scenario 2: Create Appointment
```bash
curl -X POST http://localhost:3000/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "patientName": "Manju Kumari",
    "phoneNumber": "919999999999",
    "appointmentDate": "2026-05-15"
  }'
```

**Expected Response:**
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

### Scenario 3: Get Message Status
```bash
curl -X GET http://localhost:3000/templates/status/meta-tmpl-xyz-789
```

**Expected Response:**
```json
{
  "messageId": "meta-tmpl-xyz-789",
  "templateName": "appointment_confirmation",
  "provider": "META_WHATSAPP",
  "status": "SENT",
  "retryCount": 0,
  "failureReason": null,
  "sentAt": "2026-05-12T10:30:00.000Z",
  "updatedAt": "2026-05-12T10:30:00.000Z"
}
```

### Scenario 4: Start Meta Signup
```bash
curl -X POST http://localhost:3000/meta/signup/start \
  -H "Content-Type: application/json" \
  -d '{
    "businessId": "mock-business-123",
    "businessName": "Test Clinic",
    "phoneNumber": "919999999999"
  }'
```

**Expected Response:**
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

### Scenario 5: Handle Meta Webhook Event
```bash
curl -X POST http://localhost:3000/meta/webhook \
  -H "Content-Type: application/json" \
  -d '{
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
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "processed": 1,
  "messages": [
    {
      "messageId": "wamid.mock-message-id-001",
      "from": "919999999999",
      "type": "text",
      "body": "Hello, appointment confirmed!",
      "phoneNumberId": "mock-phone-number-id",
      "processedAt": "2026-05-12T10:35:00.000Z"
    }
  ]
}
```

---

## 🐛 Troubleshooting

### Issue: Connection Refused
**Problem:** `POST http://localhost:3000/... connect ECONNREFUSED`  
**Solution:** Start the server with `npm run start:dev`

### Issue: 400 - Invalid Phone Number
**Problem:** `"phoneNumber must be 10-15 digits, no spaces or symbols"`  
**Solution:** Use format without spaces: `919999999999` ✅

### Issue: 400 - Invalid Date
**Problem:** `"appointmentDate must be in YYYY-MM-DD format"`  
**Solution:** Use format: `2026-05-15` ✅

### Issue: 404 - Message Not Found
**Problem:** `"No template message found for messageId: invalid-id"`  
**Solution:** Copy the exact messageId from the creation response

### Issue: 500 - Database Error
**Problem:** Database connection failed  
**Solution:** 
1. Check PostgreSQL is running
2. Verify .env file has correct DB credentials
3. Check if database exists

### Issue: Validation Error
**Problem:** Whitelist validation errors  
**Solution:** Only send fields specified in DTO, remove extra fields

---

## 📊 Test Checklist

- [ ] Health Check: GET /
- [ ] Create Appointment: POST /appointments
- [ ] Send Confirmation: POST /templates/confirmation
- [ ] Send Reminder: POST /templates/reminder
- [ ] Send Cancellation: POST /templates/cancellation
- [ ] Get Status: GET /templates/status/:messageId
- [ ] Delivery Event: POST /templates/webhook/delivery
- [ ] Start Signup: POST /meta/signup/start
- [ ] Signup Success: POST /meta/signup/callback (fail=false)
- [ ] Signup Failure: POST /meta/signup/callback (fail=true)
- [ ] Verify Webhook: GET /meta/webhook
- [ ] Handle Webhook: POST /meta/webhook

---

## 📈 Performance Notes

- **Max Retries:** 3 attempts per template send
- **Retry Delay:** Exponential backoff (100ms × attempt)
- **Timeout:** No specific timeout (relies on system)
- **Concurrency:** Handle multiple requests simultaneously
- **Database:** PostgreSQL with TypeORM

---

## 📚 Documentation Links

- **Full Documentation:** See `BACKEND_ANALYSIS.md`
- **API Docs (Swagger):** http://localhost:3000/api-docs
- **Postman Collection:** Import `Postman_Collection.json`
- **NestJS Guide:** https://docs.nestjs.com

---

**Last Updated:** May 12, 2026  
**API Version:** 0.0.1
