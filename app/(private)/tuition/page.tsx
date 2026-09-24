"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Subject,
  Teacher,
  RecurringSchedule,
  ClassSession,
  PaymentRecord,
  CalendarEvent,
  ClassStatus,
  PaymentStatus
} from "@/types/tuition";
import {
  TuitionStorage,
  calculateTeacherFinance,
  TEACHER_PALETTE
} from "@/lib/tuition-storage";
import {
  fetchTuitionData,
  dbSaveSubject,
  dbDeleteSubject,
  dbSaveTeacher,
  dbDeleteTeacher,
  dbSaveSession,
  dbUpdateSessionStatus,
  dbDeleteSession,
  dbAddSessionNote,
  dbCreatePayment,
  dbSaveEvent,
  dbDeleteEvent
} from "@/lib/tuition-service";

import TuitionDashboard from "@/components/tuition/tuition-dashboard";
import TuitionCalendar from "@/components/tuition/tuition-calendar";
import ClassSessionView from "@/components/tuition/class-session-view";
import TuitionTeachers from "@/components/tuition/tuition-teachers";
import TuitionPayments from "@/components/tuition/tuition-payments";
import TuitionReports from "@/components/tuition/tuition-reports";

import {
  AddTeacherModal,
  ScheduleClassModal,
  EditClassSessionModal,
  RecordPaymentModal,
  DelayPaymentModal,
  AddEventModal,
  AddSubjectModal,
} from "@/components/tuition/tuition-modals";

type TabType = "overview" | "calendar" | "teachers" | "payments" | "reports";

export default function TuitionPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  // Core Data State - Clean, empty by default, populated directly from database
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [schedules, setSchedules] = useState<RecurringSchedule[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  // Drilldown to Single Session View
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  // Modal Controllers
  const [isAddTeacherOpen, setIsAddTeacherOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [editingSession, setEditingSession] = useState<ClassSession | null>(null);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [scheduleInitialDate, setScheduleInitialDate] = useState<string | undefined>(undefined);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [preselectedPayTeacherId, setPreselectedPayTeacherId] = useState<string | undefined>(undefined);
  const [isDelayModalOpen, setIsDelayModalOpen] = useState(false);
  const [delayTeacherTarget, setDelayTeacherTarget] = useState<Teacher | null>(null);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);

  // Sync to storage helper (defined early for async routines)
  const updateSessions = (newSessions: ClassSession[]) => {
    setSessions(newSessions);
    TuitionStorage.saveSessions(newSessions);
  };

  const updateTeachers = (newTeachers: Teacher[]) => {
    setTeachers(newTeachers);
    TuitionStorage.saveTeachers(newTeachers);
  };

  // 1. Auto-complete past scheduled sessions:
  // Once a scheduled session's date/time passes, it is automatically marked as COMPLETED.
  // Historical completed classes remain permanent.
  const autoCompletePastSessions = async (
    currentSessions: ClassSession[],
    currentTeachers: Teacher[]
  ): Promise<ClassSession[]> => {
    const now = Date.now();
    const pastScheduled = currentSessions.filter(s => {
      if (s.status !== "SCHEDULED") return false;
      const sessionTime = new Date(s.scheduledAt).getTime();
      return sessionTime < now;
    });

    if (pastScheduled.length === 0) return currentSessions;

    const updatedSessions = [...currentSessions];
    for (const session of pastScheduled) {
      const teacher = currentTeachers.find(t => t.id === session.teacherId);
      let newPaymentStatus: PaymentStatus = session.paymentStatus;

      if (session.isFree || session.paymentStatus === "FREE") {
        newPaymentStatus = "FREE";
      } else if (session.paymentStatus === "UNPAID") {
        if (
          teacher?.paymentPolicy?.type === "ADVANCE_CYCLE" &&
          (teacher.paymentPolicy.advanceBalance || 0) >= session.fee
        ) {
          newPaymentStatus = "COVERED_BY_ADVANCE";
          teacher.paymentPolicy.advanceBalance = Math.max(
            0,
            (teacher.paymentPolicy.advanceBalance || 0) - session.fee
          );
        }
      }

      const index = updatedSessions.findIndex(s => s.id === session.id);
      if (index !== -1) {
        const completedSession: ClassSession = {
          ...updatedSessions[index],
          status: "COMPLETED",
          paymentStatus: newPaymentStatus,
        };
        updatedSessions[index] = completedSession;

        try {
          await dbSaveSession(completedSession);
        } catch (e) {
          console.error("Failed to persist auto-completed session:", e);
        }
      }
    }

    return updatedSessions;
  };

  // 2. Auto-schedule teacher weekdays:
  // Generates upcoming SCHEDULED sessions for configured teacher weekdays (next 30 days).
  // Changing weekdays NEVER affects completed or historical classes!
  const syncTeacherRoutines = async (
    currentTeachers: Teacher[],
    currentSubjects: Subject[],
    currentSessions: ClassSession[]
  ): Promise<ClassSession[]> => {
    const newSessionsToCreate: Partial<ClassSession>[] = [];
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    for (const teacher of currentTeachers) {
      if (!teacher.weekdays || teacher.weekdays.length === 0) continue;

      const rate = Number(teacher.dailyRate ?? teacher.hourlyRate ?? 500);
      const subId = teacher.defaultSubjectId || teacher.subjectIds?.[0] || currentSubjects[0]?.id || "";
      const defTime = teacher.defaultTime || "16:00";
      const duration = teacher.defaultDurationMin || 60;

      for (let dayOffset = 0; dayOffset <= 30; dayOffset++) {
        const targetDate = new Date(startOfToday);
        targetDate.setDate(startOfToday.getDate() + dayOffset);
        const dayOfWeek = targetDate.getDay();

        if (teacher.weekdays.includes(dayOfWeek)) {
          const y = targetDate.getFullYear();
          const m = String(targetDate.getMonth() + 1).padStart(2, "0");
          const d = String(targetDate.getDate()).padStart(2, "0");
          const dateStr = `${y}-${m}-${d}`;

          const alreadyExists = currentSessions.some(
            s => s.teacherId === teacher.id && s.scheduledAt.startsWith(dateStr)
          ) || newSessionsToCreate.some(
            s => s.teacherId === teacher.id && s.scheduledAt?.startsWith(dateStr)
          );

          if (!alreadyExists) {
            const scheduledAt = `${dateStr}T${defTime}:00`;
            const isPast = new Date(scheduledAt).getTime() < Date.now();
            const hasAdvance = teacher.paymentPolicy?.type === "ADVANCE_CYCLE" &&
              (teacher.paymentPolicy.advanceBalance || 0) >= rate;

            newSessionsToCreate.push({
              teacherId: teacher.id,
              subjectId: subId,
              scheduledAt,
              durationMin: duration,
              fee: rate,
              isFree: false,
              isExtra: false,
              attendance: "PRESENT",
              status: isPast ? "COMPLETED" : "SCHEDULED",
              paymentStatus: hasAdvance ? "COVERED_BY_ADVANCE" : "UNPAID",
              notes: [],
            });
          }
        }
      }
    }

    if (newSessionsToCreate.length > 0) {
      const created: ClassSession[] = [];
      for (const item of newSessionsToCreate) {
        try {
          const saved = await dbSaveSession(item);
          if (saved) {
            created.push(saved);
          } else {
            created.push({
              ...item,
              id: `cs-auto-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            } as ClassSession);
          }
        } catch (err) {
          console.error("Failed to auto-create weekday session:", err);
        }
      }

      if (created.length > 0) {
        const merged = [...currentSessions, ...created];
        updateSessions(merged);
        return merged;
      }
    }
    return currentSessions;
  };

  // Load from Supabase on client mount with local cache fallback
  useEffect(() => {
    setMounted(true);

    // Optimistically check local storage cache
    const cachedSubs = TuitionStorage.getSubjects();
    const cachedTeachers = TuitionStorage.getTeachers();
    const cachedScheds = TuitionStorage.getSchedules();
    const cachedSessions = TuitionStorage.getSessions();
    const cachedPays = TuitionStorage.getPayments();
    const cachedEvents = TuitionStorage.getEvents();

    if (cachedSubs.length || cachedTeachers.length || cachedSessions.length) {
      setSubjects(cachedSubs);
      setTeachers(cachedTeachers);
      setSchedules(cachedScheds);
      setSessions(cachedSessions);
      setPayments(cachedPays);
      setEvents(cachedEvents);
    }

    async function loadFromDb() {
      try {
        const dbData = await fetchTuitionData();
        setSubjects(dbData.subjects);
        setTeachers(dbData.teachers);
        setSchedules(dbData.schedules);
        setPayments(dbData.payments);
        setEvents(dbData.events);

        // Keep local cache synced
        TuitionStorage.saveSubjects(dbData.subjects);
        TuitionStorage.saveTeachers(dbData.teachers);
        TuitionStorage.saveSchedules(dbData.schedules);
        TuitionStorage.savePayments(dbData.payments);
        TuitionStorage.saveEvents(dbData.events);

        // Auto-complete any past sessions that passed
        const completedSessions = await autoCompletePastSessions(dbData.sessions, dbData.teachers);
        // Auto-schedule missing upcoming weekday sessions for teachers
        const finalSessions = await syncTeacherRoutines(dbData.teachers, dbData.subjects, completedSessions);

        setSessions(finalSessions);
        TuitionStorage.saveSessions(finalSessions);
      } catch (err) {
        console.error("Failed to load tuition data from Supabase:", err);
      } finally {
        setLoading(false);
      }
    }

    loadFromDb();
  }, []);

  const updatePayments = (newPayments: PaymentRecord[]) => {
    setPayments(newPayments);
    TuitionStorage.savePayments(newPayments);
  };

  const updateSubjects = (newSubs: Subject[]) => {
    setSubjects(newSubs);
    TuitionStorage.saveSubjects(newSubs);
  };

  const updateEvents = (newEvents: CalendarEvent[]) => {
    setEvents(newEvents);
    TuitionStorage.saveEvents(newEvents);
  };

  // Helper map of unpaid sessions by teacher (strictly excludes free classes and absences)
  const unpaidSessionsByTeacher: Record<string, ClassSession[]> = {};
  sessions
    .filter(s => s.status === "COMPLETED" && s.paymentStatus === "UNPAID" && !s.isFree && s.attendance !== "ABSENT")
    .forEach(s => {
      if (!unpaidSessionsByTeacher[s.teacherId]) {
        unpaidSessionsByTeacher[s.teacherId] = [];
      }
      unpaidSessionsByTeacher[s.teacherId].push(s);
    });

  // Action: Toggle Free Class on a session (Instantly excluded/included in payment calculations)
  const handleToggleFreeClass = async (sessionId: string, makeFree: boolean) => {
    const targetSession = sessions.find(s => s.id === sessionId);
    if (!targetSession) return;

    const teacher = teachers.find(t => t.id === targetSession.teacherId);
    const defaultRate = (teacher?.dailyRate ?? teacher?.hourlyRate) || 500;

    const updatedSession: ClassSession = {
      ...targetSession,
      isFree: makeFree,
      fee: makeFree ? 0 : defaultRate,
      paymentStatus: makeFree ? "FREE" : "UNPAID",
      paidAt: makeFree ? undefined : targetSession.paidAt,
    };

    const updated = sessions.map(s => s.id === sessionId ? updatedSession : s);
    updateSessions(updated);
    toast.info(makeFree ? "Class set as Free (Excluded from payment & settlement cycles)" : "Class reverted to Paid");

    try {
      await dbSaveSession(updatedSession);
    } catch (err) {
      console.error("Failed to update free class in Supabase:", err);
    }
  };

  // Action: Mark single session as paid immediately
  const handleMarkSessionPaid = async (sessionId: string) => {
    const targetSession = sessions.find(s => s.id === sessionId);
    if (!targetSession) return;

    if (targetSession.isFree || targetSession.paymentStatus === "FREE") {
      toast.info("This is a free class and requires no payment.");
      return;
    }

    const nowIso = new Date().toISOString();
    const newPayment: PaymentRecord = {
      id: `pay-${Date.now()}`,
      teacherId: targetSession.teacherId,
      sessionIds: [sessionId],
      type: "PER_CLASS",
      amount: targetSession.fee,
      paidAt: nowIso,
      method: "Quick Pay",
      note: `Settled single session: ${targetSession.id}`,
    };

    const updated = sessions.map(s =>
      s.id === sessionId ? { ...s, paymentStatus: "PAID" as PaymentStatus, paidAt: nowIso } : s
    );

    updateSessions(updated);
    updatePayments([newPayment, ...payments]);
    toast.success(`Marked session as paid (৳${targetSession.fee.toFixed(2)})`);

    // Supabase DB persist
    try {
      const savedPay = await dbCreatePayment(newPayment);
      if (savedPay) {
        setPayments(prev => prev.map(p => p.id === newPayment.id ? savedPay : p));
      }
      await dbUpdateSessionStatus(sessionId, targetSession.status, nowIso);
    } catch (err) {
      console.error("Failed to sync payment to Supabase:", err);
    }
  };

  // Action: Update attendance status of session
  const handleUpdateSessionStatus = async (sessionId: string, newStatus: ClassStatus) => {
    const targetSession = sessions.find(s => s.id === sessionId);
    if (!targetSession) return;

    if (newStatus === "TEACHER_ABSENT") {
      const updated = sessions.map(s =>
        s.id === sessionId ? { ...s, status: newStatus, attendance: "ABSENT" as const, fee: 0, paymentStatus: "WAIVED" as PaymentStatus } : s
      );
      updateSessions(updated);
      toast.info("Teacher marked absent. Class fee waived.");
      try {
        await dbSaveSession({
          id: sessionId,
          status: newStatus,
          attendance: "ABSENT",
          fee: 0,
          paymentStatus: "WAIVED",
        });
      } catch (err) {
        console.error("Failed to persist teacher absent to Supabase:", err);
      }
      return;
    }

    const teacher = teachers.find(t => t.id === targetSession.teacherId);
    let newPaymentStatus = targetSession.paymentStatus;
    let updatedTeacherToPersist: Teacher | null = null;

    if (targetSession.isFree || targetSession.paymentStatus === "FREE") {
      newPaymentStatus = "FREE";
    } else if (newStatus === "COMPLETED" && targetSession.paymentStatus === "UNPAID") {
      if (teacher?.paymentPolicy?.type === "ADVANCE_CYCLE" && (teacher.paymentPolicy.advanceBalance || 0) >= targetSession.fee) {
        newPaymentStatus = "COVERED_BY_ADVANCE";
        const updatedTeachers = teachers.map(t => {
          if (t.id === teacher.id) {
            const ut = {
              ...t,
              paymentPolicy: {
                ...t.paymentPolicy,
                advanceBalance: Math.max(0, (t.paymentPolicy.advanceBalance || 0) - targetSession.fee)
              }
            };
            updatedTeacherToPersist = ut;
            return ut;
          }
          return t;
        });
        updateTeachers(updatedTeachers);
        toast.info(`Covered by prepaid advance. ৳${targetSession.fee} deducted from credit.`);
      }
    }

    const updated = sessions.map(s =>
      s.id === sessionId ? { ...s, status: newStatus, paymentStatus: newPaymentStatus } : s
    );

    updateSessions(updated);
    toast.success(`Updated status to ${newStatus.toLowerCase()}`);

    // Supabase DB persist
    try {
      await dbUpdateSessionStatus(sessionId, newStatus);
      if (updatedTeacherToPersist) {
        await dbSaveTeacher(updatedTeacherToPersist);
      }
    } catch (err) {
      console.error("Failed to persist session status to Supabase:", err);
    }
  };

  // Action: Quick Toggle Attendance (Present vs Absent)
  const handleToggleAttendance = async (sessionId: string, newAttendance: 'PRESENT' | 'ABSENT') => {
    const targetSession = sessions.find(s => s.id === sessionId);
    if (!targetSession) return;

    const teacher = teachers.find(t => t.id === targetSession.teacherId);
    let updatedSession: ClassSession;

    if (newAttendance === 'ABSENT') {
      updatedSession = {
        ...targetSession,
        attendance: 'ABSENT',
        status: 'TEACHER_ABSENT',
        fee: 0,
        paymentStatus: 'WAIVED',
      };
    } else {
      const defaultRate = (teacher?.dailyRate ?? teacher?.hourlyRate) || 500;
      const isFree = targetSession.isFree;
      updatedSession = {
        ...targetSession,
        attendance: 'PRESENT',
        status: new Date(targetSession.scheduledAt).getTime() < Date.now() ? 'COMPLETED' : 'SCHEDULED',
        fee: isFree ? 0 : defaultRate,
        paymentStatus: isFree ? 'FREE' : 'UNPAID',
      };
    }

    const updated = sessions.map(s => s.id === sessionId ? updatedSession : s);
    updateSessions(updated);
    toast.info(newAttendance === 'ABSENT' ? 'Marked teacher absent (fee waived)' : 'Marked teacher present');

    try {
      await dbSaveSession(updatedSession);
    } catch (err) {
      console.error('Failed to toggle attendance in Supabase:', err);
    }
  };

  // Action: Update Class Session (Edit literally everything from Calendar)
  const handleUpdateSession = async (updatedSession: ClassSession) => {
    const updated = sessions.map(s => s.id === updatedSession.id ? updatedSession : s);
    updateSessions(updated);
    setEditingSession(null);
    toast.success("Class session details updated");

    try {
      const saved = await dbSaveSession(updatedSession);
      if (saved) {
        setSessions(prev => prev.map(s => s.id === saved.id ? saved : s));
      }
    } catch (err) {
      console.error("Failed to update session in Supabase:", err);
    }
  };

  // Action: Delete Class Session
  const handleDeleteSession = async (sessionId: string) => {
    if (confirm("Are you sure you want to delete this class session?")) {
      updateSessions(sessions.filter(s => s.id !== sessionId));
      if (selectedSessionId === sessionId) {
        setSelectedSessionId(null);
      }
      setEditingSession(null);
      toast.info("Class session removed");

      try {
        await dbDeleteSession(sessionId);
      } catch (err) {
        console.error("Failed to delete session from Supabase:", err);
      }
    }
  };

  // Action: Batch settle teacher cycle
  const handleSettleTeacherCycle = async (teacherId: string) => {
    const teacher = teachers.find(t => t.id === teacherId);
    const pendingSessions = unpaidSessionsByTeacher[teacherId] || [];
    if (!teacher || pendingSessions.length === 0) {
      toast.info("No unpaid sessions found for this teacher");
      return;
    }

    const totalAmount = pendingSessions.reduce((acc, curr) => acc + curr.fee, 0);
    const sessionIds = pendingSessions.map(s => s.id);
    const nowIso = new Date().toISOString();

    const newPayment: PaymentRecord = {
      id: `pay-${Date.now()}`,
      teacherId,
      sessionIds,
      type: "CYCLE_SETTLEMENT",
      amount: totalAmount,
      paidAt: nowIso,
      method: "Batch Settlement",
      note: `Full settlement for ${pendingSessions.length} classes`,
    };

    const updatedSessions = sessions.map(s =>
      sessionIds.includes(s.id)
        ? { ...s, paymentStatus: "PAID" as PaymentStatus, paidAt: nowIso }
        : s
    );

    const updatedTeachers = teachers.map(t =>
      t.id === teacherId
        ? { ...t, paymentPolicy: { ...t.paymentPolicy, isDelayed: false, delayedUntil: undefined, delayReason: undefined } }
        : t
    );

    updateSessions(updatedSessions);
    updateTeachers(updatedTeachers);
    updatePayments([newPayment, ...payments]);

    toast.success(`Settled ${pendingSessions.length} classes for ${teacher.name} (৳${totalAmount.toFixed(2)})`);

    // Supabase DB persist
    try {
      const savedPay = await dbCreatePayment(newPayment);
      if (savedPay) {
        setPayments(prev => prev.map(p => p.id === newPayment.id ? savedPay : p));
      }
      const teacherObj = updatedTeachers.find(t => t.id === teacherId);
      if (teacherObj) {
        await dbSaveTeacher(teacherObj);
      }
    } catch (err) {
      console.error("Failed to sync cycle settlement to Supabase:", err);
    }
  };

  // Action: Record payment modal submit (settlement or advance deposit)
  const handleRecordPayment = async (paymentData: {
    teacherId: string;
    sessionIds: string[];
    type: 'PER_CLASS' | 'CYCLE_SETTLEMENT' | 'ADVANCE_DEPOSIT';
    amount: number;
    method: string;
    reference?: string;
    note?: string;
  }) => {
    const nowIso = new Date().toISOString();
    const newPayment: PaymentRecord = {
      id: `pay-${Date.now()}`,
      teacherId: paymentData.teacherId,
      sessionIds: paymentData.sessionIds,
      type: paymentData.type,
      amount: paymentData.amount,
      paidAt: nowIso,
      method: paymentData.method,
      reference: paymentData.reference,
      note: paymentData.note,
    };

    let teacherToPersist: Teacher | null = null;

    if (paymentData.type === "ADVANCE_DEPOSIT") {
      const updatedTeachers = teachers.map(t => {
        if (t.id === paymentData.teacherId) {
          const ut = {
            ...t,
            paymentPolicy: {
              ...t.paymentPolicy,
              advanceBalance: (t.paymentPolicy.advanceBalance || 0) + paymentData.amount,
            }
          };
          teacherToPersist = ut;
          return ut;
        }
        return t;
      });
      updateTeachers(updatedTeachers);
      toast.success(`Added ৳${paymentData.amount.toFixed(2)} advance credit`);
    } else {
      const updatedSessions = sessions.map(s => {
        if (paymentData.sessionIds.includes(s.id)) {
          return { ...s, paymentStatus: "PAID" as PaymentStatus, paidAt: nowIso };
        }
        return s;
      });
      updateSessions(updatedSessions);
      toast.success(`Recorded payment of ৳${paymentData.amount.toFixed(2)}`);
    }

    updatePayments([newPayment, ...payments]);

    // Supabase DB persist
    try {
      const savedPay = await dbCreatePayment(newPayment);
      if (savedPay) {
        setPayments(prev => prev.map(p => p.id === newPayment.id ? savedPay : p));
      }
      if (teacherToPersist) {
        await dbSaveTeacher(teacherToPersist);
      }
    } catch (err) {
      console.error("Failed to persist payment to Supabase:", err);
    }
  };

  // Action: Set delay on teacher
  const handleConfirmDelay = async (teacherId: string, delayedUntil: string, reason: string) => {
    let updatedTeacher: Teacher | null = null;
    const updatedTeachers = teachers.map(t => {
      if (t.id === teacherId) {
        const ut = {
          ...t,
          paymentPolicy: {
            ...t.paymentPolicy,
            isDelayed: true,
            delayedUntil,
            delayReason: reason || undefined,
          }
        };
        updatedTeacher = ut;
        return ut;
      }
      return t;
    });

    updateTeachers(updatedTeachers);
    toast.success(`Payment deferred until ${delayedUntil}`);

    if (updatedTeacher) {
      try {
        await dbSaveTeacher(updatedTeacher);
      } catch (err) {
        console.error("Failed to update teacher delay on Supabase:", err);
      }
    }
  };

  // Action: Remove delay
  const handleClearDelay = async (teacherId: string) => {
    let updatedTeacher: Teacher | null = null;
    const updatedTeachers = teachers.map(t => {
      if (t.id === teacherId) {
        const ut = {
          ...t,
          paymentPolicy: {
            ...t.paymentPolicy,
            isDelayed: false,
            delayedUntil: undefined,
            delayReason: undefined,
          }
        };
        updatedTeacher = ut;
        return ut;
      }
      return t;
    });

    updateTeachers(updatedTeachers);
    toast.info("Delay status removed");

    if (updatedTeacher) {
      try {
        await dbSaveTeacher(updatedTeacher);
      } catch (err) {
        console.error("Failed to clear teacher delay on Supabase:", err);
      }
    }
  };

  // Action: Add / Edit Teacher
  const handleSaveTeacher = async (data: Partial<Teacher>) => {
    const rate = Number(data.dailyRate ?? data.hourlyRate ?? 500);
    const teacherPayload: Partial<Teacher> = {
      ...data,
      dailyRate: rate,
      hourlyRate: rate,
      color: data.color || TEACHER_PALETTE[teachers.length % TEACHER_PALETTE.length],
      paymentPolicy: data.paymentPolicy || {
        type: "AFTER_N_CLASSES",
        cycleSize: 4,
        advanceBalance: 0,
        isDelayed: false,
      },
    };

    try {
      const saved = await dbSaveTeacher(teacherPayload);
      if (saved) {
        let updatedList: Teacher[];
        if (data.id) {
          updatedList = teachers.map(t => t.id === saved.id ? saved : t);
          toast.success("Teacher profile updated");
        } else {
          updatedList = [saved, ...teachers];
          toast.success(`Added teacher: ${saved.name}`);
        }
        updateTeachers(updatedList);
        if (saved.weekdays && saved.weekdays.length > 0) {
          await syncTeacherRoutines(updatedList, subjects, sessions);
        }
        return;
      }
    } catch (err) {
      console.error("Supabase dbSaveTeacher error:", err);
    }

    // Local fallback
    if (data.id) {
      const updated = teachers.map(t => t.id === data.id ? { ...t, ...teacherPayload } as Teacher : t);
      updateTeachers(updated);
      toast.success("Teacher profile updated (locally)");
    } else {
      const newTeacher: Teacher = {
        id: `t-${Date.now()}`,
        name: data.name || "Teacher",
        email: data.email,
        phone: data.phone,
        hourlyRate: rate,
        dailyRate: rate,
        color: teacherPayload.color!,
        subjectIds: data.subjectIds || [],
        paymentPolicy: teacherPayload.paymentPolicy!,
        createdAt: new Date().toISOString(),
      };
      updateTeachers([newTeacher, ...teachers]);
      toast.success(`Added teacher: ${newTeacher.name} (locally)`);
    }
  };

  const handleDeleteTeacher = async (teacherId: string) => {
    if (confirm("Are you sure you want to delete this teacher?")) {
      updateTeachers(teachers.filter(t => t.id !== teacherId));
      toast.info("Teacher removed");
      try {
        await dbDeleteTeacher(teacherId);
      } catch (err) {
        console.error("Failed to delete teacher from Supabase:", err);
      }
    }
  };

  // Action: Add / Schedule Individual Class (with full Free Class and Scheduled/Completed support)
  const handleScheduleClass = async (sessionData: Partial<ClassSession>) => {
    const isFree = Boolean(sessionData.isFree || sessionData.paymentStatus === "FREE");
    const fee = isFree ? 0 : Number(sessionData.fee || 500);
    const paymentStatus: PaymentStatus = isFree ? "FREE" : (sessionData.paymentStatus || "UNPAID");
    const targetTeacher = teachers.find(t => t.id === sessionData.teacherId);
    const defaultDuration = targetTeacher?.defaultDurationMin || 60;
    const durationMin = sessionData.durationMin || defaultDuration;

    const newSessionPayload: Partial<ClassSession> = {
      teacherId: sessionData.teacherId || teachers[0]?.id || "",
      subjectId: sessionData.subjectId || subjects[0]?.id || "",
      scheduledAt: sessionData.scheduledAt || new Date().toISOString(),
      durationMin,
      fee,
      isFree,
      isExtra: Boolean(sessionData.isExtra),
      attendance: sessionData.attendance || "PRESENT",
      status: sessionData.status || "SCHEDULED",
      paymentStatus,
      notes: [],
    };

    try {
      const saved = await dbSaveSession(newSessionPayload);
      if (saved) {
        updateSessions([saved, ...sessions]);
        toast.success(
          sessionData.status === "COMPLETED"
            ? "Completed class session logged"
            : isFree
            ? "Free class session scheduled"
            : "Class session scheduled"
        );
        return;
      }
    } catch (err) {
      console.error("Failed to save session to Supabase:", err);
    }

    const fallbackSession: ClassSession = {
      ...newSessionPayload,
      id: `cs-${Date.now()}`,
    } as ClassSession;
    updateSessions([fallbackSession, ...sessions]);
    toast.success("Class session recorded");
  };

  // Action: Auto-generate sessions for the next 14 days from active RecurringSchedules
  const handleGenerateRecurringSessions = async () => {
    const newGenerated: ClassSession[] = [];
    const today = new Date();

    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      const targetDate = new Date();
      targetDate.setDate(today.getDate() + dayOffset);
      const dayOfWeek = targetDate.getDay();

      const matchingSchedules = schedules.filter(s => s.isActive && s.dayOfWeek === dayOfWeek);

      for (const sch of matchingSchedules) {
        const dateStr = targetDate.toISOString().split("T")[0];
        const scheduledAt = `${dateStr}T${sch.startTime}:00`;

        const exists = sessions.some(s => s.scheduledAt.startsWith(dateStr) && s.teacherId === sch.teacherId && s.subjectId === sch.subjectId);
        if (!exists) {
          const teacher = teachers.find(t => t.id === sch.teacherId);
          const hasAdvance = teacher?.paymentPolicy?.type === "ADVANCE_CYCLE" && (teacher.paymentPolicy.advanceBalance || 0) >= sch.rate;

          const sessionPayload: Partial<ClassSession> = {
            scheduleId: sch.id,
            teacherId: sch.teacherId,
            subjectId: sch.subjectId,
            scheduledAt,
            durationMin: sch.durationMin,
            fee: sch.rate,
            isFree: false,
            status: "SCHEDULED",
            paymentStatus: hasAdvance ? "COVERED_BY_ADVANCE" : "UNPAID",
            notes: [],
          };

          try {
            const saved = await dbSaveSession(sessionPayload);
            if (saved) {
              newGenerated.push(saved);
              continue;
            }
          } catch (e) {
            console.error("Error creating recurring session in DB:", e);
          }

          newGenerated.push({
            ...sessionPayload,
            id: `cs-gen-${Date.now()}-${dayOffset}-${sch.id}`,
          } as ClassSession);
        }
      }
    }

    if (newGenerated.length === 0) {
      toast.info("All upcoming sessions for the next 2 weeks already exist on the schedule.");
      return;
    }

    updateSessions([...sessions, ...newGenerated]);
    toast.success(`Generated ${newGenerated.length} upcoming class sessions from recurring routines!`);
  };

  // Action: Add Note to session
  const handleAddSessionNote = async (sessionId: string, content: string, isHomework: boolean) => {
    const updated = sessions.map(s => {
      if (s.id === sessionId) {
        return {
          ...s,
          notes: [
            ...(s.notes || []),
            {
              id: `n-${Date.now()}`,
              sessionId,
              content,
              isHomework,
              createdAt: "Just now",
            }
          ]
        };
      }
      return s;
    });
    updateSessions(updated);
    toast.success("Note attached to session");

    try {
      await dbAddSessionNote(sessionId, content, isHomework);
    } catch (err) {
      console.error("Failed to add session note to Supabase:", err);
    }
  };

  // Action: Add Academic Event
  const handleSaveEvent = async (eventData: {
    title: string;
    description?: string;
    startAt: string;
    eventType: CalendarEvent["eventType"];
    subjectId?: string;
  }) => {
    try {
      const saved = await dbSaveEvent(eventData);
      if (saved) {
        updateEvents([...events, saved]);
        toast.success(`Added event: ${saved.title}`);
        return;
      }
    } catch (err) {
      console.error("Failed to save event to Supabase:", err);
    }

    const fallbackEvent: CalendarEvent = {
      id: `ev-${Date.now()}`,
      title: eventData.title,
      description: eventData.description,
      startAt: eventData.startAt,
      eventType: eventData.eventType,
      subjectId: eventData.subjectId,
    };
    updateEvents([...events, fallbackEvent]);
    toast.success(`Added event: ${fallbackEvent.title}`);
  };

  // Action: Add Subject
  const handleSaveSubject = async (data: { name: string; color: string; defaultDurationMin: number }) => {
    try {
      const saved = await dbSaveSubject(data);
      if (saved) {
        updateSubjects([...subjects, saved]);
        toast.success(`Subject "${saved.name}" created`);
        return;
      }
    } catch (err) {
      console.error("Failed to save subject to Supabase:", err);
    }

    const fallbackSub: Subject = {
      id: `sub-${Date.now()}`,
      name: data.name,
      color: data.color,
      defaultDurationMin: data.defaultDurationMin,
    };
    updateSubjects([...subjects, fallbackSub]);
    toast.success(`Subject "${fallbackSub.name}" created`);
  };

  const handleDeleteSubject = async (subjectId: string) => {
    if (confirm("Delete subject?")) {
      updateSubjects(subjects.filter(s => s.id !== subjectId));
      toast.info("Subject removed");
      try {
        await dbDeleteSubject(subjectId);
      } catch (err) {
        console.error("Failed to delete subject from Supabase:", err);
      }
    }
  };

  // Quick Action Opener
  const handleOpenQuickAction = (action: "add-teacher" | "schedule-class" | "record-payment" | "add-event") => {
    if (action === "add-teacher") {
      setEditingTeacher(null);
      setIsAddTeacherOpen(true);
    } else if (action === "schedule-class") {
      setScheduleInitialDate(undefined);
      setIsScheduleOpen(true);
    } else if (action === "record-payment") {
      setPreselectedPayTeacherId(undefined);
      setIsRecordPaymentOpen(true);
    } else if (action === "add-event") {
      setIsAddEventOpen(true);
    }
  };

  if (!mounted) {
    return (
      <div className="p-8 text-zinc-500 text-xs">
        Loading personal tuition data...
      </div>
    );
  }

  // If viewing an individual session detail
  if (selectedSessionId) {
    const targetSession = sessions.find(s => s.id === selectedSessionId);
    if (targetSession) {
      const teacher = teachers.find(t => t.id === targetSession.teacherId);
      const subject = subjects.find(s => s.id === targetSession.subjectId);

      return (
        <>
          <ClassSessionView
            session={targetSession}
            teacher={teacher}
            subject={subject}
            onBack={() => setSelectedSessionId(null)}
            onEditSession={(s) => setEditingSession(s)}
            onDeleteSession={handleDeleteSession}
            onToggleFreeClass={handleToggleFreeClass}
            onUpdateStatus={handleUpdateSessionStatus}
            onMarkAsPaid={handleMarkSessionPaid}
            onAddNote={handleAddSessionNote}
            onOpenDelayModal={(t) => {
              setDelayTeacherTarget(t);
              setIsDelayModalOpen(true);
            }}
          />
          <EditClassSessionModal
            isOpen={!!editingSession}
            onClose={() => setEditingSession(null)}
            session={editingSession}
            teachers={teachers}
            subjects={subjects}
            onSave={handleUpdateSession}
            onDelete={handleDeleteSession}
          />
        </>
      );
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8 text-zinc-900 dark:text-zinc-100">
      {/* Navigation Tabs (Brutally clean, minimal borders) */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-6 text-xs uppercase tracking-wider font-semibold">
          <button
            onClick={() => setActiveTab("overview")}
            className={`pb-2 transition-colors border-b-2 cursor-pointer ${activeTab === "overview"
              ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
              : "border-transparent text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
              }`}
          >
            Overview
          </button>

          <button
            onClick={() => setActiveTab("calendar")}
            className={`pb-2 transition-colors border-b-2 cursor-pointer ${activeTab === "calendar"
              ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
              : "border-transparent text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
              }`}
          >
            Calendar & Schedule
          </button>

          <button
            onClick={() => setActiveTab("teachers")}
            className={`pb-2 transition-colors border-b-2 cursor-pointer ${activeTab === "teachers"
              ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
              : "border-transparent text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
              }`}
          >
            Subjects
          </button>

          <button
            onClick={() => setActiveTab("payments")}
            className={`pb-2 transition-colors border-b-2 cursor-pointer ${activeTab === "payments"
              ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
              : "border-transparent text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
              }`}
          >
            Ledger & Payments
          </button>

          <button
            onClick={() => setActiveTab("reports")}
            className={`pb-2 transition-colors border-b-2 cursor-pointer ${activeTab === "reports"
              ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
              : "border-transparent text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
              }`}
          >
            Analytics & Reports
          </button>
        </div>
      </div>

      {/* Main Tab Views */}
      {activeTab === "overview" && (
        <TuitionDashboard
          teachers={teachers}
          subjects={subjects}
          sessions={sessions}
          events={events}
          onSelectSession={(id) => setSelectedSessionId(id)}
          onOpenQuickAction={handleOpenQuickAction}
          onMarkSessionPaid={handleMarkSessionPaid}
          onOpenDelayModal={(t) => {
            setDelayTeacherTarget(t);
            setIsDelayModalOpen(true);
          }}
          onSettleTeacherCycle={handleSettleTeacherCycle}
          onViewAllSessions={() => setActiveTab("calendar")}
        />
      )}

      {activeTab === "calendar" && (
        <TuitionCalendar
          sessions={sessions}
          events={events}
          teachers={teachers}
          subjects={subjects}
          schedules={schedules}
          onSelectSession={(id) => setSelectedSessionId(id)}
          onEditSession={(s) => setEditingSession(s)}
          onDeleteSession={handleDeleteSession}
          onToggleAttendance={handleToggleAttendance}
          onToggleFreeClass={handleToggleFreeClass}
          onOpenScheduleModal={(d?: string) => {
            const dateStr = typeof d === "string" && d.trim().length === 10 ? d.trim() : undefined;
            setScheduleInitialDate(dateStr);
            setIsScheduleOpen(true);
          }}
          onOpenEventModal={() => setIsAddEventOpen(true)}
          onGenerateRecurringSessions={handleGenerateRecurringSessions}
        />
      )}

      {activeTab === "teachers" && (
        <TuitionTeachers
          teachers={teachers}
          subjects={subjects}
          sessions={sessions}
          onOpenAddTeacher={() => {
            setEditingTeacher(null);
            setIsAddTeacherOpen(true);
          }}
          onEditTeacher={(t) => {
            setEditingTeacher(t);
            setIsAddTeacherOpen(true);
          }}
          onDeleteTeacher={handleDeleteTeacher}
          onOpenAddSubject={() => setIsAddSubjectOpen(true)}
          onDeleteSubject={handleDeleteSubject}
          onOpenDelayModal={(t) => {
            setDelayTeacherTarget(t);
            setIsDelayModalOpen(true);
          }}
          onSettleTeacher={handleSettleTeacherCycle}
        />
      )}

      {activeTab === "payments" && (
        <TuitionPayments
          payments={payments}
          teachers={teachers}
          onOpenRecordPayment={() => {
            setPreselectedPayTeacherId(undefined);
            setIsRecordPaymentOpen(true);
          }}
        />
      )}

      {activeTab === "reports" && (
        <TuitionReports
          teachers={teachers}
          subjects={subjects}
          sessions={sessions}
          payments={payments}
        />
      )}

      {/* MODALS */}
      <AddTeacherModal
        isOpen={isAddTeacherOpen}
        onClose={() => {
          setIsAddTeacherOpen(false);
          setEditingTeacher(null);
        }}
        subjects={subjects}
        onSave={handleSaveTeacher}
        existingTeacher={editingTeacher}
        onQuickAddSubject={(name) => {
          handleSaveSubject({
            name,
            color: TEACHER_PALETTE[subjects.length % TEACHER_PALETTE.length],
            defaultDurationMin: 60,
          });
        }}
      />

      <ScheduleClassModal
        key={`sched-modal-${scheduleInitialDate || 'today'}-${isScheduleOpen ? 'open' : 'closed'}`}
        isOpen={isScheduleOpen}
        onClose={() => {
          setIsScheduleOpen(false);
          setScheduleInitialDate(undefined);
        }}
        teachers={teachers}
        subjects={subjects}
        initialDate={scheduleInitialDate}
        onSave={handleScheduleClass}
      />

      <EditClassSessionModal
        isOpen={!!editingSession}
        onClose={() => setEditingSession(null)}
        session={editingSession}
        teachers={teachers}
        subjects={subjects}
        onSave={handleUpdateSession}
        onDelete={handleDeleteSession}
      />

      <RecordPaymentModal
        isOpen={isRecordPaymentOpen}
        onClose={() => setIsRecordPaymentOpen(false)}
        teachers={teachers}
        preselectedTeacherId={preselectedPayTeacherId}
        unpaidSessionsByTeacher={unpaidSessionsByTeacher}
        onRecordPayment={handleRecordPayment}
      />

      <DelayPaymentModal
        isOpen={isDelayModalOpen}
        onClose={() => setIsDelayModalOpen(false)}
        teacher={delayTeacherTarget}
        onConfirmDelay={handleConfirmDelay}
        onClearDelay={handleClearDelay}
      />

      <AddEventModal
        isOpen={isAddEventOpen}
        onClose={() => setIsAddEventOpen(false)}
        subjects={subjects}
        onSave={handleSaveEvent}
      />

      <AddSubjectModal
        isOpen={isAddSubjectOpen}
        onClose={() => setIsAddSubjectOpen(false)}
        onSave={handleSaveSubject}
      />
    </div>
  );
}
