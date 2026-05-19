import { DoctorSchedule } from '../entities/slot.entity';

export const MOCK_DOCTORS: DoctorSchedule[] = [
  {
    doctorId: 'doc-1',
    name: 'Dr. Rajesh Kumar',
    specialization: 'dermatologist',
    slotDuration: 30,
    dailyBookingLimit: 10,
    availableTimings: [
      {
        startTime: '09:00',
        endTime: '12:00',
        daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
      },
      {
        startTime: '14:00',
        endTime: '17:00',
        daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
      },
      {
        startTime: '10:00',
        endTime: '13:00',
        daysOfWeek: [6], // Saturday
      },
    ],
    unavailablePeriods: [
      {
        date: new Date().toISOString().split('T')[0], // Today
        reason: 'Conference',
      },
    ],
  },
  {
    doctorId: 'doc-2',
    name: 'Dr. Jatin Das',
    specialization: 'cardiologist',
    slotDuration: 45,
    dailyBookingLimit: 8,
    availableTimings: [
      {
        startTime: '08:00',
        endTime: '11:00',
        daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
      },
      {
        startTime: '15:00',
        endTime: '18:00',
        daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
      },
    ],
    unavailablePeriods: [],
  },
  {
    doctorId: 'doc-3',
    name: 'Dr. Priya Singh',
    specialization: 'dentist',
    slotDuration: 20,
    dailyBookingLimit: 12,
    availableTimings: [
      {
        startTime: '10:00',
        endTime: '13:00',
        daysOfWeek: [1, 2, 3, 4, 5, 6], // Mon-Sat
      },
      {
        startTime: '16:00',
        endTime: '20:00',
        daysOfWeek: [1, 2, 3, 4, 5, 6], // Mon-Sat
      },
    ],
    unavailablePeriods: [],
  },
  {
    doctorId: 'doc-4',
    name: 'Dr. Amit Patel',
    specialization: 'orthopedic',
    slotDuration: 40,
    dailyBookingLimit: 9,
    availableTimings: [
      {
        startTime: '09:00',
        endTime: '12:00',
        daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
      },
      {
        startTime: '14:00',
        endTime: '17:00',
        daysOfWeek: [2, 4], // Tue, Thu
      },
    ],
    unavailablePeriods: [],
  },
  {
    doctorId: 'doc-5',
    name: 'Dr. Sarah Johnson',
    specialization: 'skin specialist',
    slotDuration: 30,
    dailyBookingLimit: 10,
    availableTimings: [
      {
        startTime: '09:00',
        endTime: '13:00',
        daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
      },
      {
        startTime: '15:00',
        endTime: '18:00',
        daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
      },
    ],
    unavailablePeriods: [],
  },
  {
    doctorId: 'doc-6',
    name: 'Dr. Michael Chen',
    specialization: 'physician',
    slotDuration: 30,
    dailyBookingLimit: 15,
    availableTimings: [
      {
        startTime: '08:00',
        endTime: '12:00',
        daysOfWeek: [1, 2, 3, 4, 5, 6], // Mon-Sat
      },
      {
        startTime: '14:00',
        endTime: '18:00',
        daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
      },
    ],
    unavailablePeriods: [],
  },
  {
    doctorId: 'doc-7',
    name: 'Dr. Emily Wilson',
    specialization: 'general doctor',
    slotDuration: 30,
    dailyBookingLimit: 15,
    availableTimings: [
      {
        startTime: '09:00',
        endTime: '13:00',
        daysOfWeek: [1, 2, 3, 4, 5, 6], // Mon-Sat
      },
      {
        startTime: '15:00',
        endTime: '19:00',
        daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
      },
    ],
    unavailablePeriods: [],
  },
];

export const MOCK_BOOKINGS = [
  {
    bookingId: 'book-1',
    doctorId: 'doc-1',
    doctorName: 'Dr. Rajesh Kumar',
    specialization: 'dermatologist',
    patientName: 'Manju Kumari',
    patientPhone: '919999999999',
    date: new Date().toISOString().split('T')[0],
    startTime: '10:00',
    endTime: '10:30',
    status: 'CONFIRMED' as const,
    createdAt: new Date(),
  },
  {
    bookingId: 'book-2',
    doctorId: 'doc-2',
    doctorName: 'Dr. Jatin Das',
    specialization: 'cardiologist',
    patientName: 'Manju Kumari',
    patientPhone: '919999999999',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
    startTime: '09:00',
    endTime: '09:45',
    status: 'CONFIRMED' as const,
    createdAt: new Date(),
  },
];
