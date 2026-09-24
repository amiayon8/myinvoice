import { 
  Subject, 
  Teacher, 
  RecurringSchedule, 
  ClassSession, 
  PaymentRecord, 
  CalendarEvent 
} from '@/types/tuition';

const STORAGE_KEYS = {
  SUBJECTS: 'tuition_subjects_v2',
  TEACHERS: 'tuition_teachers_v2',
  SCHEDULES: 'tuition_schedules_v2',
  SESSIONS: 'tuition_sessions_v2',
  PAYMENTS: 'tuition_payments_v2',
  EVENTS: 'tuition_events_v2',
};

// CLEAN PRODUCTION INITIAL DATA - ALL MOCK DATA PURGED
export const INITIAL_SUBJECTS: Subject[] = [];

export const TEACHER_PALETTE = [
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#8b5cf6', // Violet
  '#f59e0b', // Amber
  '#ec4899', // Rose
  '#06b6d4', // Cyan
  '#6366f1', // Indigo
  '#14b8a6', // Teal
];

export const TEACHER_FREE_PALETTE = [
  '#93c5fd', // Light Blue
  '#6ee7b7', // Mint
  '#c4b5fd', // Lavender
  '#fde047', // Light Sun
  '#f9a8d4', // Light Pink
  '#67e8f9', // Light Cyan
  '#a5b4fc', // Light Indigo
  '#5eead4', // Light Teal
];

// Helper to resolve a teacher's session color based on whether it is a free class or paid class
export function getTeacherSessionColor(
  teacher: Teacher | undefined,
  isFree: boolean,
  index = 0
): string {
  if (isFree) {
    if (teacher?.freeClassColor) return teacher.freeClassColor;
    // Auto-match paired free color from the palette
    const baseColor = teacher?.color || TEACHER_PALETTE[index % TEACHER_PALETTE.length] || '#3b82f6';
    const palIdx = TEACHER_PALETTE.indexOf(baseColor);
    if (palIdx !== -1 && TEACHER_FREE_PALETTE[palIdx]) {
      return TEACHER_FREE_PALETTE[palIdx];
    }
    return '#6ee7b7'; // default soft mint
  }
  if (teacher?.color) return teacher.color;
  return TEACHER_PALETTE[index % TEACHER_PALETTE.length] || '#3b82f6';
}

export const INITIAL_TEACHERS: Teacher[] = [];

export const INITIAL_SCHEDULES: RecurringSchedule[] = [];

export const INITIAL_SESSIONS: ClassSession[] = [];

export const INITIAL_PAYMENTS: PaymentRecord[] = [];

export const INITIAL_EVENTS: CalendarEvent[] = [];

// Browser Local Storage Helpers (Used for fast client-side caching & offline safety)
function getStored<T>(key: string, defaultVal: T): T {
  if (typeof window === 'undefined') return defaultVal;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultVal;
  } catch (e) {
    console.error(`Error reading ${key} from storage:`, e);
    return defaultVal;
  }
}

function setStored<T>(key: string, val: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error(`Error saving ${key} to storage:`, e);
  }
}

// Storage API
export const TuitionStorage = {
  getSubjects: (): Subject[] => getStored(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS),
  saveSubjects: (subs: Subject[]) => setStored(STORAGE_KEYS.SUBJECTS, subs),

  getTeachers: (): Teacher[] => getStored(STORAGE_KEYS.TEACHERS, INITIAL_TEACHERS),
  saveTeachers: (teachers: Teacher[]) => setStored(STORAGE_KEYS.TEACHERS, teachers),

  getSchedules: (): RecurringSchedule[] => getStored(STORAGE_KEYS.SCHEDULES, INITIAL_SCHEDULES),
  saveSchedules: (schedules: RecurringSchedule[]) => setStored(STORAGE_KEYS.SCHEDULES, schedules),

  getSessions: (): ClassSession[] => getStored(STORAGE_KEYS.SESSIONS, INITIAL_SESSIONS),
  saveSessions: (sessions: ClassSession[]) => setStored(STORAGE_KEYS.SESSIONS, sessions),

  getPayments: (): PaymentRecord[] => getStored(STORAGE_KEYS.PAYMENTS, INITIAL_PAYMENTS),
  savePayments: (payments: PaymentRecord[]) => setStored(STORAGE_KEYS.PAYMENTS, payments),

  getEvents: (): CalendarEvent[] => getStored(STORAGE_KEYS.EVENTS, INITIAL_EVENTS),
  saveEvents: (events: CalendarEvent[]) => setStored(STORAGE_KEYS.EVENTS, events),

  resetToDefault: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEYS.SUBJECTS);
    localStorage.removeItem(STORAGE_KEYS.TEACHERS);
    localStorage.removeItem(STORAGE_KEYS.SCHEDULES);
    localStorage.removeItem(STORAGE_KEYS.SESSIONS);
    localStorage.removeItem(STORAGE_KEYS.PAYMENTS);
    localStorage.removeItem(STORAGE_KEYS.EVENTS);
    // Also clean v1 keys
    localStorage.removeItem('tuition_subjects_v1');
    localStorage.removeItem('tuition_teachers_v1');
    localStorage.removeItem('tuition_schedules_v1');
    localStorage.removeItem('tuition_sessions_v1');
    localStorage.removeItem('tuition_payments_v1');
    localStorage.removeItem('tuition_events_v1');
  }
};

// Teacher Payment Status Calculation Engine
export interface TeacherFinancialProfile {
  teacher: Teacher;
  unpaidCompletedSessions: ClassSession[];
  unpaidTotalAmount: number;
  completedCycleCount: number;
  cycleThreshold: number;
  isCycleDue: boolean;
  overdueCount: number;
  advanceBalance: number;
  classesCoveredByAdvance: number;
  isDelayed: boolean;
  delayedUntil?: string;
  delayReason?: string;
  isDelayExpired: boolean;
  policyDescription: string;
  freeClassesCount: number;
  badge: {
    label: string;
    variant: 'due' | 'delay' | 'advance' | 'progress' | 'settled';
    subtext: string;
  };
}

export function calculateTeacherFinance(
  teacher: Teacher, 
  sessions: ClassSession[]
): TeacherFinancialProfile {
  const teacherSessions = sessions.filter(s => s.teacherId === teacher.id);
  
  // Filter out FREE & ABSENT sessions - only attended, billable classes accrue debt or count in settlement cycles
  const unpaidCompleted = teacherSessions.filter(
    s => s.status === 'COMPLETED' && 
         s.paymentStatus === 'UNPAID' && 
         !s.isFree &&
         s.attendance !== 'ABSENT'
  );

  const freeSessions = teacherSessions.filter(
    s => s.isFree || s.paymentStatus === 'FREE'
  );

  const unpaidTotalAmount = unpaidCompleted.reduce((acc, curr) => acc + curr.fee, 0);
  const cycleThreshold = teacher.paymentPolicy.cycleSize || 1;
  const count = unpaidCompleted.length;
  const isCycleDue = count >= cycleThreshold;
  const overdueCount = Math.max(0, count - cycleThreshold);

  // Advance calculations
  const advanceBalance = teacher.paymentPolicy.advanceBalance || 0;
  const ratePerDay = Number(teacher.dailyRate ?? teacher.hourlyRate ?? 500);
  const classesCoveredByAdvance = Math.floor(advanceBalance / (ratePerDay || 1));

  // Delay calculations
  const isDelayed = Boolean(teacher.paymentPolicy.isDelayed);
  const delayedUntil = teacher.paymentPolicy.delayedUntil;
  const delayReason = teacher.paymentPolicy.delayReason;
  let isDelayExpired = false;

  if (isDelayed && delayedUntil) {
    const dueDate = new Date(delayedUntil);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    if (today > dueDate) {
      isDelayExpired = true;
    }
  }

  // Determine policy description & primary badge
  let policyDescription = '';
  if (teacher.paymentPolicy.type === 'PER_CLASS') {
    policyDescription = 'Pay after each class';
  } else if (teacher.paymentPolicy.type === 'AFTER_N_CLASSES') {
    policyDescription = `Pay after every ${cycleThreshold} classes`;
  } else {
    policyDescription = `Prepaid cycle of ${cycleThreshold} classes`;
  }

  let badge: TeacherFinancialProfile['badge'];

  if (isDelayExpired) {
    badge = {
      label: 'Delay Expired',
      variant: 'due',
      subtext: `Was delayed to ${delayedUntil}. Settle ৳${unpaidTotalAmount.toFixed(2)}`,
    };
  } else if (isDelayed) {
    badge = {
      label: `Delayed until ${delayedUntil}`,
      variant: 'delay',
      subtext: delayReason || 'Payment settlement postponed by mutual agreement',
    };
  } else if (teacher.paymentPolicy.type === 'ADVANCE_CYCLE') {
    if (advanceBalance <= 0) {
      badge = {
        label: 'Advance Depleted',
        variant: 'due',
        subtext: `0 advance credit remaining. Renewal payment required for next cycle`,
      };
    } else {
      badge = {
        label: `Advance Active`,
        variant: 'advance',
        subtext: `৳${advanceBalance.toFixed(2)} remaining (approx ~${classesCoveredByAdvance} sessions covered)`,
      };
    }
  } else if (isCycleDue) {
    badge = {
      label: 'Payment Due',
      variant: 'due',
      subtext: `${count} of ${cycleThreshold} classes completed. Settle ৳${unpaidTotalAmount.toFixed(2)}`,
    };
  } else if (count > 0) {
    badge = {
      label: `In Progress (${count}/${cycleThreshold})`,
      variant: 'progress',
      subtext: `${cycleThreshold - count} classes remaining until next settlement cycle`,
    };
  } else {
    badge = {
      label: 'Settled',
      variant: 'settled',
      subtext: 'No unpaid completed sessions',
    };
  }

  return {
    teacher,
    unpaidCompletedSessions: unpaidCompleted,
    unpaidTotalAmount,
    completedCycleCount: count,
    cycleThreshold,
    isCycleDue,
    overdueCount,
    advanceBalance,
    classesCoveredByAdvance,
    isDelayed,
    delayedUntil,
    delayReason,
    isDelayExpired,
    policyDescription,
    freeClassesCount: freeSessions.length,
    badge,
  };
}
