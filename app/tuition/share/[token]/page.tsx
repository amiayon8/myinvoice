"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Filter,
  CheckCircle2,
  Clock3,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  List,
  CalendarDays,
  AlertCircle,
  X,
  CreditCard,
  Receipt,
  Wallet,
} from "lucide-react";
import {
  ClassSession,
  CalendarEvent,
  Teacher,
  Subject,
  RecurringSchedule,
  PaymentRecord,
} from "@/types/tuition";
import { getTeacherSessionColor } from "@/lib/tuition-storage";

interface SharedPageProps {
  params: Promise<{ token: string }>;
}

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function PublicSharedTuitionPage({
  params: paramsPromise,
}: SharedPageProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [linkData, setLinkData] = useState<any>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [schedules, setSchedules] = useState<RecurringSchedule[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);

  const [viewDate, setViewDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<"calendar" | "agenda" | "payments">(
    "calendar",
  );
  const [selectedSubjectFilter, setSelectedSubjectFilter] =
    useState<string>("ALL");
  const [selectedTeacherFilter, setSelectedTeacherFilter] =
    useState<string>("ALL");
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() =>
    toDateKey(new Date()),
  );

  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [submittingRecord, setSubmittingRecord] = useState(false);
  const [recordTeacherId, setRecordTeacherId] = useState("");
  const [recordSubjectId, setRecordSubjectId] = useState("");
  const [recordDate, setRecordDate] = useState(() => toDateKey(new Date()));
  const [recordNotes, setRecordNotes] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    paramsPromise.then((resolved) => {
      setToken(resolved.token);
    });
  }, [paramsPromise]);

  const loadPortalData = async (currentToken: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/tuition/share/${currentToken}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Failed to load tuition schedule");
        return;
      }
      setLinkData(json.link);
      setTeachers(json.teachers || []);
      setSubjects(json.subjects || []);
      setSessions(json.sessions || []);
      setEvents(json.events || []);
      setSchedules(json.schedules || []);
      setPayments(json.payments || []);

      if (json.teachers && json.teachers.length === 1) {
        const singleTeacher = json.teachers[0];
        setRecordTeacherId(singleTeacher.id);
        if (singleTeacher.defaultSubjectId) {
          setRecordSubjectId(singleTeacher.defaultSubjectId);
        } else if (
          singleTeacher.subjectIds &&
          singleTeacher.subjectIds.length > 0
        ) {
          setRecordSubjectId(singleTeacher.subjectIds[0]);
        }
      } else if (json.teachers && json.teachers.length > 0) {
        const first = json.teachers[0];
        setRecordTeacherId(first.id);
        if (first.defaultSubjectId) {
          setRecordSubjectId(first.defaultSubjectId);
        } else if (first.subjectIds && first.subjectIds.length > 0) {
          setRecordSubjectId(first.subjectIds[0]);
        }
      }
    } catch (err: any) {
      setError(
        err.message || "An unexpected error occurred while loading schedule",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadPortalData(token);
    }
  }, [token]);

  const teacherMap = useMemo(
    () => new Map(teachers.map((t) => [t.id, t])),
    [teachers],
  );
  const subjectMap = useMemo(
    () => new Map(subjects.map((s) => [s.id, s])),
    [subjects],
  );

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (
        selectedTeacherFilter !== "ALL" &&
        s.teacherId !== selectedTeacherFilter
      )
        return false;
      if (
        selectedSubjectFilter !== "ALL" &&
        s.subjectId !== selectedSubjectFilter
      )
        return false;
      return true;
    });
  }, [sessions, selectedTeacherFilter, selectedSubjectFilter]);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (
        selectedTeacherFilter !== "ALL" &&
        p.teacherId !== selectedTeacherFilter
      )
        return false;
      return true;
    });
  }, [payments, selectedTeacherFilter]);

  const sessionsByDate = useMemo(() => {
    const map: Record<string, ClassSession[]> = {};
    filteredSessions.forEach((s) => {
      const key = s.scheduledAt.split("T")[0].split(" ")[0];
      if (!map[key]) map[key] = [];
      map[key].push(s);
    });
    return map;
  }, [filteredSessions]);

  const paymentsByDate = useMemo(() => {
    const map: Record<string, PaymentRecord[]> = {};
    filteredPayments.forEach((p) => {
      const key = p.paidAt.split("T")[0].split(" ")[0];
      if (!map[key]) map[key] = [];
      map[key].push(p);
    });
    return map;
  }, [filteredPayments]);

  const agendaGroupedByDate = useMemo(() => {
    const map: Record<
      string,
      { sessions: ClassSession[]; payments: PaymentRecord[] }
    > = {};

    filteredSessions.forEach((s) => {
      const key = s.scheduledAt.split("T")[0].split(" ")[0];
      if (!map[key]) map[key] = { sessions: [], payments: [] };
      map[key].sessions.push(s);
    });

    filteredPayments.forEach((p) => {
      const key = p.paidAt.split("T")[0].split(" ")[0];
      if (!map[key]) map[key] = { sessions: [], payments: [] };
      map[key].payments.push(p);
    });

    const sortedEntries = Object.entries(map).sort(
      ([dateA], [dateB]) =>
        new Date(dateB).getTime() - new Date(dateA).getTime(),
    );

    const sortedMap: Record<
      string,
      { sessions: ClassSession[]; payments: PaymentRecord[] }
    > = {};
    sortedEntries.forEach(([k, v]) => {
      sortedMap[k] = {
        sessions: v.sessions.sort(
          (a, b) =>
            new Date(b.scheduledAt).getTime() -
            new Date(a.scheduledAt).getTime(),
        ),
        payments: v.payments.sort(
          (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime(),
        ),
      };
    });

    return sortedMap;
  }, [filteredSessions, filteredPayments]);

  const totalPaidAmount = useMemo(() => {
    return filteredPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
  }, [filteredPayments]);

  const totalCoveredSessions = useMemo(() => {
    const ids = new Set<string>();
    filteredPayments.forEach((p) => {
      (p.sessionIds || []).forEach((id) => ids.add(id));
    });
    return ids.size;
  }, [filteredPayments]);

  const handleTeacherChangeForRecord = (teacherId: string) => {
    setRecordTeacherId(teacherId);
    const selected = teacherMap.get(teacherId);
    if (selected) {
      if (selected.defaultSubjectId) {
        setRecordSubjectId(selected.defaultSubjectId);
      } else if (selected.subjectIds && selected.subjectIds.length > 0) {
        setRecordSubjectId(selected.subjectIds[0]);
      }
    }
  };

  const handleOpenRecordModal = () => {
    setRecordDate(selectedDateKey || toDateKey(new Date()));
    if (teachers.length > 0 && !recordTeacherId) {
      handleTeacherChangeForRecord(teachers[0].id);
    }
    setRecordNotes("");
    setIsRecordModalOpen(true);
  };

  const handleRecordClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!recordTeacherId || !recordSubjectId || !recordDate) {
      toast.error("Please fill in teacher, subject, and date.");
      return;
    }

    try {
      setSubmittingRecord(true);
      const scheduledAt = `${recordDate}T12:00:00`;
      const res = await fetch(`/api/tuition/share/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: recordTeacherId,
          subjectId: recordSubjectId,
          scheduledAt,
          durationMin: 60,
          notes: recordNotes.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Failed to record class session");
        return;
      }

      toast.success("Class recorded successfully! Pending admin approval.");
      setIsRecordModalOpen(false);
      setRecordNotes("");
      setSessions((prev) => [json.session, ...prev]);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit class record");
    } finally {
      setSubmittingRecord(false);
    }
  };

  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startingDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days: {
      dateKey: string;
      dayNumber: number;
      isCurrentMonth: boolean;
    }[] = [];

    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const prevDate = new Date(year, month - 1, d);
      days.push({
        dateKey: toDateKey(prevDate),
        dayNumber: d,
        isCurrentMonth: false,
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const curDate = new Date(year, month, d);
      days.push({
        dateKey: toDateKey(curDate),
        dayNumber: d,
        isCurrentMonth: true,
      });
    }

    const remainingCells = 42 - days.length;
    for (let d = 1; d <= remainingCells; d++) {
      const nextDate = new Date(year, month + 1, d);
      days.push({
        dateKey: toDateKey(nextDate),
        dayNumber: d,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [viewDate]);

  const selectedDateSessions = sessionsByDate[selectedDateKey] || [];
  const selectedDatePayments = paymentsByDate[selectedDateKey] || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-center items-center p-6 text-center">
        <div className="w-8 h-8 border-2 border-zinc-900 dark:border-zinc-100 border-t-transparent animate-spin rounded-full mb-3" />
        <p className="text-xs uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400">
          Loading tuition portal...
        </p>
      </div>
    );
  }

  if (error || !linkData) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex justify-center items-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-full flex justify-center items-center text-xl mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Access Restricted
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
            {error || "This shared calendar link is invalid or has expired."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans antialiased">
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-zinc-900/95 backdrop-blur border-b border-zinc-200 dark:border-zinc-800 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div></div>

          <div className="flex items-center gap-2.5">
            <div className="inline-flex rounded-lg border border-zinc-200 dark:border-zinc-800 p-0.5 bg-zinc-100/60 dark:bg-zinc-800/60">
              <button
                onClick={() => setViewMode("calendar")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  viewMode === "calendar"
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                Calendar
              </button>
              <button
                onClick={() => setViewMode("agenda")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  viewMode === "agenda"
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
              >
                <List className="w-3.5 h-3.5" />
                Agenda
              </button>
              <button
                onClick={() => setViewMode("payments")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  viewMode === "payments"
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                Payments
                {payments.length > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.2 text-[10px] rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold">
                    {payments.length}
                  </span>
                )}
              </button>
            </div>

            {linkData.allowRecordClass && (
              <button
                onClick={handleOpenRecordModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white rounded-lg transition-colors cursor-pointer shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Record Class
              </button>
            )}

            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 cursor-pointer"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" /> Filters:
            </span>

            {teachers.length > 1 && (
              <select
                value={selectedTeacherFilter}
                onChange={(e) => setSelectedTeacherFilter(e.target.value)}
                className="bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-900 dark:text-zinc-100 cursor-pointer outline-none focus:ring-1 focus:ring-zinc-400"
              >
                <option value="ALL">All Teachers</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}

            {subjects.length > 1 && viewMode !== "payments" && (
              <select
                value={selectedSubjectFilter}
                onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                className="bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-900 dark:text-zinc-100 cursor-pointer outline-none focus:ring-1 focus:ring-zinc-400"
              >
                <option value="ALL">All Subjects</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}

            {(selectedTeacherFilter !== "ALL" ||
              selectedSubjectFilter !== "ALL") && (
              <button
                onClick={() => {
                  setSelectedTeacherFilter("ALL");
                  setSelectedSubjectFilter("ALL");
                }}
                className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 underline cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-zinc-600 dark:text-zinc-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />{" "}
              Approved
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Pending
              Approval
            </span>
            <span className="flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />{" "}
              Payments: <strong>{filteredPayments.length}</strong>
            </span>
            <span className="text-zinc-400">·</span>
            <span>
              Total Sessions: <strong>{filteredSessions.length}</strong>
            </span>
          </div>
        </div>

        {viewMode === "calendar" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  {viewDate.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </h2>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() =>
                      setViewDate(
                        new Date(
                          viewDate.getFullYear(),
                          viewDate.getMonth() - 1,
                          1,
                        ),
                      )
                    }
                    className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer text-zinc-600 dark:text-zinc-400"
                    aria-label="Previous Month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewDate(new Date())}
                    className="px-2.5 py-1 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer text-zinc-600 dark:text-zinc-400"
                  >
                    Today
                  </button>
                  <button
                    onClick={() =>
                      setViewDate(
                        new Date(
                          viewDate.getFullYear(),
                          viewDate.getMonth() + 1,
                          1,
                        ),
                      )
                    }
                    className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer text-zinc-600 dark:text-zinc-400"
                    aria-label="Next Month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 mt-4 text-center">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                  (dayName) => (
                    <div
                      key={dayName}
                      className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 py-1"
                    >
                      {dayName}
                    </div>
                  ),
                )}

                {calendarDays.map((cell) => {
                  const daySessions = sessionsByDate[cell.dateKey] || [];
                  const dayPayments = paymentsByDate[cell.dateKey] || [];
                  const isSelected = selectedDateKey === cell.dateKey;
                  const isToday = toDateKey(new Date()) === cell.dateKey;
                  const hasPending = daySessions.some(
                    (s) => s.approvalStatus === "PENDING",
                  );
                  const hasPayments = dayPayments.length > 0;

                  return (
                    <button
                      key={cell.dateKey}
                      type="button"
                      onClick={() => setSelectedDateKey(cell.dateKey)}
                      className={`min-h-[76px] sm:min-h-[88px] p-1.5 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        isSelected
                          ? "ring-2 ring-zinc-900 dark:ring-zinc-100 border-transparent bg-zinc-50 dark:bg-zinc-800/80"
                          : cell.isCurrentMonth
                            ? "bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                            : "bg-zinc-50/50 dark:bg-zinc-950/40 border-transparent text-zinc-300 dark:text-zinc-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full ${
                            isToday
                              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold"
                              : cell.isCurrentMonth
                                ? "text-zinc-800 dark:text-zinc-200"
                                : "text-zinc-400 dark:text-zinc-600"
                          }`}
                        >
                          {cell.dayNumber}
                        </span>

                        <div className="flex items-center gap-1">
                          {hasPayments && (
                            <span
                              className="w-2 h-2 rounded-full bg-emerald-500"
                              title={`${dayPayments.length} payment(s) made on this date`}
                            />
                          )}
                          {hasPending && (
                            <span
                              className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"
                              title="Contains class pending approval"
                            />
                          )}
                        </div>
                      </div>

                      <div className="space-y-1 mt-1">
                        {dayPayments.map((p) => (
                          <div
                            key={p.id}
                            className="text-[9px] px-1.5 py-0.5 rounded truncate font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1"
                            title={`Payment received: ৳${p.amount.toFixed(2)} (${p.method})`}
                          >
                            <CreditCard className="w-2.5 h-2.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                            <span className="truncate">
                              ৳{p.amount.toLocaleString()} Paid
                            </span>
                          </div>
                        ))}

                        {daySessions.slice(0, 2).map((s) => {
                          const teacher = teacherMap.get(s.teacherId);
                          const subject = subjectMap.get(s.subjectId);
                          const color = getTeacherSessionColor(
                            teacher,
                            s.isFree || false,
                          );
                          const isPending = s.approvalStatus === "PENDING";

                          return (
                            <div
                              key={s.id}
                              className={`text-[10px] px-1.5 py-0.5 rounded truncate font-medium flex items-center gap-1 ${
                                isPending
                                  ? "bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 border border-amber-300 dark:border-amber-800"
                                  : "text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 border-l-2"
                              }`}
                              style={
                                !isPending
                                  ? { borderLeftColor: color }
                                  : undefined
                              }
                            >
                              <span className="truncate">
                                {subject?.name || "Class"}
                              </span>
                              {isPending && (
                                <Clock3 className="w-2.5 h-2.5 shrink-0 text-amber-600 dark:text-amber-400" />
                              )}
                            </div>
                          );
                        })}
                        {daySessions.length > 2 && (
                          <span className="text-[9px] text-zinc-400 font-medium pl-1">
                            +{daySessions.length - 2} more
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex flex-col">
              <div className="pb-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Day Schedule
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {new Date(`${selectedDateKey}T00:00:00`).toLocaleDateString(
                      "en-US",
                      {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      },
                    )}
                  </p>
                </div>

                {linkData.allowRecordClass && (
                  <button
                    onClick={() => {
                      setRecordDate(selectedDateKey);
                      setIsRecordModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-zinc-700 dark:text-zinc-200 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    Record on Date
                  </button>
                )}
              </div>

              <div className="mt-4 space-y-3 flex-1 overflow-y-auto max-h-[500px]">
                {selectedDatePayments.length > 0 && (
                  <div className="space-y-2 mb-3">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5" /> Payments on this
                      Date
                    </div>
                    {selectedDatePayments.map((p) => {
                      const teacher = teacherMap.get(p.teacherId);
                      return (
                        <div
                          key={p.id}
                          className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-emerald-900 dark:text-emerald-100 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Payment Received
                            </span>
                            <span className="text-sm font-black text-emerald-800 dark:text-emerald-300">
                              ৳{p.amount.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                            {teacher && (
                              <>
                                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                  {teacher.name}
                                </span>
                                <span>·</span>
                              </>
                            )}
                            <span>Method: {p.method}</span>
                            <span>·</span>
                            <span>
                              {p.type.replace("_", " ").toLowerCase()}
                            </span>
                            {p.sessionIds && p.sessionIds.length > 0 && (
                              <>
                                <span>·</span>
                                <span>
                                  {p.sessionIds.length} classes covered
                                </span>
                              </>
                            )}
                          </div>
                          {p.note && (
                            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 pt-1.5 border-t border-emerald-200/60 dark:border-emerald-900/60 leading-relaxed">
                              {p.note}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {selectedDateSessions.length === 0 &&
                selectedDatePayments.length === 0 ? (
                  <div className="text-center py-12 text-zinc-400">
                    <CalendarIcon className="w-8 h-8 mx-auto stroke-1 mb-2 text-zinc-300 dark:text-zinc-700" />
                    <p className="text-xs font-medium">
                      No classes or payments on this date
                    </p>
                  </div>
                ) : (
                  selectedDateSessions.map((session) => {
                    const teacher = teacherMap.get(session.teacherId);
                    const subject = subjectMap.get(session.subjectId);
                    const isPending = session.approvalStatus === "PENDING";
                    const isRejected = session.approvalStatus === "REJECTED";

                    return (
                      <div
                        key={session.id}
                        className={`p-3.5 rounded-xl border transition-all ${
                          isPending
                            ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/80"
                            : isRejected
                              ? "bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60"
                              : "bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700/80"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                {subject?.name || "Class Session"}
                              </h4>
                              {isPending ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-800 px-1.5 py-0.5 rounded">
                                  <Clock3 className="w-2.5 h-2.5" />
                                  Pending Approval
                                </span>
                              ) : isRejected ? (
                                <span className="text-[10px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/40 border border-rose-300 dark:border-rose-800 px-1.5 py-0.5 rounded">
                                  Rejected
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-1.5 py-0.5 rounded">
                                  <CheckCircle2 className="w-2.5 h-2.5" />
                                  Approved
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-2">
                              <span>Teacher: {teacher?.name || "Unknown"}</span>
                            </p>
                          </div>
                        </div>

                        {session.notes && session.notes.length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60 text-xs text-zinc-600 dark:text-zinc-400">
                            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                              Notes:{" "}
                            </span>
                            {session.notes.map((n) => n.content).join(" · ")}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        ) : viewMode === "agenda" ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  Agenda View
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  All past and scheduled classes and payment transactions
                  grouped chronologically
                </p>
              </div>

              {linkData.allowRecordClass && (
                <button
                  onClick={handleOpenRecordModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Record Class
                </button>
              )}
            </div>

            {Object.keys(agendaGroupedByDate).length === 0 ? (
              <div className="text-center py-16 text-zinc-400">
                <CalendarIcon className="w-10 h-10 mx-auto stroke-1 mb-2 text-zinc-300 dark:text-zinc-700" />
                <p className="text-sm font-medium">
                  No records match the selected filter
                </p>
              </div>
            ) : (
              Object.entries(agendaGroupedByDate).map(([dateKey, dayData]) => {
                const dateObj = new Date(`${dateKey}T00:00:00`);
                const formattedDate = dateObj.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });

                return (
                  <div key={dateKey} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        {formattedDate}
                      </span>
                      <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1" />
                    </div>

                    {dayData.payments.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
                        {dayData.payments.map((p) => {
                          const teacher = teacherMap.get(p.teacherId);
                          return (
                            <div
                              key={p.id}
                              className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800/80 space-y-2"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded">
                                      <CreditCard className="w-3 h-3" />
                                      Payment Received
                                    </span>
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                      · {p.method}
                                    </span>
                                  </div>
                                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                                    {teacher?.name || "Teacher"} ·{" "}
                                    {p.type.replace("_", " ").toLowerCase()}
                                    {p.sessionIds &&
                                      p.sessionIds.length > 0 && (
                                        <span>
                                          {" "}
                                          · {p.sessionIds.length} classes
                                          settled
                                        </span>
                                      )}
                                  </p>
                                </div>

                                <span className="text-sm font-black text-emerald-800 dark:text-emerald-300 bg-white dark:bg-zinc-900 px-3 py-1 rounded-md border border-emerald-200 dark:border-emerald-800">
                                  ৳{p.amount.toFixed(2)}
                                </span>
                              </div>

                              {p.note && (
                                <p className="text-xs text-zinc-600 dark:text-zinc-400 pt-2 border-t border-emerald-200/60 dark:border-emerald-900/60">
                                  {p.note}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {dayData.sessions.map((session) => {
                        const teacher = teacherMap.get(session.teacherId);
                        const subject = subjectMap.get(session.subjectId);
                        const isPending = session.approvalStatus === "PENDING";
                        const isRejected =
                          session.approvalStatus === "REJECTED";

                        return (
                          <div
                            key={session.id}
                            className={`p-4 rounded-xl border transition-all ${
                              isPending
                                ? "bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800"
                                : isRejected
                                  ? "bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900"
                                  : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                    {subject?.name || "Class Session"}
                                  </h4>
                                  {isPending ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-800 px-1.5 py-0.5 rounded">
                                      <Clock3 className="w-2.5 h-2.5" />
                                      Pending Approval
                                    </span>
                                  ) : isRejected ? (
                                    <span className="text-[10px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/40 border border-rose-300 dark:border-rose-800 px-1.5 py-0.5 rounded">
                                      Rejected
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-1.5 py-0.5 rounded">
                                      <CheckCircle2 className="w-2.5 h-2.5" />
                                      Approved
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-2">
                                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                                    {teacher?.name || "Teacher"}
                                  </span>
                                </p>
                              </div>
                            </div>

                            {session.notes && session.notes.length > 0 && (
                              <div className="mt-3 pt-2.5 border-t border-zinc-200/60 dark:border-zinc-700/60 text-xs text-zinc-600 dark:text-zinc-400">
                                <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                                  Notes:{" "}
                                </span>
                                {session.notes
                                  .map((n) => n.content)
                                  .join(" · ")}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Total Payments Settled
                </div>
                <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-2">
                  ৳
                  {totalPaidAmount.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Across {filteredPayments.length} recorded transaction
                  {filteredPayments.length === 1 ? "" : "s"}
                </p>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  <Receipt className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                  Classes Covered
                </div>
                <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-2">
                  {totalCoveredSessions}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Class sessions with confirmed payment
                </p>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  Completed Classes
                </div>
                <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-2">
                  {
                    filteredSessions.filter((s) => s.status === "COMPLETED")
                      .length
                  }
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Total completed teaching sessions
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <div>
                  <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    Payment History
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Complete ledger of teacher settlements and deposits
                  </p>
                </div>
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  {filteredPayments.length} Payment
                  {filteredPayments.length === 1 ? "" : "s"}
                </span>
              </div>

              {filteredPayments.length === 0 ? (
                <div className="text-center py-16 text-zinc-400">
                  <Receipt className="w-10 h-10 mx-auto stroke-1 mb-2 text-zinc-300 dark:text-zinc-700" />
                  <p className="text-sm font-medium">
                    No payment history recorded yet
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredPayments.map((p) => {
                    const teacher = teacherMap.get(p.teacherId);
                    const paidDate = new Date(p.paidAt).toLocaleDateString(
                      "en-US",
                      {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      },
                    );
                    const paidTime = new Date(p.paidAt).toLocaleTimeString(
                      "en-US",
                      {
                        hour: "numeric",
                        minute: "2-digit",
                      },
                    );

                    return (
                      <div
                        key={p.id}
                        className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900/60 transition-colors space-y-2.5"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-800/60">
                              <CreditCard className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                  ৳{p.amount.toFixed(2)}
                                </h4>
                                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                  {p.type.replace("_", " ")}
                                </span>
                              </div>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                Teacher:{" "}
                                <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                                  {teacher?.name || "Teacher"}
                                </span>{" "}
                                · Method: {p.method}
                              </p>
                            </div>
                          </div>

                          <div className="text-left sm:text-right text-xs text-zinc-500 dark:text-zinc-400">
                            <span className="font-medium text-zinc-800 dark:text-zinc-200 block">
                              {paidDate}
                            </span>
                            <span>{paidTime}</span>
                          </div>
                        </div>

                        {p.note && (
                          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 text-xs text-zinc-600 dark:text-zinc-400">
                            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                              Note:{" "}
                            </span>
                            {p.note}
                          </div>
                        )}

                        {p.sessionIds && p.sessionIds.length > 0 && (
                          <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            Covered Class Sessions:{" "}
                            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                              {p.sessionIds.length} classes
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  Record Class Session
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Submissions will appear as pending until approved by admin
                </p>
              </div>
              <button
                onClick={() => setIsRecordModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer p-1"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordClassSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Teacher
                </label>
                {teachers.length === 1 ? (
                  <input
                    type="text"
                    disabled
                    value={teachers[0].name}
                    className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-3 py-2 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-300"
                  />
                ) : (
                  <select
                    value={recordTeacherId}
                    onChange={(e) =>
                      handleTeacherChangeForRecord(e.target.value)
                    }
                    required
                    className="w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-3 py-2 rounded-lg text-xs font-medium text-zinc-900 dark:text-zinc-100 cursor-pointer outline-none focus:ring-1 focus:ring-zinc-500"
                  >
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Subject
                </label>
                <select
                  value={recordSubjectId}
                  onChange={(e) => setRecordSubjectId(e.target.value)}
                  required
                  className="w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-3 py-2 rounded-lg text-xs font-medium text-zinc-900 dark:text-zinc-100 cursor-pointer outline-none focus:ring-1 focus:ring-zinc-500"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={recordDate}
                  onChange={(e) => setRecordDate(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-3 py-2 rounded-lg text-xs font-medium text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-zinc-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Class Notes / Topics Covered (Optional)
                </label>
                <textarea
                  rows={3}
                  value={recordNotes}
                  onChange={(e) => setRecordNotes(e.target.value)}
                  placeholder="e.g. Chapter 4 Organic Chemistry reactions, problem set 2"
                  className="w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-3 py-2 rounded-lg text-xs font-medium text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-zinc-500 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRecord}
                  className="px-4 py-2 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submittingRecord ? "Submitting..." : "Submit Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <footer className="text-center py-8 text-xs text-zinc-400 dark:text-zinc-600 border-t border-zinc-200 dark:border-zinc-800 mt-12">
        <p>
          Developed by{" "}
          <a
            className="text-black dark:text-white hover:underline"
            href="https://www.thenicedev.xyz"
          >
            The Nice Developer
          </a>
        </p>
      </footer>
    </div>
  );
}
