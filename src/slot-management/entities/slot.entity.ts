export interface DoctorSchedule {
  doctorId: string;
  name: string;
  specialization: string;
  slotDuration: number; // in minutes
  dailyBookingLimit: number;
  availableTimings: TimeSlot[];
  unavailablePeriods: UnavailablePeriod[];
}

export interface TimeSlot {
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  daysOfWeek: number[]; // 0-6 (Sunday-Saturday)
}

export interface UnavailablePeriod {
  date: string; // YYYY-MM-DD
  startTime?: string;
  endTime?: string;
  reason?: string;
}

export interface Slot {
  slotId: string;
  doctorId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  isAvailable: boolean;
  bookedBy?: string;
}

export interface BookingRecord {
  bookingId: string;
  doctorId: string;
  doctorName: string;
  specialization: string;
  patientName: string;
  patientPhone: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  status: 'CONFIRMED' | 'CANCELLED';
  createdAt: Date;
  cancelledAt?: Date;
}
