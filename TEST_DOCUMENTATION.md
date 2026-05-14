# WhatsApp Bot Appointment API - Test Documentation

## Overview
This document provides comprehensive test scenarios, API endpoints, and expected responses for the WhatsApp bot appointment booking system with NLP capabilities.

## Base URL
```
http://localhost:3000
```

## API Endpoints

### 1. Process User Booking Message
**Endpoint:** `POST /booking/message`

**Description:** Processes natural language messages for appointment booking, cancellation, viewing appointments, and checking available slots.

**Request Body:**
```json
{
  "phoneNumber": "919999999999",
  "userMessage": "I need a skin doctor tomorrow evening"
}
```

**Alternative Fields:**
- `userId` can be used instead of `phoneNumber`
- `message` can be used instead of `userMessage`
- `sessionId` is optional for conversation context

---

## Test Scenarios

### Scenario 1: Book Appointment with Complete Information

**Request:**
```bash
curl -X POST http://localhost:3000/booking/message \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "919999999999",
    "userMessage": "Book appointment with Dr. Rajesh on 2026-05-16 at 10:00 AM"
  }'
```

**Expected Response (Success):**
```json
{
  "success": true,
  "intent": "BOOK_APPOINTMENT",
  "message": "Appointment confirmed with Dr. Rajesh Kumar on 2026-05-16 at 10:00",
  "entities": {
    "doctorName": "Rajesh",
    "date": "2026-05-16",
    "time": "10:00"
  },
  "data": {
    "bookingId": "book-1234567890-abc123",
    "doctorName": "Dr. Rajesh Kumar",
    "date": "2026-05-16",
    "time": "10:00"
  }
}
```

**Expected Response (Requires Confirmation):**
```json
{
  "success": true,
  "intent": "BOOK_APPOINTMENT",
  "message": "I found available Dr. Rajesh Kumar slots for 2026-05-16. Please choose one.",
  "requiresConfirmation": true,
  "availableSlots": [
    {
      "startTime": "09:00",
      "endTime": "09:30",
      "date": "2026-05-16"
    },
    {
      "startTime": "10:00",
      "endTime": "10:30",
      "date": "2026-05-16"
    }
  ],
  "entities": {
    "doctorName": "Rajesh",
    "date": "2026-05-16"
  }
}
```

---

### Scenario 2: Book Appointment by Specialization

**Request:**
```bash
curl -X POST http://localhost:3000/booking/message \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "919999999999",
    "userMessage": "I need a dermatologist tomorrow evening"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "intent": "BOOK_APPOINTMENT",
  "message": "I found evening dermatologist slots for 2026-05-15. Please choose one.",
  "requiresConfirmation": true,
  "availableSlots": [
    {
      "startTime": "16:00",
      "endTime": "16:30",
      "date": "2026-05-15"
    },
    {
      "startTime": "16:30",
      "endTime": "17:00",
      "date": "2026-05-15"
    }
  ],
  "entities": {
    "specialization": "dermatologist",
    "date": "2026-05-15",
    "timePeriod": "evening"
  }
}
```

---

### Scenario 3: Conversational Slot Selection

**Step 1 - Initial Request:**
```bash
curl -X POST http://localhost:3000/booking/message \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "919999999999",
    "userMessage": "I need a dermatologist tomorrow evening"
  }'
```

**Response:**
```json
{
  "success": true,
  "intent": "BOOK_APPOINTMENT",
  "message": "I found evening dermatologist slots for 2026-05-15. Please choose one.",
  "requiresConfirmation": true,
  "availableSlots": [
    {
      "startTime": "16:00",
      "endTime": "16:30"
    },
    {
      "startTime": "16:30",
      "endTime": "17:00"
    }
  ]
}
```

**Step 2 - Select Slot by Time:**
```bash
curl -X POST http://localhost:3000/booking/message \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "919999999999",
    "userMessage": "Book 16:00 slot"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "intent": "BOOK_APPOINTMENT",
  "message": "Your appointment with Dr. Rajesh Kumar has been booked for 2026-05-15 at 16:00.",
  "requiresConfirmation": false,
  "appointment": {
    "doctorId": "doc-1",
    "doctorName": "Dr. Rajesh Kumar",
    "specialization": "dermatologist",
    "date": "2026-05-15",
    "startTime": "16:00",
    "endTime": "16:30"
  },
  "data": {
    "bookingId": "book-1234567890-xyz789",
    "doctorName": "Dr. Rajesh Kumar",
    "date": "2026-05-15",
    "time": "16:00"
  }
}
```

**Step 3 - Select Slot by Ordinal:**
```bash
curl -X POST http://localhost:3000/booking/message \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "919999999999",
    "userMessage": "Book the first slot"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "intent": "BOOK_APPOINTMENT",
  "message": "Your appointment with Dr. Rajesh Kumar has been booked for 2026-05-15 at 16:00.",
  "requiresConfirmation": false,
  "appointment": {
    "doctorId": "doc-1",
    "doctorName": "Dr. Rajesh Kumar",
    "specialization": "dermatologist",
    "date": "2026-05-15",
    "startTime": "16:00",
    "endTime": "16:30"
  }
}
```

---

### Scenario 4: Invalid Slot Selection

**Request:**
```bash
curl -X POST http://localhost:3000/booking/message \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "919999999999",
    "userMessage": "Book 20:00 slot"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "intent": "BOOK_APPOINTMENT",
  "message": "I couldn't find that slot in your pending options. Available times for Dr. Rajesh Kumar on 2026-05-15 are: 16:00, 16:30. Please choose one of those times (e.g., \"Book 16:00 slot\" or \"I choose the first slot\").",
  "requiresConfirmation": true,
  "availableSlots": [
    {
      "startTime": "16:00",
      "endTime": "16:30"
    },
    {
      "startTime": "16:30",
      "endTime": "17:00"
    }
  ]
}
```

---

### Scenario 5: Cancel Appointment

**Request:**
```bash
curl -X POST http://localhost:3000/booking/message \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "919999999999",
    "userMessage": "Cancel my appointment"
  }'
```

**Expected Response (Multiple Appointments):**
```json
{
  "success": false,
  "intent": "CANCEL_APPOINTMENT",
  "message": "Your upcoming appointments:\n• Dr. Rajesh Kumar (dermatologist) on 2026-05-15 at 16:00 (ID: book-1234567890)\n• Dr. Jatin Das (cardiologist) on 2026-05-16 at 09:00 (ID: book-0987654321)\n\nWhich appointment would you like to cancel?",
  "requiresConfirmation": true
}
```

**Request (Cancel by ID):**
```bash
curl -X POST http://localhost:3000/booking/message \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "919999999999",
    "userMessage": "Cancel appointment 1234567890"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "intent": "CANCEL_APPOINTMENT",
  "message": "Appointment with Dr. Rajesh Kumar on 2026-05-15 at 16:00 has been cancelled"
}
```

---

### Scenario 6: View Appointments

**Request:**
```bash
curl -X POST http://localhost:3000/booking/message \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "919999999999",
    "userMessage": "Show my upcoming bookings"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "intent": "VIEW_APPOINTMENTS",
  "message": "Upcoming Appointments:\n• Dr. Rajesh Kumar (dermatologist) on 2026-05-15 at 16:00\n• Dr. Jatin Das (cardiologist) on 2026-05-16 at 09:00",
  "data": {
    "upcomingBookings": [
      {
        "bookingId": "book-1234567890",
        "doctorName": "Dr. Rajesh Kumar",
        "specialization": "dermatologist",
        "date": "2026-05-15",
        "startTime": "16:00"
      },
      {
        "bookingId": "book-0987654321",
        "doctorName": "Dr. Jatin Das",
        "specialization": "cardiologist",
        "date": "2026-05-16",
        "startTime": "09:00"
      }
    ]
  }
}
```

---

### Scenario 7: Check Available Slots

**Request (By Doctor):**
```bash
curl -X POST http://localhost:3000/booking/message \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "919999999999",
    "userMessage": "Check available slots for Dr. Rajesh tomorrow"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "intent": "CHECK_SLOTS",
  "message": "Available slots for Dr. Rajesh Kumar on 2026-05-15: 09:00, 09:30, 10:00, 10:30, 14:00, 14:30, 16:00, 16:30",
  "entities": {
    "doctorName": "Rajesh",
    "date": "2026-05-15"
  },
  "availableSlots": [
    {
      "startTime": "09:00",
      "endTime": "09:30"
    },
    {
      "startTime": "09:30",
      "endTime": "10:00"
    }
  ],
  "data": {
    "availableSlots": [...]
  }
}
```

**Request (By Specialization):**
```bash
curl -X POST http://localhost:3000/booking/message \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "919999999999",
    "userMessage": "Show available slots for cardiologists tomorrow"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "intent": "CHECK_SLOTS",
  "message": "Available slots for cardiologist specialists on 2026-05-15:\nDr. Jatin Das: 08:00, 08:45, 15:00, 15:45",
  "entities": {
    "specialization": "cardiologist",
    "date": "2026-05-15"
  },
  "availableSlots": [
    {
      "doctorName": "Dr. Jatin Das",
      "slots": [
        {
          "startTime": "08:00",
          "endTime": "08:45"
        }
      ]
    }
  ]
}
```

---

### Scenario 8: Alternative Slot Suggestions

**Request (No Evening Slots):**
```bash
curl -X POST http://localhost:3000/booking/message \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "919999999999",
    "userMessage": "Book appointment with a dermatologist on Saturday evening"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "intent": "BOOK_APPOINTMENT",
  "message": "I couldn't find evening slots for Dr. Rajesh Kumar on 2026-05-17. However, here are some other available times: 2026-05-17 at 10:00, 2026-05-17 at 10:30",
  "requiresConfirmation": true,
  "availableSlots": [
    {
      "startTime": "10:00",
      "endTime": "10:30",
      "date": "2026-05-17"
    },
    {
      "startTime": "10:30",
      "endTime": "11:00",
      "date": "2026-05-17"
    }
  ],
  "suggestions": [
    "2026-05-17 at 10:00",
    "2026-05-17 at 10:30"
  ]
}
```

---

### Scenario 9: Edge Case - Past Date Booking

**Request:**
```bash
curl -X POST http://localhost:3000/booking/message \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "919999999999",
    "userMessage": "Book appointment with Dr. Rajesh yesterday"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "intent": "BOOK_APPOINTMENT",
  "message": "Past date bookings not allowed"
}
```

---

### Scenario 10: Edge Case - Duplicate Booking

**Request:**
```bash
curl -X POST http://localhost:3000/booking/message \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "919999999999",
    "userMessage": "Book appointment with Dr. Rajesh on 2026-05-15 at 10:00"
  }'
```

**Expected Response (Slot Already Booked):**
```json
{
  "success": false,
  "intent": "BOOK_APPOINTMENT",
  "message": "This slot is already booked"
}
```

---

### Scenario 11: Edge Case - Fully Booked

**Request:**
```bash
curl -X POST http://localhost:3000/booking/message \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "919999999999",
    "userMessage": "Book appointment with Dr. Rajesh on 2026-05-15"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "intent": "BOOK_APPOINTMENT",
  "message": "No slots available"
}
```

---

### Scenario 12: Edge Case - Invalid Doctor

**Request:**
```bash
curl -X POST http://localhost:3000/booking/message \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "919999999999",
    "userMessage": "Book appointment with Dr. NonExistent"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "intent": "BOOK_APPOINTMENT",
  "message": "Sorry, doctor \"NonExistent\" not found. Available doctors: Dr. Rajesh Kumar (Dermatologist), Dr. Jatin Das (Cardiologist), Dr. Priya Singh (Dentist), Dr. Amit Patel (Orthopedic)",
  "entities": {
    "doctorName": "NonExistent"
  }
}
```

---

### Scenario 13: Edge Case - Daily Booking Limit Exceeded

**Request:**
```bash
curl -X POST http://localhost:3000/booking/message \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "919999999999",
    "userMessage": "Book appointment with Dr. Rajesh on 2026-05-15 at 14:00"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "intent": "BOOK_APPOINTMENT",
  "message": "Doctor has reached maximum bookings for 2026-05-15"
}
```

---

### Scenario 14: Edge Case - Doctor Unavailable

**Request:**
```bash
curl -X POST http://localhost:3000/booking/message \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "919999999999",
    "userMessage": "Book appointment with Dr. Rajesh today"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "intent": "BOOK_APPOINTMENT",
  "message": "Doctor unavailable on 2026-05-14: Conference"
}
```

---

### Scenario 15: Conversational Continuity - Topic Change

**Step 1 - Start Booking:**
```bash
curl -X POST http://localhost:3000/booking/message \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "919999999999",
    "userMessage": "I need a dermatologist"
  }'
```

**Step 2 - Change Topic:**
```bash
curl -X POST http://localhost:3000/booking/message \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "919999999999",
    "userMessage": "Actually, cancel my appointment"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "intent": "CANCEL_APPOINTMENT",
  "message": "You have no upcoming appointments to cancel"
}
```

---

### Scenario 16: Conversational Continuity - Incomplete Information

**Step 1 - Provide Doctor:**
```bash
curl -X POST http://localhost:3000/booking/message \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "919999999999",
    "userMessage": "I need Dr. Rajesh"
  }'
```

**Step 2 - Add Date:**
```bash
curl -X POST http://localhost:3000/booking/message \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "919999999999",
    "userMessage": "Tomorrow"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "intent": "BOOK_APPOINTMENT",
  "message": "I found available Dr. Rajesh Kumar slots for 2026-05-15. Please choose one.",
  "requiresConfirmation": true,
  "entities": {
    "doctorName": "Rajesh",
    "date": "2026-05-15"
  },
  "availableSlots": [...]
}
```

---

### Scenario 17: Typo Resilience

**Request:**
```bash
curl -X POST http://localhost:3000/booking/message \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "919999999999",
    "userMessage": "Pls book apt with Dr Rajesh tmrw at 10 AM"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "intent": "BOOK_APPOINTMENT",
  "message": "Appointment confirmed with Dr. Rajesh Kumar on 2026-05-15 at 10:00",
  "entities": {
    "doctorName": "Rajesh",
    "date": "2026-05-15",
    "time": "10:00"
  }
}
```

---

### Scenario 18: Natural Language Variations

**Booking Variations:**
- "I want to book an appointment with Dr. Rajesh"
- "Can I get an appointment with Dr. Rajesh?"
- "Schedule appointment for me with Dr. Rajesh"
- "I need to see Dr. Rajesh"

**Cancellation Variations:**
- "Cancel my appointment"
- "I want to cancel"
- "Remove my booking"
- "Delete my appointment"

---

## Logging Format

The system uses structured logging with the following prefixes:

- `[INTENT_DETECTION]` - When user intent is detected
- `[SLOT_ALLOCATION]` - When querying or booking slots
- `[SLOT_SUGGESTIONS]` - When providing alternative slots
- `[PENDING_CONFIRMATION]` - When confirming pending slot selection
- `[CONTEXT]` - When managing conversation context
- `[CANCELLATION]` - When processing cancellations
- `[VIEW_APPOINTMENTS]` - When viewing appointments
- `[CHECK_SLOTS]` - When checking available slots

**Example Log Output:**
```
[INTENT_DETECTION] BOOK_APPOINTMENT | phoneNumber: 919999999999 | entities: {"doctorName":"Rajesh","date":"2026-05-15"} | extractedEntities: {"doctorName":"Rajesh","date":"2026-05-15"}
[SLOT_ALLOCATION] Querying slots | doctorId: doc-1 | doctorName: Dr. Rajesh Kumar | date: 2026-05-15 | timePeriod: undefined
[SLOT_ALLOCATION] Found 8 available slots | doctorId: doc-1 | date: 2026-05-15
[CONTEXT] Stored pending confirmation | phoneNumber: 919999999999 | doctorId: doc-1 | date: 2026-05-15 | slotsCount: 8
```

---

## Mock Doctor Data

### Available Doctors

| Doctor ID | Name | Specialization | Slot Duration | Daily Limit |
|-----------|------|---------------|---------------|-------------|
| doc-1 | Dr. Rajesh Kumar | Dermatologist | 30 min | 10 |
| doc-2 | Dr. Jatin Das | Cardiologist | 45 min | 8 |
| doc-3 | Dr. Priya Singh | Dentist | 20 min | 12 |
| doc-4 | Dr. Amit Patel | Orthopedic | 40 min | 9 |

### Doctor Schedules

**Dr. Rajesh Kumar (Dermatologist)**
- Mon-Fri: 09:00-12:00, 14:00-17:00
- Saturday: 10:00-13:00
- Unavailable: Today (Conference)

**Dr. Jatin Das (Cardiologist)**
- Mon-Fri: 08:00-11:00, 15:00-18:00

**Dr. Priya Singh (Dentist)**
- Mon-Sat: 10:00-13:00, 16:00-20:00

**Dr. Amit Patel (Orthopedic)**
- Mon, Wed, Fri: 09:00-12:00
- Tue, Thu: 14:00-17:00

---

## Test Execution

### Run All Tests
```bash
npm test
```

### Run Specific Test Suite
```bash
npm test -- nlp-booking.service.spec.ts
```

### Run with Coverage
```bash
npm test -- --coverage
```

---

## Common Test Issues and Solutions

### Issue: "No slots available"
**Solution:** Check if the doctor is available on the requested date. Some doctors have specific day schedules or unavailable periods.

### Issue: "Past date bookings not allowed"
**Solution:** Use a future date (tomorrow or later) for booking.

### Issue: "Doctor not found"
**Solution:** Use the exact doctor name from the mock data or use specialization instead.

### Issue: "Slot already booked"
**Solution:** Choose a different time slot or date.

---

## Performance Considerations

- Conversation context expires after 30 minutes of inactivity
- Maximum 10 bookings per day per doctor (configurable)
- Slot duration varies by doctor specialization
- Alternative slot suggestions check up to 5 days ahead

---

## Security Notes

- Phone numbers are used as user identifiers
- Cancellation requires matching phone number
- No authentication required for mock mode
- In production, implement proper authentication and authorization
