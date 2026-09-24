"use client";

import React from "react";
import {
  Plus,
  CheckCircle2,
  Clock,
  CreditCard,
  Calendar as CalendarIcon,
  UserPlus,
  FileText,
  AlertTriangle,
  ArrowRight,
  PauseCircle,
  Sparkles,
  ChevronRight
} from "lucide-react";
import {
  Subject,
  Teacher,
  ClassSession,
  CalendarEvent,
  ClassStatus
} from "@/types/tuition";
import { calculateTeacherFinance, TeacherFinancialProfile } from "@/lib/tuition-storage";

interface TuitionDashboardProps {
  teachers: Teacher[];
  subjects: Subject[];
  sessions: ClassSession[];
  events: CalendarEvent[];
  onSelectSession: (sessionId: string) => void;
  onOpenQuickAction: (action: "add-teacher" | "schedule-class" | "record-payment" | "add-event") => void;
  onMarkSessionPaid: (sessionId: string) => void;
  onOpenDelayModal: (teacher: Teacher) => void;
  onSettleTeacherCycle: (teacherId: string) => void;
  onViewAllSessions: () => void;
}

export default function TuitionDashboard({
  teachers,
  subjects,
  sessions,
  events,
  onSelectSession,
  onOpenQuickAction,
  onMarkSessionPaid,
  onOpenDelayModal,
  onSettleTeacherCycle,
  onViewAllSessions
}: TuitionDashboardProps) {
  const subjectMap = new Map(subjects.map(s => [s.id, s]));
  const teacherMap = new Map(teachers.map(t => [t.id, t]));

  // Calculate financial profiles for all teachers
  const teacherProfiles: TeacherFinancialProfile[] = teachers.map(t =>
    calculateTeacherFinance(t, sessions)
  );

  // Completed unpaid sessions (strictly excludes free classes and absences)
  const unpaidCompletedSessions = sessions
    .filter(s => s.status === "COMPLETED" && s.paymentStatus === "UNPAID" && !s.isFree && s.attendance !== "ABSENT")
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

  // Today & upcoming classes
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  const todaySessions = sessions.filter(s => {
    return s.scheduledAt.startsWith(todayStr);
  }).sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  const upcomingSessions = sessions.filter(s => {
    return new Date(s.scheduledAt) > now && s.status === "SCHEDULED";
  }).sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()).slice(0, 4);

  // Financial aggregates
  const totalOutstandingOwed = teacherProfiles.reduce((acc, curr) => acc + curr.unpaidTotalAmount, 0);
  const totalPrepaidPool = teacherProfiles.reduce((acc, curr) => acc + curr.advanceBalance, 0);
  const cyclesDueCount = teacherProfiles.filter(p => p.isCycleDue && !p.isDelayed).length;
  const delayedCount = teacherProfiles.filter(p => p.isDelayed && !p.isDelayExpired).length;

  return (
    <div className="space-y-12 text-zinc-900 dark:text-zinc-100 antialiased">
      {/* Top Header & Fast Action Ribbon */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <p className="text-xs uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-medium">Personal Tuition Log</p>
          <h1 className="text-2xl font-medium tracking-tight text-zinc-900 dark:text-zinc-50 mt-1">Overview & Immediate Needs</h1>
        </div>

        {/* Action Shortcuts */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onOpenQuickAction("schedule-class")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Schedule Class
          </button>
          <button
            onClick={() => onOpenQuickAction("record-payment")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 transition-colors cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
            Record Payment
          </button>
          <button
            onClick={() => onOpenQuickAction("add-teacher")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 transition-colors cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
            Add Teacher
          </button>
          <button
            onClick={() => onOpenQuickAction("add-event")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 transition-colors cursor-pointer"
          >
            <CalendarIcon className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
            Add Event
          </button>
        </div>
      </div>

      {/* Primary High-Signal Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div>
          <span className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">Total Unpaid Balance</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl  tracking-tight font-semibold text-zinc-900 dark:text-zinc-50">
              ৳{totalOutstandingOwed.toFixed(2)}
            </span>
            {cyclesDueCount > 0 && (
              <span className="text-xs font-medium text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 px-1.5 py-0.5 rounded">
                {cyclesDueCount} Cycle Due
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Across {unpaidCompletedSessions.length} completed classes</p>
        </div>

        <div>
          <span className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">Prepaid Advance Credits</span>
          <div className="text-3xl  tracking-tight font-semibold text-zinc-900 dark:text-zinc-50 mt-2">
            ৳{totalPrepaidPool.toFixed(2)}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Available credit for future sessions</p>
        </div>

        <div>
          <span className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">Delayed Settlements</span>
          <div className="text-3xl  tracking-tight font-semibold text-zinc-900 dark:text-zinc-50 mt-2">
            {delayedCount}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Deferred by mutual agreement</p>
        </div>

        <div>
          <span className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">Today's Classes</span>
          <div className="text-3xl  tracking-tight font-semibold text-zinc-900 dark:text-zinc-50 mt-2">
            {todaySessions.length}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {todaySessions.length > 0
              ? `${todaySessions.length} session${todaySessions.length > 1 ? "s" : ""} scheduled`
              : "No classes scheduled for today"}
          </p>
        </div>
      </div>

      {/* Two-Column Core Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column (7 cols): Unpaid Sessions & Immediate Schedule */}
        <div className="lg:col-span-7 space-y-10">

          {/* SECTION 1: Unpaid Completed Sessions (The Core Priority) */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 uppercase">
                  Classes Waiting for Payment
                </h2>
                {unpaidCompletedSessions.length > 0 && (
                  <span className=" text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 px-1.5 py-0.5 rounded font-medium">
                    {unpaidCompletedSessions.length}
                  </span>
                )}
              </div>
              <button
                onClick={onViewAllSessions}
                className="text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors cursor-pointer"
              >
                View all sessions →
              </button>
            </div>

            {unpaidCompletedSessions.length === 0 ? (
              <div className="py-6 border-t border-b border-zinc-200 dark:border-zinc-800 text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                All completed tuition sessions are settled. No unpaid classes.
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 border-t border-b border-zinc-200 dark:border-zinc-800">
                {unpaidCompletedSessions.map((session) => {
                  const teacher = teacherMap.get(session.teacherId);
                  const subject = subjectMap.get(session.subjectId);
                  const isDelayed = teacher?.paymentPolicy?.isDelayed;

                  return (
                    <div
                      key={session.id}
                      onClick={() => onSelectSession(session.id)}
                      className="py-3.5 flex items-center justify-between group hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors px-1"
                    >
                      <div className="min-w-0 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                            {subject?.name || "Subject"}
                          </span>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                            · {teacher?.name}
                          </span>
                          {isDelayed && (
                            <span className="text-[11px] font-medium text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 px-1.5 rounded">
                              Delayed to {teacher.paymentPolicy.delayedUntil}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                          {new Date(session.scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} at {new Date(session.scheduledAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <span className=" text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          ৳{session.fee.toFixed(2)}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkSessionPaid(session.id);
                          }}
                          className="text-xs font-medium text-zinc-900 dark:text-zinc-100 hover:text-black dark:hover:text-white px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
                        >
                          Mark as Paid
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* SECTION 2: Today's Classes & Next Classes */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 uppercase">
                Today's Schedule
              </h2>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {now.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
              </span>
            </div>

            {todaySessions.length === 0 ? (
              <div className="py-6 border-t border-b border-zinc-200 dark:border-zinc-800 text-sm text-zinc-500 dark:text-zinc-400">
                No classes scheduled for today. Check upcoming calendar below.
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 border-t border-b border-zinc-200 dark:border-zinc-800">
                {todaySessions.map((session) => {
                  const teacher = teacherMap.get(session.teacherId);
                  const subject = subjectMap.get(session.subjectId);

                  return (
                    <div
                      key={session.id}
                      onClick={() => onSelectSession(session.id)}
                      className="py-3.5 flex items-center justify-between group hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors px-1"
                    >
                      <div className="flex items-start gap-3">
                        <Clock className="w-4 h-4 text-zinc-400 dark:text-zinc-500 mt-0.5 shrink-0" />
                        <div>
                          <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            {subject?.name}
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            {teacher?.name} · <span className="">{new Date(session.scheduledAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {session.isFree || session.paymentStatus === "FREE" ? (
                          <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-1.5 py-0.5 rounded">
                            FREE
                          </span>
                        ) : (
                          <span className=" text-sm text-zinc-600 dark:text-zinc-300">
                            ৳{session.fee.toFixed(2)}
                          </span>
                        )}
                        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 px-2 py-0.5">
                          {session.status.toLowerCase()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* SECTION 3: Upcoming Classes Next in Line */}
          {upcomingSessions.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 uppercase">
                  Upcoming Classes
                </h2>
              </div>

              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 border-t border-b border-zinc-200 dark:border-zinc-800">
                {upcomingSessions.map((session) => {
                  const teacher = teacherMap.get(session.teacherId);
                  const subject = subjectMap.get(session.subjectId);

                  return (
                    <div
                      key={session.id}
                      onClick={() => onSelectSession(session.id)}
                      className="py-2.5 flex items-center justify-between group hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer px-1 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className=" text-zinc-500 dark:text-zinc-400">
                          {new Date(session.scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">{subject?.name}</span>
                        <span className="text-zinc-500 dark:text-zinc-400">({teacher?.name})</span>
                        {(session.isFree || session.paymentStatus === "FREE") && (
                          <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-1 rounded">
                            FREE
                          </span>
                        )}
                      </div>
                      <span className=" text-zinc-500 dark:text-zinc-400">
                        {new Date(session.scheduledAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

        </div>

        {/* Right Column (5 cols): Teacher Cycle Progress, Delays & Advance Balances */}
        <div className="lg:col-span-5 space-y-10">

          {/* Teacher Status & Cycle Progress Table */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 uppercase">
                Payment Cycles & Balances
              </h2>
            </div>

            <div className="divide-y divide-zinc-200 dark:divide-zinc-800 border-t border-b border-zinc-200 dark:border-zinc-800">
              {teacherProfiles.map((p) => {
                return (
                  <div key={p.teacher.id} className="py-4 space-y-2 px-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{p.teacher.name}</div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                          {p.policyDescription}
                        </div>
                      </div>

                      {/* Financial figures */}
                      <div className="text-right">
                        {p.unpaidTotalAmount > 0 ? (
                          <div className=" text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            ৳{p.unpaidTotalAmount.toFixed(2)}
                          </div>
                        ) : p.advanceBalance > 0 ? (
                          <div className=" text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                            +৳{p.advanceBalance.toFixed(2)}
                          </div>
                        ) : (
                          <div className=" text-sm text-zinc-400 dark:text-zinc-500">
                            ৳0.00
                          </div>
                        )}
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {p.advanceBalance > 0 ? "prepaid credit" : "due balance"}
                        </span>
                      </div>
                    </div>

                    {/* Cycle Progress Bar or Alert */}
                    <div className="pt-1">
                      {p.badge.variant === "due" ? (
                        <div className="flex items-center justify-between bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 p-2 text-xs">
                          <div>
                            <span className="font-semibold text-rose-800 dark:text-rose-200">{p.badge.label}</span>
                            <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">{p.badge.subtext}</p>
                          </div>
                          <button
                            onClick={() => onSettleTeacherCycle(p.teacher.id)}
                            className="px-2.5 py-1 text-xs font-medium text-white bg-rose-700 hover:bg-rose-800 dark:bg-rose-600 dark:hover:bg-rose-500 transition-colors shrink-0 cursor-pointer"
                          >
                            Settle Cycle
                          </button>
                        </div>
                      ) : p.badge.variant === "delay" ? (
                        <div className="flex items-center justify-between bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 p-2 text-xs">
                          <div>
                            <span className="font-medium text-amber-900 dark:text-amber-200">{p.badge.label}</span>
                            <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">{p.badge.subtext}</p>
                          </div>
                          <button
                            onClick={() => onOpenDelayModal(p.teacher)}
                            className="text-xs text-amber-900 dark:text-amber-300 hover:underline shrink-0 ml-2 cursor-pointer"
                          >
                            Edit
                          </button>
                        </div>
                      ) : p.badge.variant === "advance" ? (
                        <div className="bg-emerald-50/50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 p-2 text-xs flex items-center justify-between">
                          <div>
                            <span className="font-medium text-emerald-900 dark:text-emerald-200">{p.badge.label}</span>
                            <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">{p.badge.subtext}</p>
                          </div>
                          <button
                            onClick={() => onOpenQuickAction("record-payment")}
                            className="text-xs text-emerald-800 dark:text-emerald-300 hover:underline shrink-0 cursor-pointer"
                          >
                            Refill
                          </button>
                        </div>
                      ) : p.badge.variant === "progress" ? (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                            <span>Class {p.completedCycleCount} of {p.cycleThreshold} completed</span>
                            <span className=" text-zinc-700 dark:text-zinc-300">৳{p.unpaidTotalAmount.toFixed(2)} accumulated</span>
                          </div>
                          {/* Segmented Progress bar */}
                          <div className="grid grid-cols-4 gap-1 h-1.5 w-full">
                            {Array.from({ length: p.cycleThreshold }).map((_, i) => (
                              <div
                                key={i}
                                className={`h-full ${i < p.completedCycleCount ? "bg-zinc-800 dark:bg-zinc-200" : "bg-zinc-200 dark:bg-zinc-800"}`}
                              />
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          All settled. Next session will start cycle 1.
                        </div>
                      )}
                    </div>

                    {/* Quick Teacher Actions */}
                    <div className="flex items-center justify-end gap-3 pt-1 text-xs">
                      {p.unpaidTotalAmount > 0 && !p.isDelayed && (
                        <button
                          onClick={() => onOpenDelayModal(p.teacher)}
                          className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 underline cursor-pointer"
                        >
                          Delay Payment
                        </button>
                      )}
                      {p.unpaidTotalAmount > 0 && (
                        <button
                          onClick={() => onSettleTeacherCycle(p.teacher.id)}
                          className="text-zinc-900 dark:text-zinc-100 font-medium hover:underline cursor-pointer"
                        >
                          Settle All
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Standalone Calendar Events Sneak-Peek */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 uppercase">
                Upcoming Academic Events
              </h2>
              <button
                onClick={() => onOpenQuickAction("add-event")}
                className="text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 underline cursor-pointer"
              >
                + Add
              </button>
            </div>

            <div className="space-y-3">
              {events.slice(0, 3).map((ev) => {
                const sub = ev.subjectId ? subjectMap.get(ev.subjectId) : null;
                const borderTone =
                  ev.eventType === "EXAM" ? "border-zinc-900 dark:border-zinc-100" :
                    ev.eventType === "ASSIGNMENT_DUE" ? "border-amber-600 dark:border-amber-400" :
                      "border-zinc-400 dark:border-zinc-600";

                return (
                  <div key={ev.id} className={`p-3 bg-zinc-50 dark:bg-zinc-900/60 border-l-2 ${borderTone} flex items-start justify-between text-xs`}>
                    <div>
                      <span className="font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 text-[10px]">
                        {ev.eventType.replace("_", " ")} {sub ? `· ${sub.name}` : ""}
                      </span>
                      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mt-0.5">{ev.title}</div>
                      {ev.description && (
                        <div className="text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-1">{ev.description}</div>
                      )}
                    </div>
                    <span className=" text-zinc-500 dark:text-zinc-400 ml-4 shrink-0">
                      {new Date(ev.startAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
