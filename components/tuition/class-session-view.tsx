"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  Check,
  Clock,
  CreditCard,
  Plus,
  FileText,
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  ExternalLink,
  BookOpen,
  Trash2
} from "lucide-react";
import { ClassSession, Teacher, Subject, ClassStatus, PaymentStatus } from "@/types/tuition";
import { getTeacherSessionColor } from "@/lib/tuition-storage";

interface ClassSessionViewProps {
  session: ClassSession;
  teacher?: Teacher;
  subject?: Subject;
  onBack: () => void;
  onEditSession?: (session: ClassSession) => void;
  onDeleteSession?: (sessionId: string) => void;
  onToggleFreeClass?: (sessionId: string, isFree: boolean) => void;
  onUpdateStatus: (sessionId: string, newStatus: ClassStatus) => void;
  onMarkAsPaid: (sessionId: string) => void;
  onDeletePayment?: (sessionId: string) => void;
  onAddNote: (sessionId: string, content: string, isHomework: boolean) => void;
  onOpenDelayModal?: (teacher: Teacher) => void;
}

export default function ClassSessionView({
  session,
  teacher,
  subject,
  onBack,
  onEditSession,
  onDeleteSession,
  onToggleFreeClass,
  onUpdateStatus,
  onMarkAsPaid,
  onDeletePayment,
  onAddNote,
  onOpenDelayModal
}: ClassSessionViewProps) {
  const [newNote, setNewNote] = useState("");
  const [isHomeworkNote, setIsHomeworkNote] = useState(false);

  const formattedDate = new Date(session.scheduledAt).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedTime = new Date(session.scheduledAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const handleAddNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    onAddNote(session.id, newNote.trim(), isHomeworkNote);
    setNewNote("");
    setIsHomeworkNote(false);
  };

  const isCoveredByAdvance = session.paymentStatus === "COVERED_BY_ADVANCE";
  const isPaid = session.paymentStatus === "PAID" || isCoveredByAdvance;
  const isAbsent = session.attendance === "ABSENT" || session.status === "TEACHER_ABSENT";

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-10 text-zinc-900 dark:text-zinc-100 antialiased">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Sessions & Calendar
        </button>

        <div className="flex items-center gap-3">
          {onEditSession && (
            <button
              onClick={() => onEditSession(session)}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-zinc-700 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors cursor-pointer"
            >
              Edit Class Session
            </button>
          )}
          {onDeleteSession && (
            <button
              onClick={() => {
                if (confirm("Are you sure you want to permanently delete this class session?")) {
                  onDeleteSession(session.id);
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900/60 rounded transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Class
            </button>
          )}
          <span className="text-xs text-zinc-400 dark:text-zinc-500">ID: {session.id}</span>
        </div>
      </div>

      {/* Main Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-medium">
              Class Session
            </span>
            {session.isExtra && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                EXTRA CLASS
              </span>
            )}
            {isAbsent && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                TEACHER ABSENT
              </span>
            )}
            {(session.isFree || session.paymentStatus === "FREE") && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                FREE CLASS
              </span>
            )}
          </div>
          <h1 className={`text-3xl font-medium tracking-tight text-zinc-900 dark:text-zinc-50 mt-1 ${isAbsent ? 'line-through text-zinc-400 dark:text-zinc-500' : ''}`}>
            {subject?.name || "Tuition Session"}
          </h1>
          <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                style={{ backgroundColor: getTeacherSessionColor(teacher, session.isFree || session.paymentStatus === "FREE") }}
                title={session.isFree || session.paymentStatus === "FREE" ? "Free Class Color" : "Paid Class Color"}
              />
              Teacher: <strong className="text-zinc-900 dark:text-zinc-100 font-medium">{teacher?.name || "Assigned Teacher"}</strong>
            </span>
            {teacher?.phone && <span className="text-zinc-400 dark:text-zinc-600">· {teacher.phone}</span>}
            {teacher?.email && <span className="text-zinc-400 dark:text-zinc-600">· {teacher.email}</span>}
          </div>
        </div>

        {/* Financial Stat */}
        <div className="text-left md:text-right">
          <span className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-medium block">
            Session Fee
          </span>
          <div className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 mt-1">
            ৳{session.fee.toFixed(2)}
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Standard Daily Rate: ৳{(teacher?.dailyRate ?? teacher?.hourlyRate) || 500}/day
          </div>
        </div>
      </div>

      {/* Settlement Action Bar */}
      <div className="border border-zinc-200 dark:border-zinc-800 p-5 bg-zinc-50/75 dark:bg-zinc-900/60 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Payment Status
              </span>
              {isAbsent ? (
                <span className="text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 px-2 py-0.5 rounded">
                  Teacher Absent (No Fee / Waived)
                </span>
              ) : session.isFree || session.paymentStatus === "FREE" ? (
                <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 rounded flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Free / Trial Class (৳0.00)
                </span>
              ) : isPaid ? (
                <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/60 px-2 py-0.5 rounded flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  {isCoveredByAdvance ? "Covered by Prepaid Advance" : "Paid in Full"}
                </span>
              ) : (
                <span className="text-xs font-medium text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 px-2 py-0.5 rounded">
                  Unpaid (৳{session.fee.toFixed(2)} due)
                </span>
              )}
            </div>

            {/* Explanatory Policy Context */}
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
              {isAbsent ? (
                <>Teacher was absent for this class session. Fee is waived (৳0.00) and excluded from settlement calculations.</>
              ) : session.isFree || session.paymentStatus === "FREE" ? (
                <>Trial / complimentary session. No payment is required or expected.</>
              ) : teacher?.paymentPolicy?.type === "AFTER_N_CLASSES" ? (
                <>Policy: Pay after every {teacher.paymentPolicy.cycleSize} classes. You can settle right now or wait for the cycle batch.</>
              ) : teacher?.paymentPolicy?.type === "ADVANCE_CYCLE" ? (
                <>Policy: Prepaid cycle. Advance balance: ৳{teacher.paymentPolicy.advanceBalance.toFixed(2)}.</>
              ) : (
                <>Policy: Per-class settlement.</>
              )}
            </p>
          </div>

          {/* Free class toggle and pay buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onToggleFreeClass && !isAbsent && (
              session.isFree || session.paymentStatus === "FREE" ? (
                <button
                  onClick={() => onToggleFreeClass(session.id, false)}
                  className="px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                  title="Make this a standard payable class"
                >
                  Make Paid Class
                </button>
              ) : (
                <button
                  onClick={() => onToggleFreeClass(session.id, true)}
                  className="px-3 py-1.5 text-xs font-medium text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer"
                  title="Exclude this class from all payment liability and settlement cycles"
                >
                  Set as Free Class
                </button>
              )
            )}

            {isPaid && !isAbsent && !session.isFree && session.paymentStatus !== "FREE" && onDeletePayment && (
              <button
                type="button"
                onClick={() => {
                  if (confirm("Are you sure you want to delete payment for this class? It will revert to unpaid.")) {
                    onDeletePayment(session.id);
                  }
                }}
                className="px-3 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900/60 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                title="Delete payment and revert class to unpaid"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Payment
              </button>
            )}

            {!isPaid && !isAbsent && !session.isFree && session.paymentStatus !== "FREE" && (
              <>
                {teacher && onOpenDelayModal && (
                  <button
                    onClick={() => onOpenDelayModal(teacher)}
                    className="px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                  >
                    Delay Settlement
                  </button>
                )}
                <button
                  onClick={() => onMarkAsPaid(session.id)}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white transition-colors cursor-pointer"
                >
                  Mark as Paid
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Session State Switcher */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-b border-zinc-200 dark:border-zinc-800 py-6">
        <div>
          <span className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-medium block mb-2">
            Class Attendance Status
          </span>
          <div className="flex flex-wrap gap-2">
            {(["SCHEDULED", "COMPLETED", "TEACHER_ABSENT", "CANCELLED", "MISSED"] as const).map((st) => (
              <button
                key={st}
                onClick={() => onUpdateStatus(session.id, st)}
                className={`px-3 py-1 text-xs font-medium border transition-colors cursor-pointer ${session.status === st
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                    : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-600 bg-white dark:bg-zinc-900"
                  }`}
              >
                {st === "TEACHER_ABSENT" ? "Teacher Absent" : st.charAt(0) + st.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-medium block mb-1">
            Date & Scheduled Time
          </span>
          <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {formattedDate}
          </div>
          <div className="text-xs  text-zinc-500 dark:text-zinc-400 mt-0.5">
            {formattedTime}
          </div>
        </div>
      </div>

      {/* Class Notes & Homework */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 uppercase">
            Session Notes & Assignments
          </h2>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{session.notes?.length || 0} entries</span>
        </div>

        {/* Existing Notes */}
        <div className="space-y-3">
          {(!session.notes || session.notes.length === 0) ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 py-2">No notes logged for this session yet.</p>
          ) : (
            session.notes.map((note) => (
              <div
                key={note.id}
                className={`p-4 border ${note.isHomework
                    ? "border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/30"
                    : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                  }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[11px] font-medium uppercase tracking-wider ${note.isHomework ? "text-amber-800 dark:text-amber-300" : "text-zinc-500 dark:text-zinc-400"
                    }`}>
                    {note.isHomework ? "Homework Assignment" : "Lesson Recap"}
                  </span>
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500 ">{note.createdAt}</span>
                </div>
                <p className="text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">{note.content}</p>
              </div>
            ))
          )}
        </div>

        {/* Form to add note */}
        <form onSubmit={handleAddNoteSubmit} className="space-y-3 pt-2">
          <textarea
            rows={3}
            placeholder="Type notes on concepts covered, problems solved, or homework assigned..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="w-full text-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-3 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400 resize-none"
          />
          <div className="flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={isHomeworkNote}
                onChange={(e) => setIsHomeworkNote(e.target.checked)}
                className="rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-0"
              />
              Mark as Homework / Assignment
            </label>
            <button
              type="submit"
              disabled={!newNote.trim()}
              className="px-4 py-1.5 text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white disabled:opacity-30 transition-colors cursor-pointer"
            >
              Add Note
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
