# Healthcare Appointment Voicebot - Edge Case Test Cases

## Test Case Format
- **Test Case Name**: Descriptive name of the test
- **Endpoint**: API endpoint to test
- **Request Body**: Sample request payload
- **Expected Response**: Expected API response structure
- **Expected Bot Message**: Expected conversational response
- **Status**: PASS/FAIL (to be filled after execution)

---

## 1. Fully Booked Doctor

### Test Case 1.1: Book appointment when all slots are booked
- **Test Case Name**: Book appointment when doctor has no available slots
- **Endpoint**: `POST /healthcare/book`
- **Request Body**:
  ```json
  {
    "doctorId": "doc-1",
    "date": "2026-05-20",
    "time": "10:00",
    "patientName": "John Doe",
    "phoneNumber": "919999999999",
    "reason": "Regular checkup"
  }
  ```
- **Expected Response**:
  ```json
  {
    "success": false,
    "error": "Slot not available",
    "details": "The slot at 10:00 on 2026-05-20 is not available or already booked"
  }
  ```
- **Expected Bot Message**: "I'm sorry, but the doctor is fully booked on that date. Would you like me to suggest alternative dates or times?"
- **Status**: [TO BE FILLED]

### Test Case 1.2: Check availability for fully booked doctor
- **Test Case Name**: Check availability when doctor has no slots available
- **Endpoint**: `POST /healthcare/availability`
- **Request Body**:
  ```json
  {
    "doctorId": "doc-1",
    "date": "2026-05-20"
  }
  ```
- **Expected Response**:
  ```json
  {
    "success": true,
    "message": "Availability retrieved successfully",
    "availability": {
      "doctorId": "doc-1",
      "availableSlots": [],
      "totalSlots": 8,
      "bookedSlots": 8
    }
  }
  ```
- **Expected Bot Message**: "The doctor is fully booked on this date. Would you like to check availability for a different date?"
- **Status**: [TO BE FILLED]

---

## 2. Invalid Doctor

### Test Case 2.1: Book appointment with non-existent doctor ID
- **Test Case Name**: Book appointment with invalid doctor ID
- **Endpoint**: `POST /healthcare/book`
- **Request Body**:
  ```json
  {
    "doctorId": "doc-999",
    "date": "2026-05-20",
    "time": "10:00",
    "patientName": "John Doe",
    "phoneNumber": "919999999999",
    "reason": "Regular checkup"
  }
  ```
- **Expected Response**:
  ```json
  {
    "success": false,
    "error": "Doctor not found",
    "details": "No doctor found with ID: doc-999"
  }
  ```
- **Expected Bot Message**: "I couldn't find that doctor. Would you like me to show you available doctors or search by specialization?"
- **Status**: [TO BE FILLED]

### Test Case 2.2: Check availability for invalid doctor
- **Test Case Name**: Check availability with invalid doctor ID
- **Endpoint**: `POST /healthcare/availability`
- **Request Body**:
  ```json
  {
    "doctorId": "doc-999",
    "date": "2026-05-20"
  }
  ```
- **Expected Response**:
  ```json
  {
    "success": false,
    "error": "Doctor not found",
    "details": "No doctor found with ID: doc-999"
  }
  ```
- **Expected Bot Message**: "I couldn't find that doctor. Please provide a valid doctor ID or specialization."
- **Status**: [TO BE FILLED]

---

## 3. Invalid Specialization

### Test Case 3.1: Book appointment with invalid specialization
- **Test Case Name**: Book appointment with non-existent specialization
- **Endpoint**: `POST /healthcare/book`
- **Request Body**:
  ```json
  {
    "specialization": "neurosurgeon",
    "date": "2026-05-20",
    "time": "10:00",
    "patientName": "John Doe",
    "phoneNumber": "919999999999",
    "reason": "Regular checkup"
  }
  ```
- **Expected Response**:
  ```json
  {
    "success": false,
    "error": "No doctor found with specialization",
    "details": "No doctor found with specialization: neurosurgeon"
  }
  ```
- **Expected Bot Message**: "I couldn't find any doctors with that specialization. Available specializations include: dermatologist, cardiologist, dentist, orthopedic, pediatrician, neurologist, general physician."
- **Status**: [TO BE FILLED]

### Test Case 3.2: Check availability with invalid specialization
- **Test Case Name**: Check availability with invalid specialization
- **Endpoint**: `POST /healthcare/availability`
- **Request Body**:
  ```json
  {
    "specialization": "neurosurgeon",
    "date": "2026-05-20"
  }
  ```
- **Expected Response**:
  ```json
  {
    "success": false,
    "error": "No doctor found with specialization",
    "details": "No doctor found with specialization: neurosurgeon"
  }
  ```
- **Expected Bot Message**: "I couldn't find any doctors with that specialization. Would you like to try a different specialization?"
- **Status**: [TO BE FILLED]

---

## 4. Duplicate Booking

### Test Case 4.1: Attempt to book same appointment twice
- **Test Case Name**: Book identical appointment for same patient
- **Endpoint**: `POST /healthcare/book`
- **Request Body**:
  ```json
  {
    "doctorId": "doc-1",
    "date": "2026-05-20",
    "time": "10:00",
    "patientName": "John Doe",
    "phoneNumber": "919999999999",
    "reason": "Regular checkup"
  }
  ```
- **Expected Response**:
  ```json
  {
    "success": false,
    "error": "Duplicate booking",
    "details": "You already have an appointment with this doctor at the same time"
  }
  ```
- **Expected Bot Message**: "You already have an appointment booked at this time. Would you like to reschedule or choose a different time?"
- **Status**: [TO BE FILLED]

### Test Case 4.2: Book overlapping appointment for same patient
- **Test Case Name**: Book overlapping time slot for same patient
- **Endpoint**: `POST /healthcare/book`
- **Request Body**:
  ```json
  {
    "doctorId": "doc-2",
    "date": "2026-05-20",
    "time": "10:30",
    "patientName": "John Doe",
    "phoneNumber": "919999999999",
    "reason": "Regular checkup"
  }
  ```
- **Expected Response**:
  ```json
  {
    "success": false,
    "error": "Overlapping appointment",
    "details": "You have an overlapping appointment at this time"
  }
  ```
- **Expected Bot Message**: "You have an overlapping appointment at this time. Would you like to choose a different time?"
- **Status**: [TO BE FILLED]

---

## 5. Simultaneous Booking

### Test Case 5.1: Concurrent booking requests for same slot
- **Test Case Name**: Two users try to book same slot simultaneously
- **Endpoint**: `POST /healthcare/book` (concurrent requests)
- **Request Body**:
  ```json
  {
    "doctorId": "doc-1",
    "date": "2026-05-20",
    "time": "10:00",
    "patientName": "John Doe",
    "phoneNumber": "919999999999",
    "reason": "Regular checkup"
  }
  ```
- **Expected Response** (first request):
  ```json
  {
    "success": true,
    "message": "Appointment booked successfully",
    "booking": {
      "bookingId": "book-1715678900-abc123"
    }
  }
  ```
- **Expected Response** (second request):
  ```json
  {
    "success": false,
    "error": "Slot not available",
    "details": "The slot at 10:00 on 2026-05-20 is not available or already booked"
  }
  ```
- **Expected Bot Message** (first): "Your appointment has been confirmed."
- **Expected Bot Message** (second): "I'm sorry, but that slot was just booked. Would you like to try a different time?"
- **Status**: [TO BE FILLED]

---

## 6. Past Date Booking

### Test Case 6.1: Book appointment for past date
- **Test Case Name**: Attempt to book appointment for yesterday
- **Endpoint**: `POST /healthcare/book`
- **Request Body**:
  ```json
  {
    "doctorId": "doc-1",
    "date": "2025-05-19",
    "time": "10:00",
    "patientName": "John Doe",
    "phoneNumber": "919999999999",
    "reason": "Regular checkup"
  }
  ```
- **Expected Response**:
  ```json
  {
    "success": false,
    "error": "Invalid date",
    "details": "Cannot book appointment for past date"
  }
  ```
- **Expected Bot Message**: "I can only book appointments for future dates. Would you like to book for tomorrow or another future date?"
- **Status**: [TO BE FILLED]

### Test Case 6.2: Book appointment for today's past time
- **Test Case Name**: Attempt to book appointment for earlier today
- **Endpoint**: `POST /healthcare/book`
- **Request Body**:
  ```json
  {
    "doctorId": "doc-1",
    "date": "2026-05-18",
    "time": "09:00",
    "patientName": "John Doe",
    "phoneNumber": "919999999999",
    "reason": "Regular checkup"
  }
  ```
- **Expected Response**:
  ```json
  {
    "success": false,
    "error": "Invalid time",
    "details": "Cannot book appointment for past time"
  }
  ```
- **Expected Bot Message**: "That time has already passed. Would you like to book for a later time today or another date?"
- **Status**: [TO BE FILLED]

---

## 7. Invalid Cancellation

### Test Case 7.1: Cancel non-existent booking
- **Test Case Name**: Cancel appointment with invalid booking ID
- **Endpoint**: `POST /healthcare/cancel`
- **Request Body**:
  ```json
  {
    "bookingId": "book-invalid-123"
  }
  ```
- **Expected Response**:
  ```json
  {
    "success": false,
    "error": "Booking not found",
    "details": "No booking found with ID: book-invalid-123"
  }
  ```
- **Expected Bot Message**: "I couldn't find that booking. Please check your booking ID or say 'my appointments' to view your bookings."
- **Status**: [TO BE FILLED]

### Test Case 7.2: Cancel already cancelled booking
- **Test Case Name**: Attempt to cancel already cancelled appointment
- **Endpoint**: `POST /healthcare/cancel`
- **Request Body**:
  ```json
  {
    "bookingId": "book-cancelled-123"
  }
  ```
- **Expected Response**:
  ```json
  {
    "success": false,
    "error": "Booking already cancelled",
    "details": "This booking has already been cancelled"
  }
  ```
- **Expected Bot Message**: "This appointment has already been cancelled. Would you like to book a new appointment?"
- **Status**: [TO BE FILLED]

### Test Case 7.3: Cancel completed appointment
- **Test Case Name**: Attempt to cancel past completed appointment
- **Endpoint**: `POST /healthcare/cancel`
- **Request Body**:
  ```json
  {
    "bookingId": "book-completed-123"
  }
  ```
- **Expected Response**:
  ```json
  {
    "success": false,
    "error": "Cannot cancel completed appointment",
    "details": "This appointment has already been completed"
  }
  ```
- **Expected Bot Message**: "This appointment has already been completed. Would you like to book a new appointment?"
- **Status**: [TO BE FILLED]

---

## 8. API Timeout

### Test Case 8.1: Healthcare service timeout during booking
- **Test Case Name**: Booking request times out
- **Endpoint**: `POST /healthcare/book`
- **Request Body**:
  ```json
  {
    "doctorId": "doc-1",
    "date": "2026-05-20",
    "time": "10:00",
    "patientName": "John Doe",
    "phoneNumber": "919999999999",
    "reason": "Regular checkup"
  }
  ```
- **Expected Response**:
  ```json
  {
    "success": false,
    "error": "Request timeout",
    "details": "The request took too long to process"
  }
  ```
- **Expected Bot Message**: "I'm experiencing some delays. Please try again in a moment or say 'help' to speak with an agent."
- **Status**: [TO BE FILLED]

### Test Case 8.2: NLP service timeout during message processing
- **Test Case Name**: NLP analysis times out
- **Endpoint**: `POST /booking/message`
- **Request Body**:
  ```json
  {
    "phoneNumber": "919999999999",
    "userMessage": "I need to book an appointment with Dr. Rajesh tomorrow at 10 AM"
  }
  ```
- **Expected Response**:
  ```json
  {
    "success": false,
    "intent": "FALLBACK",
    "message": "I'm having trouble understanding your request. Please try again or speak with an agent."
  }
  ```
- **Expected Bot Message**: "I'm having trouble understanding your request. Please try again or say 'help' to speak with an agent."
- **Status**: [TO BE FILLED]

---

## 9. Fallback Response

### Test Case 9.1: Unrecognized intent in booking message
- **Test Case Name**: Send unclear booking request
- **Endpoint**: `POST /booking/message`
- **Request Body**:
  ```json
  {
    "phoneNumber": "919999999999",
    "userMessage": "I want something"
  }
  ```
- **Expected Response**:
  ```json
  {
    "success": false,
    "intent": "FALLBACK",
    "message": "I didn't understand that. You can:\n- Book an appointment (e.g., 'Book appointment with Dr. Rajesh')\n- Cancel an appointment (e.g., 'Cancel my appointment')\n- Reschedule an appointment (e.g., 'Actually reschedule to Friday')\n- Check available slots\n- View my bookings\n- Talk to a human agent",
    "suggestions": [
      "Try: I need a skin doctor tomorrow evening",
      "Try: Show me available slots for a dentist",
      "Try: I want to talk to a human agent"
    ]
  }
  ```
- **Expected Bot Message**: "I didn't understand that. You can book an appointment, cancel, reschedule, check slots, view bookings, or talk to a human agent."
- **Status**: [TO BE FILLED]

### Test Case 9.2: Low confidence NLP detection
- **Test Case Name**: Ambiguous user message with low confidence
- **Endpoint**: `POST /booking/message`
- **Request Body**:
  ```json
  {
    "phoneNumber": "919999999999",
    "userMessage": "maybe doctor"
  }
  ```
- **Expected Response**:
  ```json
  {
    "success": false,
    "intent": "FALLBACK",
    "hasAmbiguity": true,
    "ambiguityNotes": "Low confidence - may need clarification",
    "message": "I'm not sure what you mean. Could you please be more specific?"
  }
  ```
- **Expected Bot Message**: "I'm not sure what you mean. Could you please be more specific? For example, 'Book appointment with Dr. Rajesh' or 'Check available slots'."
- **Status**: [TO BE FILLED]

---

## 10. Interruption During Workflow

### Test Case 10.1: User interrupts booking workflow
- **Test Case Name**: Start booking, then cancel workflow
- **Endpoint**: `POST /voicebot/cancel`
- **Request Body**:
  ```json
  {
    "phoneNumber": "919999999999"
  }
  ```
- **Expected Response**:
  ```json
  {
    "success": true,
    "message": "Workflow cancelled"
  }
  ```
- **Expected Bot Message**: "I've cancelled the booking process. Is there anything else I can help you with?"
- **Status**: [TO BE FILLED]

### Test Case 10.2: Max retries exceeded in workflow
- **Test Case Name**: User provides invalid input 3 times in a row
- **Endpoint**: `POST /voicebot/retry`
- **Request Body**:
  ```json
  {
    "phoneNumber": "919999999999"
  }
  ```
- **Expected Response**:
  ```json
  {
    "success": false,
    "error": "No active workflow or max retries exceeded",
    "retryCount": 3,
    "maxRetriesReached": true
  }
  ```
- **Expected Bot Message**: "I'm having trouble understanding. Would you like to start over or speak with a human agent?"
- **Status**: [TO BE FILLED]

### Test Case 10.3: User abandons workflow (no response)
- **Test Case Name**: Workflow expires due to inactivity
- **Endpoint**: `POST /voicebot/input` (after 30 minutes of inactivity)
- **Request Body**:
  ```json
  {
    "phoneNumber": "919999999999",
    "userMessage": "dermatologist"
  }
  ```
- **Expected Response**:
  ```json
  {
    "success": true,
    "contextReset": true,
    "message": "Your session has expired. Starting a new conversation."
  }
  ```
- **Expected Bot Message**: "I haven't heard from you in a while. Let's start fresh. What would you like help with today?"
- **Status**: [TO BE FILLED]

---

## 11. Context Switching During Booking

### Test Case 11.1: Switch from booking to cancellation mid-flow
- **Test Case Name**: Start booking, then ask to cancel
- **Endpoint**: `POST /voicebot/input`
- **Request Body**:
  ```json
  {
    "phoneNumber": "919999999999",
    "userMessage": "Actually, cancel my appointment"
  }
  ```
- **Expected Response**:
  ```json
  {
    "success": true,
    "contextSwitched": true,
    "newIntent": "CANCEL_APPOINTMENT",
    "prompt": "I can help you cancel an appointment. Please provide your booking ID."
  }
  ```
- **Expected Bot Message**: "I understand you want to cancel instead. I can help you cancel an appointment. Please provide your booking ID."
- **Status**: [TO BE FILLED]

### Test Case 11.2: Switch from booking to escalation mid-flow
- **Test Case Name**: Start booking, then ask for human agent
- **Endpoint**: `POST /voicebot/input`
- **Request Body**:
  ```json
  {
    "phoneNumber": "919999999999",
    "userMessage": "I want to talk to a human agent"
  }
  ```
- **Expected Response**:
  ```json
  {
    "success": true,
    "contextSwitched": true,
    "newIntent": "ESCALATE_TO_AGENT",
    "prompt": "I understand you want to speak with a human. Let me connect you to our support team."
  }
  ```
- **Expected Bot Message**: "I understand you want to speak with a human. Let me connect you to our support team."
- **Status**: [TO BE FILLED]

### Test Case 11.3: Switch from reschedule to booking mid-flow
- **Test Case Name**: Start reschedule, then decide to book new appointment
- **Endpoint**: `POST /voicebot/input`
- **Request Body**:
  ```json
  {
    "phoneNumber": "919999999999",
    "userMessage": "Actually, I want to book a new appointment instead"
  }
  ```
- **Expected Response**:
  ```json
  {
    "success": true,
    "contextSwitched": true,
    "newIntent": "BOOK_APPOINTMENT",
    "prompt": "I can help you book a new appointment instead of rescheduling. What type of doctor do you need?"
  }
  ```
- **Expected Bot Message**: "I can help you book a new appointment instead of rescheduling. What type of doctor do you need?"
- **Status**: [TO BE FILLED]

---

## 12. Unavailable Doctor/Date

### Test Case 12.1: Book appointment on doctor's unavailable date
- **Test Case Name**: Doctor marked as unavailable for specific date
- **Endpoint**: `POST /healthcare/book`
- **Request Body**:
  ```json
  {
    "doctorId": "doc-1",
    "date": "2026-05-25",
    "time": "10:00",
    "patientName": "John Doe",
    "phoneNumber": "919999999999",
    "reason": "Regular checkup"
  }
  ```
- **Expected Response**:
  ```json
  {
    "success": false,
    "error": "Doctor unavailable",
    "details": "Dr. Rajesh Kumar is not available on 2026-05-25"
  }
  ```
- **Expected Bot Message**: "The doctor is not available on that date. Would you like me to suggest alternative dates or check availability for a different doctor?"
- **Status**: [TO BE FILLED]

### Test Case 12.2: Book appointment on weekend/holiday
- **Test Case Name**: Attempt to book on non-working day
- **Endpoint**: `POST /healthcare/book`
- **Request Body**:
  ```json
  {
    "doctorId": "doc-1",
    "date": "2026-05-24",
    "time": "10:00",
    "patientName": "John Doe",
    "phoneNumber": "919999999999",
    "reason": "Regular checkup"
  }
  ```
- **Expected Response**:
  ```json
  {
    "success": false,
    "error": "Clinic closed",
    "details": "The clinic is closed on weekends and holidays"
  }
  ```
- **Expected Bot Message**: "The clinic is closed on that day. Would you like to book for a weekday instead?"
- **Status**: [TO BE FILLED]

### Test Case 12.3: Book appointment outside working hours
- **Test Case Name**: Attempt to book before/after clinic hours
- **Endpoint**: `POST /healthcare/book`
- **Request Body**:
  ```json
  {
    "doctorId": "doc-1",
    "date": "2026-05-20",
    "time": "07:00",
    "patientName": "John Doe",
    "phoneNumber": "919999999999",
    "reason": "Regular checkup"
  }
  ```
- **Expected Response**:
  ```json
  {
    "success": false,
    "error": "Outside working hours",
    "details": "Clinic hours are 9:00 AM to 6:00 PM"
  }
  ```
- **Expected Bot Message**: "The clinic is closed at that time. Working hours are 9:00 AM to 6:00 PM. Would you like to book during working hours?"
- **Status**: [TO BE FILLED]

---

## 13. Mixed Language Edge Cases

### Test Case 13.1: Mixed Hindi/English with typos
- **Test Case Name**: Book with mixed language and typos
- **Endpoint**: `POST /booking/message`
- **Request Body**:
  ```json
  {
    "phoneNumber": "919999999999",
    "userMessage": "kal docter book karo skin specalist"
  }
  ```
- **Expected Response**:
  ```json
  {
    "success": true,
    "intent": "BOOK_APPOINTMENT",
    "entities": {
      "specialization": "dermatologist",
      "date": "2026-05-19"
    }
  }
  ```
- **Expected Bot Message**: "I can help you book an appointment with a dermatologist for tomorrow. What time would you prefer?"
- **Status**: [TO BE FILLED]

### Test Case 13.2: Incomplete mixed language input
- **Test Case Name**: Partial Hindi phrase without context
- **Endpoint**: `POST /booking/message`
- **Request Body**:
  ```json
  {
    "phoneNumber": "919999999999",
    "userMessage": "aaj"
  }
  ```
- **Expected Response**:
  ```json
  {
    "success": false,
    "intent": "FALLBACK",
    "message": "I need more information. What would you like to do today?"
  }
  ```
- **Expected Bot Message**: "I need more information. Would you like to book an appointment, check slots, or view your bookings?"
- **Status**: [TO BE FILLED]

---

## 14. Reschedule Edge Cases

### Test Case 14.1: Reschedule to same slot
- **Test Case Name**: Attempt to reschedule to same date/time
- **Endpoint**: `POST /healthcare/reschedule`
- **Request Body**:
  ```json
  {
    "bookingId": "book-123",
    "newDate": "2026-05-20",
    "newTime": "10:00",
    "reason": "Schedule conflict"
  }
  ```
- **Expected Response**:
  ```json
  {
    "success": false,
    "error": "Same slot",
    "details": "New date and time are the same as current booking"
  }
  ```
- **Expected Bot Message**: "The new date and time are the same as your current appointment. Would you like to choose a different time?"
- **Status**: [TO BE FILLED]

### Test Case 14.2: Reschedule without existing booking
- **Test Case Name**: Reschedule non-existent booking
- **Endpoint**: `POST /healthcare/reschedule`
- **Request Body**:
  ```json
  {
    "bookingId": "book-invalid",
    "newDate": "2026-05-21",
    "newTime": "14:00",
    "reason": "Schedule conflict"
  }
  ```
- **Expected Response**:
  ```json
  {
    "success": false,
    "error": "Booking not found",
    "details": "No booking found with ID: book-invalid"
  }
  ```
- **Expected Bot Message**: "I couldn't find that booking. Please check your booking ID or say 'my appointments' to view your bookings."
- **Status**: [TO BE FILLED]

---

## 15. Alternate Slot Suggestions Edge Cases

### Test Case 15.1: No alternate slots available
- **Test Case Name**: Request alternate slots when none available
- **Endpoint**: `POST /voicebot/alternate-slots`
- **Request Body**:
  ```json
  {
    "phoneNumber": "919999999999",
    "doctorId": "doc-1",
    "preferredDate": "2026-05-20",
    "preferredTime": "10:00",
    "limit": 3
  }
  ```
- **Expected Response**:
  ```json
  {
    "success": true,
    "alternateSlots": [],
    "message": "No alternate slots available for 2026-05-20"
  }
  ```
- **Expected Bot Message**: "I'm sorry, there are no alternative slots available on that date. Would you like to try a different date?"
- **Status**: [TO BE FILLED]

### Test Case 15.2: Alternate slots with invalid doctor
- **Test Case Name**: Request alternate slots for invalid doctor
- **Endpoint**: `POST /voicebot/alternate-slots`
- **Request Body**:
  ```json
  {
    "phoneNumber": "919999999999",
    "doctorId": "doc-999",
    "preferredDate": "2026-05-20",
    "preferredTime": "10:00",
    "limit": 3
  }
  ```
- **Expected Response**:
  ```json
  {
    "success": true,
    "alternateSlots": [
      { "date": "2026-05-20", "time": "09:00", "available": true },
      { "date": "2026-05-20", "time": "14:00", "available": true },
      { "date": "2026-05-20", "time": "16:00", "available": true }
    ],
    "message": "Here are 3 alternative time slots for 2026-05-20"
  }
  ```
- **Expected Bot Message**: "Here are some alternative time slots for that date."
- **Status**: [TO BE FILLED]

---

## Summary

Total Test Cases: 30

### Categories:
- Fully Booked Doctor: 2
- Invalid Doctor: 2
- Invalid Specialization: 2
- Duplicate Booking: 2
- Simultaneous Booking: 1
- Past Date Booking: 2
- Invalid Cancellation: 3
- API Timeout: 2
- Fallback Response: 2
- Interruption During Workflow: 3
- Context Switching During Booking: 3
- Unavailable Doctor/Date: 3
- Mixed Language Edge Cases: 2
- Reschedule Edge Cases: 2
- Alternate Slot Suggestions Edge Cases: 2

### Endpoints Tested:
- POST /healthcare/book
- POST /healthcare/cancel
- POST /healthcare/reschedule
- POST /healthcare/availability
- POST /booking/message
- POST /voicebot/start
- POST /voicebot/input
- POST /voicebot/retry
- POST /voicebot/cancel
- POST /voicebot/alternate-slots
- GET /voicebot/workflows
