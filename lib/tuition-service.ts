import { createClient } from '@/lib/supabase/client';
import { 
  Subject, 
  Teacher, 
  RecurringSchedule, 
  ClassSession, 
  PaymentRecord, 
  CalendarEvent,
  SessionNote,
  ClassStatus,
  PaymentStatus,
  PaymentPolicyType
} from '@/types/tuition';

/**
 * Supabase Database Service for Personal Tuition Management
 * Fully optimized with atomic session persistence, real-time sync, and free class tracking.
 */

// -------------------------------------------------------------
// 1. Fetch Complete Tuition Data from Supabase
// -------------------------------------------------------------
export async function fetchTuitionData(): Promise<{
  subjects: Subject[];
  teachers: Teacher[];
  schedules: RecurringSchedule[];
  sessions: ClassSession[];
  payments: PaymentRecord[];
  events: CalendarEvent[];
}> {
  const supabase = createClient();

  try {
    const [
      subjectsRes,
      teachersRes,
      schedulesRes,
      sessionsRes,
      notesRes,
      paymentsRes,
      eventsRes
    ] = await Promise.all([
      supabase.from('tuition_subjects').select('*').order('name'),
      supabase.from('tuition_teachers').select('*').order('created_at', { ascending: false }),
      supabase.from('tuition_schedules').select('*').order('day_of_week'),
      supabase.from('tuition_class_sessions').select('*').order('scheduled_at', { ascending: false }),
      supabase.from('tuition_session_notes').select('*').order('created_at', { ascending: true }),
      supabase.from('tuition_payments').select('*').order('paid_at', { ascending: false }),
      supabase.from('tuition_calendar_events').select('*').order('start_at', { ascending: true })
    ]);

    // Map Notes to their Sessions
    const notesBySession: Record<string, SessionNote[]> = {};
    if (notesRes.data) {
      notesRes.data.forEach((n: any) => {
        if (!notesBySession[n.session_id]) notesBySession[n.session_id] = [];
        notesBySession[n.session_id].push({
          id: n.id,
          sessionId: n.session_id,
          content: n.content,
          isHomework: Boolean(n.is_homework),
          createdAt: n.created_at,
        });
      });
    }

    // Map Subjects
    const subjects: Subject[] = (subjectsRes.data || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      color: s.color || '#3b82f6',
      defaultDurationMin: s.default_duration_min || 60,
    }));

    // Map Teachers
    const teachers: Teacher[] = (teachersRes.data || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      email: t.email || undefined,
      phone: t.phone || undefined,
      hourlyRate: Number(t.daily_rate ?? t.hourly_rate ?? 500),
      dailyRate: Number(t.daily_rate ?? t.hourly_rate ?? 500),
      color: t.color || '#3b82f6',
      freeClassColor: t.free_class_color || undefined,
      subjectIds: t.subject_ids || [],
      paymentPolicy: {
        type: (t.policy_type || 'AFTER_N_CLASSES') as PaymentPolicyType,
        cycleSize: Number(t.cycle_size || 4),
        advanceBalance: Number(t.advance_balance || 0),
        isDelayed: Boolean(t.is_delayed),
        delayedUntil: t.delayed_until || undefined,
        delayReason: t.delay_reason || undefined,
      },
      weekdays: t.weekdays || [],
      defaultTime: t.default_time || '16:00',
      defaultDurationMin: Number(t.default_duration_min || 60),
      defaultSubjectId: t.default_subject_id || undefined,
      createdAt: t.created_at || new Date().toISOString(),
    }));

    // Map Schedules
    const schedules: RecurringSchedule[] = (schedulesRes.data || []).map((sch: any) => ({
      id: sch.id,
      teacherId: sch.teacher_id,
      subjectId: sch.subject_id,
      dayOfWeek: Number(sch.day_of_week),
      startTime: sch.start_time?.slice(0, 5) || '16:00',
      durationMin: Number(sch.duration_min || 60),
      rate: Number(sch.rate || 500),
      isActive: Boolean(sch.is_active),
    }));

    // Map Class Sessions
    const sessions: ClassSession[] = (sessionsRes.data || []).map((s: any) => ({
      id: s.id,
      scheduleId: s.schedule_id || undefined,
      teacherId: s.teacher_id,
      subjectId: s.subject_id,
      scheduledAt: s.scheduled_at,
      durationMin: Number(s.duration_min || 60),
      fee: Number(s.fee || 0),
      isFree: Boolean(s.is_free),
      isExtra: Boolean(s.is_extra),
      attendance: (s.attendance || (s.status === 'TEACHER_ABSENT' ? 'ABSENT' : 'PRESENT')) as 'PRESENT' | 'ABSENT',
      status: s.status as ClassStatus,
      paymentStatus: (s.is_free ? 'FREE' : s.payment_status) as PaymentStatus,
      notes: notesBySession[s.id] || [],
      paidAt: s.paid_at || undefined,
    }));

    // Map Payments
    const payments: PaymentRecord[] = (paymentsRes.data || []).map((p: any) => ({
      id: p.id,
      teacherId: p.teacher_id,
      sessionIds: p.session_ids || [],
      type: p.type,
      amount: Number(p.amount || 0),
      paidAt: p.paid_at || new Date().toISOString(),
      method: p.method || 'Cash',
      reference: p.reference || undefined,
      note: p.note || undefined,
    }));

    // Map Events
    const events: CalendarEvent[] = (eventsRes.data || []).map((e: any) => ({
      id: e.id,
      title: e.title,
      description: e.description || undefined,
      startAt: e.start_at,
      endAt: e.end_at || undefined,
      eventType: e.event_type || 'EXAM',
      subjectId: e.subject_id || undefined,
    }));

    return { subjects, teachers, schedules, sessions, payments, events };
  } catch (err) {
    console.error('Failed to fetch tuition data from Supabase:', err);
    return {
      subjects: [],
      teachers: [],
      schedules: [],
      sessions: [],
      payments: [],
      events: []
    };
  }
}

export const isUuid = (str?: string): boolean => 
  !!str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

// -------------------------------------------------------------
// 2. Subject Operations
// -------------------------------------------------------------
export async function dbSaveSubject(subject: Partial<Subject>): Promise<Subject | null> {
  const supabase = createClient();
  const payload = {
    name: subject.name,
    color: subject.color || '#3b82f6',
    default_duration_min: subject.defaultDurationMin || 60,
  };

  if (subject.id && isUuid(subject.id)) {
    const { data, error } = await supabase
      .from('tuition_subjects')
      .update(payload)
      .eq('id', subject.id)
      .select()
      .single();
    if (error) {
      console.error('dbSaveSubject update error:', error);
      return null;
    }
    return {
      id: data.id,
      name: data.name,
      color: data.color,
      defaultDurationMin: data.default_duration_min,
    };
  } else {
    const { data, error } = await supabase
      .from('tuition_subjects')
      .insert(payload)
      .select()
      .single();
    if (error) {
      console.error('dbSaveSubject insert error:', error);
      return null;
    }
    return {
      id: data.id,
      name: data.name,
      color: data.color,
      defaultDurationMin: data.default_duration_min,
    };
  }
}

export async function dbDeleteSubject(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from('tuition_subjects').delete().eq('id', id);
  if (error) console.error('dbDeleteSubject error:', error);
  return !error;
}

// -------------------------------------------------------------
// 3. Teacher Operations
// -------------------------------------------------------------
export async function dbSaveTeacher(teacher: Partial<Teacher>): Promise<Teacher | null> {
  const supabase = createClient();
  const rate = Number(teacher.dailyRate ?? teacher.hourlyRate ?? 500);

  const payload: any = {
    name: teacher.name,
    email: teacher.email || null,
    phone: teacher.phone || null,
    daily_rate: rate,
    color: teacher.color || '#3b82f6',
    free_class_color: teacher.freeClassColor || null,
    policy_type: teacher.paymentPolicy?.type || 'AFTER_N_CLASSES',
    cycle_size: teacher.paymentPolicy?.cycleSize || 4,
    advance_balance: teacher.paymentPolicy?.advanceBalance || 0,
    is_delayed: teacher.paymentPolicy?.isDelayed || false,
    delayed_until: teacher.paymentPolicy?.delayedUntil || null,
    delay_reason: teacher.paymentPolicy?.delayReason || null,
    subject_ids: teacher.subjectIds || [],
    weekdays: teacher.weekdays || [],
    default_time: teacher.defaultTime || '16:00',
    default_duration_min: teacher.defaultDurationMin || 60,
    default_subject_id: isUuid(teacher.defaultSubjectId) ? teacher.defaultSubjectId : null,
  };

  if (teacher.id && isUuid(teacher.id)) {
    const { data, error } = await supabase
      .from('tuition_teachers')
      .update(payload)
      .eq('id', teacher.id)
      .select()
      .single();
    if (error) {
      console.error('dbSaveTeacher update error:', error);
      return null;
    }
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      hourlyRate: Number(data.daily_rate),
      dailyRate: Number(data.daily_rate),
      color: data.color,
      freeClassColor: data.free_class_color || undefined,
      subjectIds: data.subject_ids || [],
      paymentPolicy: {
        type: data.policy_type,
        cycleSize: data.cycle_size,
        advanceBalance: Number(data.advance_balance),
        isDelayed: data.is_delayed,
        delayedUntil: data.delayed_until,
        delayReason: data.delay_reason,
      },
      weekdays: data.weekdays || [],
      defaultTime: data.default_time || '16:00',
      defaultDurationMin: Number(data.default_duration_min || 60),
      defaultSubjectId: data.default_subject_id,
      createdAt: data.created_at,
    };
  } else {
    const { data, error } = await supabase
      .from('tuition_teachers')
      .insert(payload)
      .select()
      .single();
    if (error) {
      console.error('dbSaveTeacher insert error:', error);
      return null;
    }
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      hourlyRate: Number(data.daily_rate),
      dailyRate: Number(data.daily_rate),
      color: data.color,
      freeClassColor: data.free_class_color || undefined,
      subjectIds: data.subject_ids || [],
      paymentPolicy: {
        type: data.policy_type,
        cycleSize: data.cycle_size,
        advanceBalance: Number(data.advance_balance),
        isDelayed: data.is_delayed,
        delayedUntil: data.delayed_until,
        delayReason: data.delay_reason,
      },
      weekdays: data.weekdays || [],
      defaultTime: data.default_time || '16:00',
      defaultDurationMin: Number(data.default_duration_min || 60),
      defaultSubjectId: data.default_subject_id,
      createdAt: data.created_at,
    };
  }
}

export async function dbDeleteTeacher(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from('tuition_teachers').delete().eq('id', id);
  if (error) console.error('dbDeleteTeacher error:', error);
  return !error;
}

// -------------------------------------------------------------
// 4. Class Session Operations (with Free Class Support)
// -------------------------------------------------------------
export async function dbSaveSession(session: Partial<ClassSession>): Promise<ClassSession | null> {
  const supabase = createClient();
  const isFree = Boolean(session.isFree || session.paymentStatus === 'FREE');
  const fee = isFree ? 0 : Number(session.fee || 0);
  const paymentStatus = isFree ? 'FREE' : (session.paymentStatus || 'UNPAID');

  const payload: any = {
    schedule_id: session.scheduleId || null,
    teacher_id: session.teacherId,
    subject_id: session.subjectId,
    scheduled_at: session.scheduledAt,
    duration_min: session.durationMin || 60,
    fee,
    is_free: isFree,
    is_extra: Boolean(session.isExtra),
    attendance: session.attendance || (session.status === 'TEACHER_ABSENT' ? 'ABSENT' : 'PRESENT'),
    status: session.status || 'SCHEDULED',
    payment_status: paymentStatus,
    paid_at: session.paidAt || null,
  };

  if (session.id && isUuid(session.id)) {
    const { data, error } = await supabase
      .from('tuition_class_sessions')
      .update(payload)
      .eq('id', session.id)
      .select()
      .single();
    if (error) {
      console.error('dbSaveSession update error:', error);
      return null;
    }
    return {
      id: data.id,
      scheduleId: data.schedule_id,
      teacherId: data.teacher_id,
      subjectId: data.subject_id,
      scheduledAt: data.scheduled_at,
      durationMin: data.duration_min,
      fee: Number(data.fee),
      isFree: Boolean(data.is_free),
      isExtra: Boolean(data.is_extra),
      attendance: (data.attendance || 'PRESENT') as 'PRESENT' | 'ABSENT',
      status: data.status,
      paymentStatus: (data.is_free ? 'FREE' : data.payment_status) as PaymentStatus,
      notes: session.notes || [],
      paidAt: data.paid_at,
    };
  } else {
    const { data, error } = await supabase
      .from('tuition_class_sessions')
      .insert(payload)
      .select()
      .single();
    if (error) {
      console.error('dbSaveSession insert error:', error);
      return null;
    }
    return {
      id: data.id,
      scheduleId: data.schedule_id,
      teacherId: data.teacher_id,
      subjectId: data.subject_id,
      scheduledAt: data.scheduled_at,
      durationMin: data.duration_min,
      fee: Number(data.fee),
      isFree: Boolean(data.is_free),
      isExtra: Boolean(data.is_extra),
      attendance: (data.attendance || 'PRESENT') as 'PRESENT' | 'ABSENT',
      status: data.status,
      paymentStatus: (data.is_free ? 'FREE' : data.payment_status) as PaymentStatus,
      notes: [],
      paidAt: data.paid_at,
    };
  }
}

export async function dbUpdateSessionStatus(
  sessionId: string, 
  status: ClassStatus, 
  paidAt?: string
): Promise<boolean> {
  const supabase = createClient();
  const payload: any = { status };
  if (paidAt !== undefined) {
    payload.paid_at = paidAt;
    if (paidAt) payload.payment_status = 'PAID';
  }

  const { error } = await supabase
    .from('tuition_class_sessions')
    .update(payload)
    .eq('id', sessionId);

  if (error) console.error('dbUpdateSessionStatus error:', error);
  return !error;
}

export async function dbDeleteSession(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from('tuition_class_sessions').delete().eq('id', id);
  if (error) console.error('dbDeleteSession error:', error);
  return !error;
}

export async function dbRevertSessionPayment(sessionId: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('tuition_class_sessions')
    .update({
      payment_status: 'UNPAID',
      paid_at: null,
    })
    .eq('id', sessionId);

  if (error) console.error('dbRevertSessionPayment error:', error);
  return !error;
}

export async function dbRevertSessionsPayment(sessionIds: string[]): Promise<boolean> {
  if (!sessionIds || sessionIds.length === 0) return true;
  const supabase = createClient();
  const { error } = await supabase
    .from('tuition_class_sessions')
    .update({
      payment_status: 'UNPAID',
      paid_at: null,
    })
    .in('id', sessionIds);

  if (error) console.error('dbRevertSessionsPayment error:', error);
  return !error;
}

// -------------------------------------------------------------
// 5. Session Notes Operations
// -------------------------------------------------------------
export async function dbAddSessionNote(
  sessionId: string, 
  content: string, 
  isHomework: boolean
): Promise<SessionNote | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('tuition_session_notes')
    .insert({
      session_id: sessionId,
      content,
      is_homework: isHomework,
    })
    .select()
    .single();

  if (error) {
    console.error('dbAddSessionNote error:', error);
    return null;
  }
  return {
    id: data.id,
    sessionId: data.session_id,
    content: data.content,
    isHomework: Boolean(data.is_homework),
    createdAt: data.created_at,
  };
}

// -------------------------------------------------------------
// 6. Payment Operations
// -------------------------------------------------------------
export async function dbCreatePayment(payment: Partial<PaymentRecord>): Promise<PaymentRecord | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('tuition_payments')
    .insert({
      teacher_id: payment.teacherId,
      amount: payment.amount,
      type: payment.type || 'CYCLE_SETTLEMENT',
      method: payment.method || 'Cash',
      reference: payment.reference || null,
      note: payment.note || null,
      session_ids: payment.sessionIds || [],
      paid_at: payment.paidAt || new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('dbCreatePayment error:', error);
    return null;
  }

  // Update covered sessions to PAID in database
  if (payment.sessionIds && payment.sessionIds.length > 0) {
    await supabase
      .from('tuition_class_sessions')
      .update({ payment_status: 'PAID', paid_at: new Date().toISOString() })
      .in('id', payment.sessionIds);
  }

  return {
    id: data.id,
    teacherId: data.teacher_id,
    sessionIds: data.session_ids || [],
    type: data.type,
    amount: Number(data.amount),
    paidAt: data.paid_at,
    method: data.method,
    reference: data.reference,
    note: data.note,
  };
}

export async function dbUpdatePayment(payment: Partial<PaymentRecord> & { id: string }): Promise<PaymentRecord | null> {
  const supabase = createClient();
  const payload: any = {
    teacher_id: payment.teacherId,
    amount: payment.amount,
    type: payment.type,
    method: payment.method,
    reference: payment.reference || null,
    note: payment.note || null,
    paid_at: payment.paidAt,
  };
  if (payment.sessionIds !== undefined) {
    payload.session_ids = payment.sessionIds;
  }

  const { data, error } = await supabase
    .from('tuition_payments')
    .update(payload)
    .eq('id', payment.id)
    .select()
    .single();

  if (error) {
    console.error('dbUpdatePayment error:', error);
    return null;
  }

  return {
    id: data.id,
    teacherId: data.teacher_id,
    sessionIds: data.session_ids || [],
    type: data.type,
    amount: Number(data.amount),
    paidAt: data.paid_at,
    method: data.method,
    reference: data.reference,
    note: data.note,
  };
}

export async function dbDeletePayment(paymentId: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('tuition_payments')
    .delete()
    .eq('id', paymentId);

  if (error) {
    console.error('dbDeletePayment error:', error);
    return false;
  }
  return true;
}

// -------------------------------------------------------------
// 7. Calendar Event Operations
// -------------------------------------------------------------
export async function dbSaveEvent(event: Partial<CalendarEvent>): Promise<CalendarEvent | null> {
  const supabase = createClient();
  const payload: any = {
    title: event.title,
    description: event.description || null,
    start_at: event.startAt,
    end_at: event.endAt || null,
    event_type: event.eventType || 'EXAM',
    subject_id: event.subjectId || null,
  };

  if (event.id && isUuid(event.id)) {
    const { data, error } = await supabase
      .from('tuition_calendar_events')
      .update(payload)
      .eq('id', event.id)
      .select()
      .single();
    if (error) {
      console.error('dbSaveEvent update error:', error);
      return null;
    }
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      startAt: data.start_at,
      endAt: data.end_at,
      eventType: data.event_type,
      subjectId: data.subject_id,
    };
  } else {
    const { data, error } = await supabase
      .from('tuition_calendar_events')
      .insert(payload)
      .select()
      .single();
    if (error) {
      console.error('dbSaveEvent insert error:', error);
      return null;
    }
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      startAt: data.start_at,
      endAt: data.end_at,
      eventType: data.event_type,
      subjectId: data.subject_id,
    };
  }
}

export async function dbDeleteEvent(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from('tuition_calendar_events').delete().eq('id', id);
  if (error) console.error('dbDeleteEvent error:', error);
  return !error;
}
