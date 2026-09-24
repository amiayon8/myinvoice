"use client";

import React, { useState, useMemo } from "react";
import {
  Plus,
  User,
  BookOpen,
  Clock,
  CreditCard,
  Trash2,
  Edit3,
  AlertCircle,
  PauseCircle,
  DollarSign,
  Search,
  Phone,
  Mail,
  Calendar,
  CheckCircle2,
  ExternalLink
} from "lucide-react";
import { Teacher, Subject, ClassSession } from "@/types/tuition";
import { calculateTeacherFinance, TEACHER_PALETTE, getTeacherSessionColor } from "@/lib/tuition-storage";

interface TuitionTeachersProps {
  teachers: Teacher[];
  subjects: Subject[];
  sessions: ClassSession[];
  onOpenAddTeacher: () => void;
  onEditTeacher: (teacher: Teacher) => void;
  onDeleteTeacher: (teacherId: string) => void;
  onOpenAddSubject: () => void;
  onDeleteSubject: (subjectId: string) => void;
  onOpenDelayModal: (teacher: Teacher) => void;
  onSettleTeacher: (teacherId: string) => void;
}

export default function TuitionTeachers({
  teachers,
  subjects,
  sessions,
  onOpenAddTeacher,
  onEditTeacher,
  onDeleteTeacher,
  onOpenAddSubject,
  onDeleteSubject,
  onOpenDelayModal,
  onSettleTeacher,
}: TuitionTeachersProps) {
  const [activeTab, setActiveTab] = useState<"teachers" | "subjects">("teachers");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "DUE" | "PREPAID" | "DELAYED">("ALL");

  const subjectMap = useMemo(() => new Map(subjects.map(s => [s.id, s])), [subjects]);

  // Financial profiles for all teachers
  const teacherFinances = useMemo(() => {
    const map = new Map<string, ReturnType<typeof calculateTeacherFinance>>();
    teachers.forEach(t => {
      map.set(t.id, calculateTeacherFinance(t, sessions));
    });
    return map;
  }, [teachers, sessions]);

  // Aggregate stats
  const totalDue = useMemo(() => {
    return Array.from(teacherFinances.values()).reduce((sum, f) => sum + f.unpaidTotalAmount, 0);
  }, [teacherFinances]);

  const totalPrepaid = useMemo(() => {
    return Array.from(teacherFinances.values()).reduce((sum, f) => sum + f.advanceBalance, 0);
  }, [teacherFinances]);

  const teachersWithDue = useMemo(() => {
    return Array.from(teacherFinances.values()).filter(f => f.unpaidTotalAmount > 0).length;
  }, [teacherFinances]);

  // Filtered teachers list
  const filteredTeachers = useMemo(() => {
    return teachers.filter(teacher => {
      const finance = teacherFinances.get(teacher.id);

      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = teacher.name.toLowerCase().includes(q);
        const matchesPhone = teacher.phone?.toLowerCase().includes(q);
        const matchesSubject = teacher.subjectIds.some(sId =>
          subjectMap.get(sId)?.name.toLowerCase().includes(q)
        );
        if (!matchesName && !matchesPhone && !matchesSubject) return false;
      }

      // Status filter match
      if (statusFilter === "DUE" && (!finance || finance.unpaidTotalAmount <= 0)) return false;
      if (statusFilter === "PREPAID" && (!finance || finance.advanceBalance <= 0)) return false;
      if (statusFilter === "DELAYED" && (!finance || !finance.isDelayed)) return false;

      return true;
    });
  }, [teachers, searchQuery, statusFilter, teacherFinances, subjectMap]);

  return (
    <div className="space-y-6 text-zinc-900 dark:text-zinc-100 antialiased">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-xl font-medium tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <User className="w-5 h-5 text-zinc-500" />
            {activeTab === "teachers" ? "Teacher Management" : "Academic Subjects"}
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {activeTab === "teachers"
              ? "Manage private tutors, daily session rates, assigned subjects, and settlement cycles"
              : "Manage academic curriculum and subject tracking"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "teachers" ? (
            <button
              onClick={onOpenAddTeacher}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Teacher
            </button>
          ) : (
            <button
              onClick={onOpenAddSubject}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Subject
            </button>
          )}
        </div>
      </div>

      {/* Segmented Subnav */}
      <div className="flex gap-4 border-b border-zinc-200 dark:border-zinc-800 text-xs font-medium">
        <button
          onClick={() => setActiveTab("teachers")}
          className={`pb-2.5 transition-colors border-b-2 cursor-pointer ${activeTab === "teachers"
              ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100 font-semibold"
              : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
        >
          Teachers ({teachers.length})
        </button>
        <button
          onClick={() => setActiveTab("subjects")}
          className={`pb-2.5 transition-colors border-b-2 cursor-pointer ${activeTab === "subjects"
              ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100 font-semibold"
              : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
        >
          Subjects ({subjects.length})
        </button>
      </div>

      {/* TEACHERS TAB */}
      {activeTab === "teachers" && (
        <div className="space-y-4">
          {/* Quick Metrics & Search Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
              <span className="text-[10px] uppercase font-semibold tracking-wider text-zinc-500 dark:text-zinc-400 block">
                Total Teachers
              </span>
              <span className=" text-xl font-semibold text-zinc-900 dark:text-zinc-100 mt-1 block">
                {teachers.length}
              </span>
            </div>

            <div className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
              <span className="text-[10px] uppercase font-semibold tracking-wider text-zinc-500 dark:text-zinc-400 block">
                Pending Tuition Due
              </span>
              <span className=" text-xl font-semibold text-rose-600 dark:text-rose-400 mt-1 block">
                ৳{totalDue.toFixed(2)}
              </span>
            </div>

            <div className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
              <span className="text-[10px] uppercase font-semibold tracking-wider text-zinc-500 dark:text-zinc-400 block">
                Prepaid Advance Credit
              </span>
              <span className=" text-xl font-semibold text-emerald-600 dark:text-emerald-400 mt-1 block">
                ৳{totalPrepaid.toFixed(2)}
              </span>
            </div>

            <div className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
              <span className="text-[10px] uppercase font-semibold tracking-wider text-zinc-500 dark:text-zinc-400 block">
                Teachers with Balance
              </span>
              <span className=" text-xl font-semibold text-zinc-900 dark:text-zinc-100 mt-1 block">
                {teachersWithDue} / {teachers.length}
              </span>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Search teacher by name, phone, or subject..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400 text-xs"
              />
            </div>

            {/* Status Filter Buttons */}
            <div className="flex items-center gap-1 flex-wrap">
              <button
                onClick={() => setStatusFilter("ALL")}
                className={`px-2.5 py-1 text-xs border transition-colors cursor-pointer ${statusFilter === "ALL"
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 font-semibold"
                    : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  }`}
              >
                All ({teachers.length})
              </button>
              <button
                onClick={() => setStatusFilter("DUE")}
                className={`px-2.5 py-1 text-xs border transition-colors cursor-pointer ${statusFilter === "DUE"
                    ? "border-rose-700 bg-rose-600 text-white font-semibold"
                    : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  }`}
              >
                Balance Due
              </button>
              <button
                onClick={() => setStatusFilter("PREPAID")}
                className={`px-2.5 py-1 text-xs border transition-colors cursor-pointer ${statusFilter === "PREPAID"
                    ? "border-emerald-700 bg-emerald-600 text-white font-semibold"
                    : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  }`}
              >
                Prepaid
              </button>
              <button
                onClick={() => setStatusFilter("DELAYED")}
                className={`px-2.5 py-1 text-xs border transition-colors cursor-pointer ${statusFilter === "DELAYED"
                    ? "border-amber-700 bg-amber-600 text-white font-semibold"
                    : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  }`}
              >
                Deferred
              </button>
            </div>
          </div>

          {/* Teacher Cards Grid / List */}
          <div className="space-y-3">
            {filteredTeachers.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500 text-xs">
                <User className="w-6 h-6 mx-auto mb-2 text-zinc-400" />
                <p>No teachers found matching your criteria.</p>
                <button
                  onClick={onOpenAddTeacher}
                  className="mt-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100 underline hover:no-underline cursor-pointer"
                >
                  + Add New Teacher
                </button>
              </div>
            ) : (
              filteredTeachers.map((teacher) => {
                const finance = teacherFinances.get(teacher.id)!;
                const assignedSubjects = teacher.subjectIds
                  .map(id => subjectMap.get(id))
                  .filter(Boolean) as Subject[];
                const rate = teacher.dailyRate ?? teacher.hourlyRate ?? 500;
                const teacherColor = getTeacherSessionColor(teacher, false);
                const freeColor = getTeacherSessionColor(teacher, true);

                return (
                  <div
                    key={teacher.id}
                    className="p-4 sm:p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative"
                    style={{ borderLeftColor: teacherColor, borderLeftWidth: "4px" }}
                  >
                    {/* Left: Avatar, Name, Rate, Subjects, Contact */}
                    <div className="space-y-2 max-w-xl">
                      {/* Name & Rate Header */}
                      <div className="flex items-center gap-3 flex-wrap">
                        {/* Dual Color Avatar Swatch */}
                        <div className="flex items-center -space-x-1.5 shrink-0">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold z-10 shadow-2xs border-2 border-white dark:border-zinc-900"
                            style={{ backgroundColor: teacherColor }}
                            title={`Paid Class Color: ${teacherColor}`}
                          >
                            {teacher.name.charAt(0).toUpperCase()}
                          </div>
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-zinc-900 text-[10px] font-bold shadow-2xs border-2 border-white dark:border-zinc-900"
                            style={{ backgroundColor: freeColor }}
                            title={`Free Class Color: ${freeColor}`}
                          >
                            F
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-base text-zinc-900 dark:text-zinc-50">
                              {teacher.name}
                            </span>
                            <span className=" text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                              ৳{rate}/day
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/80 px-2 py-0.5 border border-zinc-200 dark:border-zinc-700">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: teacherColor }} title={`Paid Color: ${teacherColor}`} />
                              <span>Paid</span>
                              <span className="text-zinc-300 dark:text-zinc-600">/</span>
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: freeColor }} title={`Free Color: ${freeColor}`} />
                              <span>Free</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Subjects & Contact */}
                      <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                        {assignedSubjects.map(sub => (
                          <span
                            key={sub.id}
                            className="inline-flex items-center gap-1 text-[11px] bg-zinc-50 dark:bg-zinc-800 px-2 py-0.5 border border-zinc-200 dark:border-zinc-700"
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: sub.color || "#888" }}
                            />
                            {sub.name}
                          </span>
                        ))}
                        {assignedSubjects.length === 0 && (
                          <span className="text-[11px] text-zinc-400 italic">No subject assigned</span>
                        )}

                        {teacher.phone && (
                          <a
                            href={`tel:${teacher.phone}`}
                            className="inline-flex items-center gap-1 text-[11px]  text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 ml-1"
                            title="Call / WhatsApp"
                          >
                            <Phone className="w-3 h-3 text-zinc-400" />
                            {teacher.phone}
                          </a>
                        )}

                        {teacher.email && (
                          <a
                            href={`mailto:${teacher.email}`}
                            className="inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 ml-1"
                            title="Send email"
                          >
                            <Mail className="w-3 h-3 text-zinc-400" />
                            {teacher.email}
                          </a>
                        )}
                      </div>

                      {/* Payment Rule Description */}
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Rule: <strong>{finance.policyDescription}</strong></span>
                      </div>

                      {/* Deferred / Delay Banner if active */}
                      {finance.isDelayed && (
                        <div className="text-xs text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 px-2.5 py-1 flex items-center gap-2">
                          <PauseCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>
                            Settlement deferred until <strong>{finance.delayedUntil}</strong>. {finance.delayReason}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Right: Balance Card & Action Buttons */}
                    <div className="flex flex-col sm:flex-row lg:flex-col sm:items-center lg:items-end justify-between gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-zinc-100 dark:border-zinc-800">
                      {/* Financial Status Summary */}
                      <div className="text-left sm:text-right lg:text-right">
                        {finance.unpaidTotalAmount > 0 ? (
                          <div>
                            <div className=" text-lg font-bold text-rose-600 dark:text-rose-400">
                              ৳{finance.unpaidTotalAmount.toFixed(2)} due
                            </div>
                            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                              {finance.unpaidCompletedSessions.length} {finance.unpaidCompletedSessions.length === 1 ? "class" : "classes"} pending
                            </span>
                          </div>
                        ) : finance.advanceBalance > 0 ? (
                          <div>
                            <div className=" text-lg font-bold text-emerald-600 dark:text-emerald-400">
                              +৳{finance.advanceBalance.toFixed(2)}
                            </div>
                            <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
                              Prepaid credit available
                            </span>
                          </div>
                        ) : (
                          <div>
                            <div className=" text-base font-semibold text-zinc-500 dark:text-zinc-400">
                              ৳0.00
                            </div>
                            <span className="text-[11px] text-zinc-400">Clean balance</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {finance.unpaidTotalAmount > 0 && (
                          <button
                            onClick={() => onSettleTeacher(teacher.id)}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white transition-colors cursor-pointer shadow-xs"
                          >
                            Settle Now
                          </button>
                        )}

                        <button
                          onClick={() => onOpenDelayModal(teacher)}
                          className="px-2.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
                        >
                          {finance.isDelayed ? "Edit Delay" : "Delay"}
                        </button>

                        <button
                          onClick={() => onEditTeacher(teacher)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
                          title="Edit teacher profile"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Edit
                        </button>

                        <button
                          onClick={() => onDeleteTeacher(teacher.id)}
                          className="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                          title="Delete teacher"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* SUBJECTS TAB */}
      {activeTab === "subjects" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs text-zinc-500">
              Registered academic subjects and curricula: <strong>{subjects.length} subjects</strong>
            </span>
          </div>

          <div className="divide-y divide-zinc-200 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            {subjects.map((sub) => {
              const subjectSessions = sessions.filter(s => s.subjectId === sub.id);
              const teachersTaught = teachers.filter(t => t.subjectIds.includes(sub.id));

              return (
                <div key={sub.id} className="p-4 flex items-center justify-between hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: sub.color || "#64748b" }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{sub.name}</span>
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Taught by: {teachersTaught.map(t => t.name).join(", ") || "No teacher assigned"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <span className=" text-zinc-600 dark:text-zinc-300">
                      {subjectSessions.length} classes logged
                    </span>
                    <button
                      onClick={() => onDeleteSubject(sub.id)}
                      className="p-1.5 text-zinc-400 dark:text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                      title="Delete subject"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
