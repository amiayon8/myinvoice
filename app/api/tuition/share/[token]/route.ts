import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

interface RouteParams {
  params: Promise<{ token: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { token } = await params;
  const supabase = createServiceRoleClient();

  const { data: linkRecord, error: linkError } = await supabase
    .from("tuition_share_links")
    .select("*")
    .eq("token", token)
    .single();

  if (linkError || !linkRecord) {
    return NextResponse.json(
      { success: false, error: "Share link not found" },
      { status: 404 },
    );
  }

  if (linkRecord.revoked_at) {
    return NextResponse.json(
      { success: false, error: "Share link has been revoked" },
      { status: 403 },
    );
  }

  if (!linkRecord.never_expires && linkRecord.expires_at) {
    if (new Date(linkRecord.expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, error: "Share link has expired" },
        { status: 410 },
      );
    }
  }

  const userAgent = request.headers.get("user-agent") || undefined;
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ipAddress = forwardedFor
    ? forwardedFor.split(",")[0].trim()
    : undefined;
  if (ipAddress && ipAddress !== "::1") {
    void supabase.from("tuition_view_logs").insert({
      token_id: linkRecord.id,
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  }

  const [
    subjectsRes,
    teachersRes,
    schedulesRes,
    sessionsRes,
    notesRes,
    eventsRes,
    paymentsRes,
  ] = await Promise.all([
    supabase.from("tuition_subjects").select("*").order("name"),
    supabase.from("tuition_teachers").select("*").order("name"),
    supabase.from("tuition_schedules").select("*").order("day_of_week"),
    supabase
      .from("tuition_class_sessions")
      .select("*")
      .order("scheduled_at", { ascending: false }),
    supabase.from("tuition_session_notes").select("*").order("created_at"),
    supabase.from("tuition_calendar_events").select("*").order("start_at"),
    supabase
      .from("tuition_payments")
      .select("*")
      .order("paid_at", { ascending: false }),
  ]);

  const rawSubjects = subjectsRes.data || [];
  const rawTeachers = teachersRes.data || [];
  const rawSchedules = schedulesRes.data || [];
  const rawSessions = sessionsRes.data || [];
  const rawNotes = notesRes.data || [];
  const rawEvents = eventsRes.data || [];
  const rawPayments = paymentsRes.data || [];

  const notesBySession: Record<string, any[]> = {};
  rawNotes.forEach((n: any) => {
    if (!notesBySession[n.session_id]) notesBySession[n.session_id] = [];
    notesBySession[n.session_id].push({
      id: n.id,
      sessionId: n.session_id,
      content: n.content,
      isHomework: Boolean(n.is_homework),
      createdAt: n.created_at,
    });
  });

  const type = linkRecord.type;
  const linkParams = linkRecord.params || {};

  let allowedTeacherIds: string[] | null = null;
  let allowedSubjectIds: string[] | null = null;

  if (type === "teacher" && linkParams.teacherId) {
    allowedTeacherIds = [linkParams.teacherId];
  } else if (type === "teachers" && Array.isArray(linkParams.teacherIds)) {
    allowedTeacherIds = linkParams.teacherIds;
  } else if (type === "subject" && linkParams.subjectId) {
    allowedSubjectIds = [linkParams.subjectId];
  } else if (type === "subjects" && Array.isArray(linkParams.subjectIds)) {
    allowedSubjectIds = linkParams.subjectIds;
  }

  let filteredTeachers = rawTeachers;
  let filteredSubjects = rawSubjects;
  let filteredSessions = rawSessions;
  let filteredSchedules = rawSchedules;
  let filteredEvents = rawEvents;

  if (allowedTeacherIds) {
    filteredTeachers = rawTeachers.filter((t: any) =>
      allowedTeacherIds!.includes(t.id),
    );
    filteredSessions = rawSessions.filter((s: any) =>
      allowedTeacherIds!.includes(s.teacher_id),
    );
    filteredSchedules = rawSchedules.filter((sch: any) =>
      allowedTeacherIds!.includes(sch.teacher_id),
    );
    const relevantSubjectIds = new Set<string>();
    filteredTeachers.forEach((t: any) => {
      (t.subject_ids || []).forEach((sid: string) =>
        relevantSubjectIds.add(sid),
      );
    });
    if (relevantSubjectIds.size > 0) {
      filteredSubjects = rawSubjects.filter((sub: any) =>
        relevantSubjectIds.has(sub.id),
      );
    }
  } else if (allowedSubjectIds) {
    filteredSubjects = rawSubjects.filter((s: any) =>
      allowedSubjectIds!.includes(s.id),
    );
    filteredSessions = rawSessions.filter((s: any) =>
      allowedSubjectIds!.includes(s.subject_id),
    );
    filteredSchedules = rawSchedules.filter((sch: any) =>
      allowedSubjectIds!.includes(sch.subject_id),
    );
    filteredTeachers = rawTeachers.filter((t: any) =>
      (t.subject_ids || []).some((sid: string) =>
        allowedSubjectIds!.includes(sid),
      ),
    );
    filteredEvents = rawEvents.filter(
      (e: any) => !e.subject_id || allowedSubjectIds!.includes(e.subject_id),
    );
  }

  const mappedSubjects = filteredSubjects.map((s: any) => ({
    id: s.id,
    name: s.name,
    color: s.color || "#3b82f6",
    defaultDurationMin: s.default_duration_min || 60,
  }));

  const mappedTeachers = filteredTeachers.map((t: any) => ({
    id: t.id,
    name: t.name,
    email: t.email || undefined,
    phone: t.phone || undefined,
    hourlyRate: Number(t.daily_rate ?? t.hourly_rate ?? 500),
    dailyRate: Number(t.daily_rate ?? t.hourly_rate ?? 500),
    color: t.color || "#3b82f6",
    freeClassColor: t.free_class_color || undefined,
    subjectIds: t.subject_ids || [],
    paymentPolicy: {
      type: t.policy_type || "AFTER_N_CLASSES",
      cycleSize: Number(t.cycle_size || 4),
      advanceBalance: Number(t.advance_balance || 0),
      isDelayed: Boolean(t.is_delayed),
      delayedUntil: t.delayed_until || undefined,
      delayReason: t.delay_reason || undefined,
    },
    weekdays: t.weekdays || [],
    defaultTime: t.default_time || "16:00",
    defaultDurationMin: Number(t.default_duration_min || 60),
    defaultSubjectId: t.default_subject_id || undefined,
    createdAt: t.created_at,
  }));

  const mappedSessions = filteredSessions.map((s: any) => ({
    id: s.id,
    scheduleId: s.schedule_id || undefined,
    teacherId: s.teacher_id,
    subjectId: s.subject_id,
    scheduledAt: s.scheduled_at,
    durationMin: Number(s.duration_min || 60),
    fee: Number(s.fee || 0),
    isFree: Boolean(s.is_free),
    isExtra: Boolean(s.is_extra),
    attendance: s.attendance || "PRESENT",
    status: s.status,
    paymentStatus: s.is_free ? "FREE" : s.payment_status,
    notes: notesBySession[s.id] || [],
    paidAt: s.paid_at || undefined,
    approvalStatus: s.approval_status || "APPROVED",
    recordedBy: s.recorded_by || "ADMIN",
    rejectionReason: s.rejection_reason || undefined,
  }));

  const mappedEvents = filteredEvents.map((e: any) => ({
    id: e.id,
    title: e.title,
    description: e.description || undefined,
    startAt: e.start_at,
    endAt: e.end_at || undefined,
    eventType: e.event_type,
    subjectId: e.subject_id || undefined,
  }));

  const mappedSchedules = filteredSchedules.map((sch: any) => ({
    id: sch.id,
    teacherId: sch.teacher_id,
    subjectId: sch.subject_id,
    dayOfWeek: Number(sch.day_of_week),
    startTime: sch.start_time?.slice(0, 5) || "16:00",
    durationMin: Number(sch.duration_min || 60),
    rate: Number(sch.rate || 500),
    isActive: Boolean(sch.is_active),
  }));

  let filteredPayments = rawPayments;
  if (allowedTeacherIds) {
    filteredPayments = rawPayments.filter((p: any) =>
      allowedTeacherIds!.includes(p.teacher_id),
    );
  } else if (allowedSubjectIds) {
    const teacherIdsForSubjects = filteredTeachers.map((t: any) => t.id);
    filteredPayments = rawPayments.filter((p: any) =>
      teacherIdsForSubjects.includes(p.teacher_id),
    );
  }

  const mappedPayments = filteredPayments.map((p: any) => ({
    id: p.id,
    teacherId: p.teacher_id,
    sessionIds: p.session_ids || [],
    type: p.type,
    amount: Number(p.amount || 0),
    paidAt: p.paid_at,
    method: p.method || "Cash",
    reference: p.reference || undefined,
    note: p.note || undefined,
  }));

  return NextResponse.json({
    success: true,
    link: {
      id: linkRecord.id,
      token: linkRecord.token,
      label: linkRecord.label,
      type: linkRecord.type,
      params: linkRecord.params,
      allowRecordClass: linkRecord.allow_record_class !== false,
      createdAt: linkRecord.created_at,
    },
    teachers: mappedTeachers,
    subjects: mappedSubjects,
    sessions: mappedSessions,
    events: mappedEvents,
    schedules: mappedSchedules,
    payments: mappedPayments,
  });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { token } = await params;
  const supabase = createServiceRoleClient();

  const { data: linkRecord, error: linkError } = await supabase
    .from("tuition_share_links")
    .select("*")
    .eq("token", token)
    .single();

  if (linkError || !linkRecord) {
    return NextResponse.json(
      { success: false, error: "Share link not found" },
      { status: 404 },
    );
  }

  if (linkRecord.revoked_at) {
    return NextResponse.json(
      { success: false, error: "Share link has been revoked" },
      { status: 403 },
    );
  }

  if (!linkRecord.never_expires && linkRecord.expires_at) {
    if (new Date(linkRecord.expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, error: "Share link has expired" },
        { status: 410 },
      );
    }
  }

  if (linkRecord.allow_record_class === false) {
    return NextResponse.json(
      {
        success: false,
        error: "Recording classes is not enabled for this share link",
      },
      { status: 403 },
    );
  }

  const body = await request.json();
  const { teacherId, subjectId, scheduledAt, durationMin, notes } = body;

  if (!teacherId || !subjectId || !scheduledAt) {
    return NextResponse.json(
      {
        success: false,
        error: "Missing required fields: teacher, subject, or date/time",
      },
      { status: 400 },
    );
  }

  const type = linkRecord.type;
  const linkParams = linkRecord.params || {};

  if (
    type === "teacher" &&
    linkParams.teacherId &&
    linkParams.teacherId !== teacherId
  ) {
    return NextResponse.json(
      { success: false, error: "Unauthorized teacher selection for this link" },
      { status: 403 },
    );
  }
  if (
    type === "teachers" &&
    Array.isArray(linkParams.teacherIds) &&
    !linkParams.teacherIds.includes(teacherId)
  ) {
    return NextResponse.json(
      { success: false, error: "Unauthorized teacher selection for this link" },
      { status: 403 },
    );
  }
  if (
    type === "subject" &&
    linkParams.subjectId &&
    linkParams.subjectId !== subjectId
  ) {
    return NextResponse.json(
      { success: false, error: "Unauthorized subject selection for this link" },
      { status: 403 },
    );
  }
  if (
    type === "subjects" &&
    Array.isArray(linkParams.subjectIds) &&
    !linkParams.subjectIds.includes(subjectId)
  ) {
    return NextResponse.json(
      { success: false, error: "Unauthorized subject selection for this link" },
      { status: 403 },
    );
  }

  const { data: teacher, error: teacherError } = await supabase
    .from("tuition_teachers")
    .select("*")
    .eq("id", teacherId)
    .single();

  if (teacherError || !teacher) {
    return NextResponse.json(
      { success: false, error: "Teacher not found" },
      { status: 404 },
    );
  }

  const fee = Number(teacher.daily_rate ?? teacher.hourly_rate ?? 500);
  const scheduledTime = new Date(scheduledAt).getTime();
  const isPast = scheduledTime <= Date.now();
  const initialStatus = isPast ? "COMPLETED" : "SCHEDULED";

  const { data: sessionData, error: sessionError } = await supabase
    .from("tuition_class_sessions")
    .insert({
      teacher_id: teacherId,
      subject_id: subjectId,
      scheduled_at: scheduledAt,
      duration_min: Number(durationMin || teacher.default_duration_min || 60),
      fee,
      status: initialStatus,
      payment_status: "UNPAID",
      is_free: false,
      attendance: "PRESENT",
      approval_status: "PENDING",
      recorded_by: "TEACHER",
    })
    .select()
    .single();

  if (sessionError || !sessionData) {
    return NextResponse.json(
      {
        success: false,
        error: sessionError?.message || "Failed to record session",
      },
      { status: 500 },
    );
  }

  let noteRecord = null;
  if (notes && typeof notes === "string" && notes.trim().length > 0) {
    const { data: createdNote } = await supabase
      .from("tuition_session_notes")
      .insert({
        session_id: sessionData.id,
        content: notes.trim(),
        is_homework: false,
      })
      .select()
      .single();

    if (createdNote) {
      noteRecord = {
        id: createdNote.id,
        sessionId: createdNote.session_id,
        content: createdNote.content,
        isHomework: Boolean(createdNote.is_homework),
        createdAt: createdNote.created_at,
      };
    }
  }

  return NextResponse.json({
    success: true,
    session: {
      id: sessionData.id,
      scheduleId: sessionData.schedule_id,
      teacherId: sessionData.teacher_id,
      subjectId: sessionData.subject_id,
      scheduledAt: sessionData.scheduled_at,
      durationMin: Number(sessionData.duration_min),
      fee: Number(sessionData.fee),
      isFree: Boolean(sessionData.is_free),
      isExtra: Boolean(sessionData.is_extra),
      attendance: sessionData.attendance,
      status: sessionData.status,
      paymentStatus: sessionData.payment_status,
      approvalStatus: sessionData.approval_status,
      recordedBy: sessionData.recorded_by,
      notes: noteRecord ? [noteRecord] : [],
    },
  });
}
