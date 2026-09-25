export type ClassStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED' | 'MISSED' | 'TEACHER_ABSENT';

export type PaymentStatus = 'UNPAID' | 'PAID' | 'PARTIALLY_PAID' | 'WAIVED' | 'COVERED_BY_ADVANCE' | 'FREE';

export type PaymentPolicyType = 'PER_CLASS' | 'AFTER_N_CLASSES' | 'ADVANCE_CYCLE';

export type CalendarEventType = 'EXAM' | 'ASSIGNMENT_DUE' | 'HOLIDAY' | 'PARENT_MEETING' | 'NOTE';

export interface Subject {
  id: string;
  name: string;
  color?: string;
  defaultDurationMin: number;
  notes?: string;
}

export interface PaymentPolicy {
  type: PaymentPolicyType;
  cycleSize: number; // e.g. 4 classes per payment cycle
  advanceBalance: number; // available monetary credit prepaid
  isDelayed: boolean;
  delayedUntil?: string; // ISO date 'YYYY-MM-DD'
  delayReason?: string;
}

export interface Teacher {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  hourlyRate: number; // Rate per day (৳/day)
  dailyRate?: number; // Rate per day (৳/day)
  subjectIds: string[];
  color?: string; // Default paid class color
  freeClassColor?: string; // Color for free classes
  paymentPolicy: PaymentPolicy;
  weekdays?: number[]; // e.g. [1, 3, 5] (0 = Sun, 1 = Mon, ..., 6 = Sat)
  defaultTime?: string; // e.g. "16:00"
  defaultDurationMin?: number; // default 60
  defaultSubjectId?: string;
  createdAt: string;
}

export interface RecurringSchedule {
  id: string;
  teacherId: string;
  subjectId: string;
  dayOfWeek: number; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  startTime: string; // "17:00"
  durationMin: number;
  rate: number;
  isActive: boolean;
}

export interface SessionNote {
  id: string;
  sessionId: string;
  content: string;
  isHomework: boolean;
  createdAt: string;
}

export interface ClassSession {
  id: string;
  scheduleId?: string;
  teacherId: string;
  subjectId: string;
  scheduledAt: string; // ISO string "YYYY-MM-DDTHH:mm:ss"
  durationMin: number;
  fee: number;
  isFree?: boolean; // When true, class is free of charge (trial or complimentary)
  isExtra?: boolean; // When true, this was scheduled as an extra class
  attendance?: 'PRESENT' | 'ABSENT'; // Default is 'PRESENT'
  status: ClassStatus;
  paymentStatus: PaymentStatus;
  notes: SessionNote[];
  paymentId?: string;
  paidAt?: string;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  recordedBy?: 'ADMIN' | 'TEACHER';
  rejectionReason?: string;
}

export type TuitionShareType = 'teacher' | 'teachers' | 'subject' | 'subjects' | 'all';

export interface TuitionShareLink {
  id: string;
  token: string;
  label: string | null;
  type: TuitionShareType;
  params: {
    teacherId?: string;
    teacherIds?: string[];
    subjectId?: string;
    subjectIds?: string[];
  };
  expiresAt: string | null;
  neverExpires: boolean;
  allowRecordClass: boolean;
  createdAt: string;
  revokedAt: string | null;
  viewCount?: number;
}

export interface PaymentRecord {
  id: string;
  teacherId: string;
  sessionIds: string[];
  type: 'PER_CLASS' | 'CYCLE_SETTLEMENT' | 'ADVANCE_DEPOSIT';
  amount: number;
  paidAt: string;
  method: string;
  reference?: string;
  note?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startAt: string; // ISO string
  endAt?: string;
  eventType: CalendarEventType;
  subjectId?: string;
}
