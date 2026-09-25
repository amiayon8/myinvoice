"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Sparkles,
  BookOpen,
  Filter,
  Eye,
  Pencil,
  Trash2,
  UserX,
  UserCheck,
  CalendarDays,
  List,
  Share2,
  Clock3,
} from "lucide-react";
import {
  ClassSession,
  CalendarEvent,
  Teacher,
  Subject,
  RecurringSchedule,
} from "@/types/tuition";
import { TEACHER_PALETTE, getTeacherSessionColor } from "@/lib/tuition-storage";

interface TuitionCalendarProps {
  sessions: ClassSession[];
  events: CalendarEvent[];
  teachers: Teacher[];
  subjects: Subject[];
  schedules: RecurringSchedule[];
  onSelectSession: (sessionId: string) => void;
  onEditSession?: (session: ClassSession) => void;
  onDeleteSession?: (sessionId: string) => void;
  onToggleAttendance?: (
    sessionId: string,
    newAttendance: "PRESENT" | "ABSENT",
  ) => void;
  onToggleFreeClass?: (sessionId: string, isFree: boolean) => void;
  onDeleteClassPayment?: (sessionId: string) => void;
  onOpenScheduleModal: (targetDate?: string) => void;
  onOpenEventModal: () => void;
  onGenerateRecurringSessions: () => void;
  onOpenShareModal?: () => void;
  onApproveSession?: (sessionId: string) => void;
  onRejectSession?: (sessionId: string) => void;
}

// Helper to get fallback teacher color if missing
function getTeacherColor(teacher: Teacher | undefined, index = 0): string {
  return getTeacherSessionColor(teacher, false, index);
}

// Format Date to YYYY-MM-DD local string
function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function TuitionCalendar({
  sessions,
  events,
  teachers,
  subjects,
  schedules,
  onSelectSession,
  onEditSession,
  onDeleteSession,
  onDeleteClassPayment,
  onToggleAttendance,
  onToggleFreeClass,
  onOpenScheduleModal,
  onOpenEventModal,
  onGenerateRecurringSessions,
  onOpenShareModal,
  onApproveSession,
  onRejectSession,
}: TuitionCalendarProps) {
  // Calendar navigation state
  const [viewDate, setViewDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<"month" | "agenda">("month");

  // Filter state
  const [selectedSubjectFilter, setSelectedSubjectFilter] =
    useState<string>("ALL");
  const [selectedTeacherFilter, setSelectedTeacherFilter] =
    useState<string>("ALL");

  // Selected date for day inspector
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() =>
    toDateKey(new Date()),
  );

  // Lookup maps
  const teacherMap = useMemo(
    () => new Map(teachers.map((t) => [t.id, t])),
    [teachers],
  );
  const subjectMap = useMemo(
    () => new Map(subjects.map((s) => [s.id, s])),
    [subjects],
  );

  // Filtered lists
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (
        selectedSubjectFilter !== "ALL" &&
        s.subjectId !== selectedSubjectFilter
      )
        return false;
      if (
        selectedTeacherFilter !== "ALL" &&
        s.teacherId !== selectedTeacherFilter
      )
        return false;
      return true;
    });
  }, [sessions, selectedSubjectFilter, selectedTeacherFilter]);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (
        selectedSubjectFilter !== "ALL" &&
        e.subjectId &&
        e.subjectId !== selectedSubjectFilter
      )
        return false;
      return true;
    });
  }, [events, selectedSubjectFilter]);

  // Map of sessions grouped by "YYYY-MM-DD"
  const sessionsByDate = useMemo(() => {
    const map: Record<string, ClassSession[]> = {};
    filteredSessions.forEach((s) => {
      const key = s.scheduledAt.split("T")[0];
      if (!map[key]) map[key] = [];
      map[key].push(s);
    });
    return map;
  }, [filteredSessions]);

  // Map of events grouped by "YYYY-MM-DD"
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    filteredEvents.forEach((e) => {
      const key = e.startAt.split("T")[0];
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return map;
  }, [filteredEvents]);

  // Monthly stats per teacher for the legend
  const currentMonthYear = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, "0")}`;
  const teacherMonthlyCount = useMemo(() => {
    const counts: Record<string, number> = {};
    teachers.forEach((t) => {
      counts[t.id] = 0;
    });
    sessions.forEach((s) => {
      if (s.scheduledAt.startsWith(currentMonthYear)) {
        counts[s.teacherId] = (counts[s.teacherId] || 0) + 1;
      }
    });
    return counts;
  }, [sessions, teachers, currentMonthYear]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleToday = () => {
    const now = new Date();
    setViewDate(now);
    setSelectedDateKey(toDateKey(now));
  };

  // Generate Month Grid Days
  const calendarGrid = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday
    const daysInMonth = lastDay.getDate();

    const daysInPrevMonth = new Date(year, month, 0).getDate();

    interface GridCell {
      date: Date;
      dateKey: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }

    const cells: GridCell[] = [];
    const todayStr = toDateKey(new Date());

    // 1. Trailing days from previous month
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const d = new Date(year, month - 1, dayNum);
      const key = toDateKey(d);
      cells.push({
        date: d,
        dateKey: key,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: key === todayStr,
      });
    }

    // 2. Days of current month
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const d = new Date(year, month, dayNum);
      const key = toDateKey(d);
      cells.push({
        date: d,
        dateKey: key,
        dayNumber: dayNum,
        isCurrentMonth: true,
        isToday: key === todayStr,
      });
    }

    // 3. Leading days for next month (fill to multiple of 7, up to 35 or 42 cells)
    const totalSlots = cells.length <= 35 ? 35 : 42;
    const remainingSlots = totalSlots - cells.length;
    for (let dayNum = 1; dayNum <= remainingSlots; dayNum++) {
      const d = new Date(year, month + 1, dayNum);
      const key = toDateKey(d);
      cells.push({
        date: d,
        dateKey: key,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: key === todayStr,
      });
    }

    return cells;
  }, [viewDate]);

  // Selected date details
  const selectedDateObj = useMemo(() => {
    const [y, m, d] = selectedDateKey.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [selectedDateKey]);

  const selectedDateSessions = sessionsByDate[selectedDateKey] || [];
  const selectedDateEvents = eventsByDate[selectedDateKey] || [];

  // Unified items for agenda view
  type CalendarItem =
    | { type: "SESSION"; date: Date; data: ClassSession }
    | { type: "EVENT"; date: Date; data: CalendarEvent };

  const unifiedAgendaItems: CalendarItem[] = useMemo(() => {
    return [
      ...filteredSessions.map((s) => ({
        type: "SESSION" as const,
        date: new Date(s.scheduledAt),
        data: s,
      })),
      ...filteredEvents.map((e) => ({
        type: "EVENT" as const,
        date: new Date(e.startAt),
        data: e,
      })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [filteredSessions, filteredEvents]);

  const agendaGroupedByDate = useMemo(() => {
    const grouped: Record<string, CalendarItem[]> = {};
    unifiedAgendaItems.forEach((item) => {
      const key = toDateKey(item.date);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });
    return grouped;
  }, [unifiedAgendaItems]);

  const agendaDateKeys = Object.keys(agendaGroupedByDate).sort();

  // Compute subjects filtered strictly by the selected teacher
  const availableSubjects = useMemo(() => {
    if (selectedTeacherFilter === "ALL") return subjects;
    const teacher = teacherMap.get(selectedTeacherFilter);
    if (!teacher || !teacher.subjectIds || teacher.subjectIds.length === 0)
      return subjects;
    return subjects.filter((s) => teacher.subjectIds.includes(s.id));
  }, [subjects, teacherMap, selectedTeacherFilter]);

  // Keep selectedSubjectFilter valid
  useEffect(() => {
    if (
      selectedSubjectFilter !== "ALL" &&
      !availableSubjects.some((s) => s.id === selectedSubjectFilter)
    ) {
      setSelectedSubjectFilter("ALL");
    }
  }, [availableSubjects, selectedSubjectFilter]);

  return (
    <div className="space-y-6 text-zinc-900 dark:text-zinc-100 antialiased">
      {/* Calendar Top Bar & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-xl font-medium tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
            Calendar & Tuition Schedule
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Dates show interactive donut rings color-coded by assigned teacher
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onGenerateRecurringSessions}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-900 dark:text-zinc-100 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors border border-zinc-200 dark:border-zinc-700 cursor-pointer"
            title="Auto-generates sessions for the next 14 days from active weekly routines"
          >
            <Sparkles className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
            Generate Next 2 Weeks
          </button>

          <button
            onClick={() => onOpenScheduleModal(selectedDateKey)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Schedule Class
          </button>

          <button
            onClick={onOpenEventModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Event
          </button>

          {onOpenShareModal && (
            <button
              onClick={onOpenShareModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share Calendar
            </button>
          )}
        </div>
      </div>

      {sessions.some((s) => s.approvalStatus === "PENDING") && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 px-4 py-3 rounded-lg flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <p className="text-xs font-medium text-amber-900 dark:text-amber-200">
              <strong>
                {sessions.filter((s) => s.approvalStatus === "PENDING").length} class session(s)
              </strong>{" "}
              recorded by teachers require admin review and approval.
            </p>
          </div>
        </div>
      )}

      {/* TEACHER COLOR LEGEND: Which color for whom */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800/80">
          {selectedTeacherFilter !== "ALL" && (
            <button
              onClick={() => setSelectedTeacherFilter("ALL")}
              className="text-[11px] text-zinc-500 mb-6 hover:text-zinc-900 dark:hover:text-zinc-100 underline cursor-pointer"
            >
              Reset Filter (Show All Teachers)
            </button>
          )}
        </div>

        {/* Legend Grid of Teachers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5">
          {teachers.map((teacher, index) => {
            const paidColor = getTeacherSessionColor(teacher, false, index);
            const freeColor = getTeacherSessionColor(teacher, true, index);
            const isSelected = selectedTeacherFilter === teacher.id;
            const countThisMonth = teacherMonthlyCount[teacher.id] || 0;
            const primarySubject = subjects.find((s) =>
              teacher.subjectIds?.includes(s.id),
            );

            return (
              <button
                key={teacher.id}
                type="button"
                onClick={() =>
                  setSelectedTeacherFilter(isSelected ? "ALL" : teacher.id)
                }
                className={`flex items-center gap-2.5 p-2 text-left transition-all border cursor-pointer ${
                  isSelected
                    ? "border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-800/80 shadow-2xs"
                    : selectedTeacherFilter !== "ALL"
                      ? "opacity-40 border-zinc-200 dark:border-zinc-800 hover:opacity-100 bg-white dark:bg-zinc-900"
                      : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50"
                }`}
                title={`Filter by ${teacher.name} (Paid: ${paidColor}, Free: ${freeColor})`}
              >
                {/* Visual Dual Swatches (Paid + Free) */}
                <div className="flex items-center -space-x-1 shrink-0">
                  <div
                    className="w-4 h-4 rounded-full border border-white dark:border-zinc-900 shadow-2xs z-10"
                    style={{ backgroundColor: paidColor }}
                    title={`Paid Class Color: ${paidColor}`}
                  />
                  <div
                    className="w-3.5 h-3.5 rounded-full border border-white dark:border-zinc-900 shadow-2xs"
                    style={{ backgroundColor: freeColor }}
                    title={`Free Class Color: ${freeColor}`}
                  />
                </div>

                {/* Teacher Info */}
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">
                    {teacher.name}
                  </div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                    {primarySubject?.name || "Subject tutor"}
                  </div>
                </div>

                {/* Class count pill */}
                <span
                  className=" text-[10px] px-1.5 py-0.5 rounded-full text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 shrink-0"
                  title={`${countThisMonth} classes in ${viewDate.toLocaleDateString("en-US", { month: "short" })}`}
                >
                  {countThisMonth}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter and View Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-zinc-500 dark:text-zinc-400 font-medium">
              Subject:
            </span>
            <select
              value={selectedSubjectFilter}
              onChange={(e) => setSelectedSubjectFilter(e.target.value)}
              className="border border-zinc-300 dark:border-zinc-700 px-2.5 py-1 text-xs bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
            >
              <option value="ALL">
                All Subjects{" "}
                {selectedTeacherFilter !== "ALL"
                  ? `(${teacherMap.get(selectedTeacherFilter)?.name})`
                  : ""}
              </option>
              {availableSubjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>

          {selectedTeacherFilter !== "ALL" && (
            <span className="inline-flex items-center gap-1 text-[11px]  text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 border border-zinc-200 dark:border-zinc-700">
              Filtered: {teacherMap.get(selectedTeacherFilter)?.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 border border-zinc-300 dark:border-zinc-700 p-0.5 bg-zinc-50 dark:bg-zinc-900">
          <button
            onClick={() => setViewMode("month")}
            className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
              viewMode === "month"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            Month Calendar (Donuts)
          </button>
          <button
            onClick={() => setViewMode("agenda")}
            className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
              viewMode === "agenda"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            <List className="w-3.5 h-3.5" />
            Agenda View
          </button>
        </div>
      </div>

      {/* MONTH DONUT CALENDAR VIEW */}
      {viewMode === "month" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main 7-Column Calendar Grid (8 cols on lg) */}
          <div className="lg:col-span-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
            {/* Month Navigation Header */}
            <div className="p-4 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <span className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  {viewDate.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <button
                  onClick={handleToday}
                  className="px-2 py-0.5 text-[11px]  font-medium text-zinc-600 dark:text-zinc-300 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
                >
                  TODAY
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Day of Week Headers */}
            <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 text-center py-2">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            {/* Calendar Cells Grid */}
            <div className="grid grid-cols-7 divide-x divide-y divide-zinc-200 dark:divide-zinc-800 border-b border-zinc-200 dark:border-zinc-800">
              {calendarGrid.map((cell) => {
                const daySessions = sessionsByDate[cell.dateKey] || [];
                const dayEvents = eventsByDate[cell.dateKey] || [];
                const isSelected = selectedDateKey === cell.dateKey;
                const hasSessions = daySessions.length > 0;
                const hasEvents = dayEvents.length > 0;

                return (
                  <div
                    key={cell.dateKey}
                    onClick={() => setSelectedDateKey(cell.dateKey)}
                    className={`min-h-[96px] sm:min-h-[105px] p-1.5 flex flex-col justify-between transition-colors cursor-pointer select-none relative ${
                      cell.isCurrentMonth
                        ? "bg-white dark:bg-zinc-900"
                        : "bg-zinc-50/60 dark:bg-zinc-950/40 text-zinc-400 dark:text-zinc-600"
                    } ${
                      isSelected
                        ? "bg-zinc-100/70 dark:bg-zinc-800/60 ring-2 ring-zinc-900 dark:ring-zinc-100 ring-inset z-10"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                    }`}
                  >
                    {/* Top: Donut Ring with Day Number */}
                    <div className="flex items-start justify-between">
                      <div className="relative">
                        <DateDonutRing
                          dayNum={cell.dayNumber}
                          sessions={daySessions}
                          teacherMap={teacherMap}
                          isToday={cell.isToday}
                          isSelected={isSelected}
                          isCurrentMonth={cell.isCurrentMonth}
                          activeTeacherId={selectedTeacherFilter}
                        />
                      </div>

                      {/* Event indicator badge if any */}
                      {hasEvents && (
                        <div
                          className="w-2 h-2 rounded-full bg-amber-500 mt-1 mr-1"
                          title={`${dayEvents.length} event(s)`}
                        />
                      )}
                    </div>

                    {/* Bottom: Mini previews of classes on this date */}
                    <div className="mt-1 space-y-1 overflow-hidden">
                      {hasSessions && (
                        <div className="space-y-0.5">
                          {daySessions.slice(0, 2).map((s) => {
                            const teacher = teacherMap.get(s.teacherId);
                            const subject = subjectMap.get(s.subjectId);
                            const isFree =
                              s.isFree || s.paymentStatus === "FREE";
                            const color = getTeacherSessionColor(
                              teacher,
                              isFree,
                            );
                            const isDimmed =
                              selectedTeacherFilter !== "ALL" &&
                              selectedTeacherFilter !== s.teacherId;

                            return (
                              <div
                                key={s.id}
                                className={`flex items-center gap-1 text-[10px] truncate leading-tight ${
                                  isDimmed
                                    ? "opacity-30"
                                    : "text-zinc-700 dark:text-zinc-300"
                                }`}
                                title={`${subject?.name || "Class"} (${isFree ? "Free" : "Paid"}) with ${teacher?.name}`}
                              >
                                <span
                                  className="w-1.5 h-1.5 rounded-full shrink-0"
                                  style={{ backgroundColor: color }}
                                />
                                <span className="truncate ">
                                  {subject?.name?.split(" ")[0] || "Class"}{" "}
                                  {isFree ? "(Free)" : ""}
                                </span>
                              </div>
                            );
                          })}
                          {daySessions.length > 2 && (
                            <div className="text-[9px]  text-zinc-400 dark:text-zinc-500 pl-2.5">
                              +{daySessions.length - 2} more
                            </div>
                          )}
                        </div>
                      )}

                      {/* Event tag preview */}
                      {!hasSessions && hasEvents && (
                        <div className="text-[10px] text-amber-700 dark:text-amber-400 font-medium truncate">
                          {dayEvents[0].title}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Active Routine Reference Footer */}
            <div className="p-3 bg-zinc-50 dark:bg-zinc-900 text-xs flex flex-wrap items-center justify-between gap-2">
              <span className="text-zinc-500 dark:text-zinc-400">
                Active Weekly Routines:{" "}
                <strong>
                  {schedules.filter((s) => s.isActive).length} scheduled
                </strong>
              </span>
            </div>
          </div>

          {/* Selected Date Inspector Panel (4 cols on lg) */}
          <div className="lg:col-span-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 space-y-4 shadow-2xs self-start">
            <div className="pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Selected Date Details
                </span>
                <div className="flex items-center gap-1.5">
                  {toDateKey(new Date()) === selectedDateKey && (
                    <span className="text-[10px] bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium px-1.5 py-0.2">
                      TODAY
                    </span>
                  )}
                  <button
                    onClick={() => onOpenScheduleModal(selectedDateKey)}
                    className="px-2 py-0.5 text-[11px] font-medium text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white rounded transition-colors cursor-pointer inline-flex items-center gap-0.5"
                    title="Schedule or log a completed class on this date"
                  >
                    <Plus className="w-3 h-3" />
                    Add Class
                  </button>
                </div>
              </div>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 mt-1">
                {selectedDateObj.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {selectedDateSessions.length}{" "}
                {selectedDateSessions.length === 1 ? "class" : "classes"} ·{" "}
                {selectedDateEvents.length}{" "}
                {selectedDateEvents.length === 1 ? "event" : "events"}
              </p>
            </div>

            {/* List of Sessions for Selected Date */}
            <div className="space-y-3">
              {selectedDateSessions.length === 0 &&
              selectedDateEvents.length === 0 ? (
                <div className="py-8 text-center border border-dashed border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400">
                  <p>No classes or events scheduled on this date.</p>
                  <button
                    onClick={() => onOpenScheduleModal(selectedDateKey)}
                    className="mt-2 text-xs font-medium text-zinc-900 dark:text-zinc-100 underline hover:no-underline cursor-pointer"
                  >
                    + Schedule Class
                  </button>
                </div>
              ) : (
                <>
                  {/* Sessions */}
                  {selectedDateSessions.map((session) => {
                    const teacher = teacherMap.get(session.teacherId);
                    const subject = subjectMap.get(session.subjectId);
                    const isFree =
                      session.isFree || session.paymentStatus === "FREE";
                    const color = getTeacherSessionColor(teacher, isFree);
                    const isPaid =
                      session.paymentStatus === "PAID" ||
                      session.paymentStatus === "COVERED_BY_ADVANCE";

                    return (
                      <div
                        key={session.id}
                        className="p-3 border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 space-y-2 relative"
                        style={{
                          borderLeftColor: color,
                          borderLeftWidth: "4px",
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-medium text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 flex-wrap">
                              <span>{subject?.name}</span>
                              {session.isExtra && (
                                <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/60 px-1.5 py-0.2 rounded">
                                  EXTRA
                                </span>
                              )}
                              {(session.status === "TEACHER_ABSENT" ||
                                session.attendance === "ABSENT") && (
                                <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 px-1.5 py-0.2 rounded">
                                  TEACHER ABSENT
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5 mt-0.5">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: color }}
                              />
                              <span>{teacher?.name}</span>
                            </div>
                          </div>
                          {session.isFree ||
                          session.paymentStatus === "FREE" ? (
                            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-1.5 py-0.5 rounded">
                              FREE
                            </span>
                          ) : session.status === "TEACHER_ABSENT" ||
                            session.attendance === "ABSENT" ? (
                            <span className=" text-sm font-semibold text-zinc-400 line-through">
                              ৳{session.fee.toFixed(2)}
                            </span>
                          ) : (
                            <span className=" text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                              ৳{session.fee.toFixed(2)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
                          <span className=" text-zinc-500 dark:text-zinc-400">
                            {new Date(session.scheduledAt).toLocaleTimeString(
                              "en-US",
                              { hour: "numeric", minute: "2-digit" },
                            )}
                          </span>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            {session.approvalStatus === "PENDING" ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-medium text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 px-1.5 py-0.5 rounded flex items-center gap-1">
                                  <Clock3 className="w-2.5 h-2.5" />
                                  Pending Approval
                                </span>
                                {onApproveSession && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onApproveSession(session.id);
                                    }}
                                    className="text-[10px] font-medium text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded cursor-pointer"
                                  >
                                    Approve
                                  </button>
                                )}
                                {onRejectSession && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onRejectSession(session.id);
                                    }}
                                    className="text-[10px] font-medium text-rose-800 dark:text-rose-300 px-1.5 py-0.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded cursor-pointer"
                                  >
                                    Reject
                                  </button>
                                )}
                              </div>
                            ) : session.status === "TEACHER_ABSENT" ||
                            session.attendance === "ABSENT" ? (
                              <span className="text-[10px] font-medium text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 px-1 py-0.5 rounded">
                                Absent
                              </span>
                            ) : session.isFree ||
                              session.paymentStatus === "FREE" ? (
                              <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-1 py-0.5 rounded">
                                Free Class
                              </span>
                            ) : isPaid ? (
                              <span className="text-[11px]  text-zinc-500 dark:text-zinc-400">
                                {session.paymentStatus === "COVERED_BY_ADVANCE"
                                  ? "prepaid"
                                  : "paid"}
                              </span>
                            ) : session.status === "COMPLETED" ? (
                              <span className="text-[10px]  font-medium text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 px-1 py-0.5 rounded">
                                Unpaid
                              </span>
                            ) : (
                              <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                                {session.status.toLowerCase()}
                              </span>
                            )}

                            {onToggleFreeClass &&
                              session.attendance !== "ABSENT" &&
                              session.status !== "TEACHER_ABSENT" &&
                              (session.isFree ||
                              session.paymentStatus === "FREE" ? (
                                <button
                                  onClick={() =>
                                    onToggleFreeClass(session.id, false)
                                  }
                                  className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300 hover:text-emerald-950 dark:hover:text-emerald-100 px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 transition-colors cursor-pointer"
                                  title="Make this a standard payable class"
                                >
                                  Make Paid
                                </button>
                              ) : (
                                <button
                                  onClick={() =>
                                    onToggleFreeClass(session.id, true)
                                  }
                                  className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 px-1.5 py-0.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
                                  title="Set as free class (won't be counted for payment)"
                                >
                                  Make Free
                                </button>
                              ))}

                            {onDeleteClassPayment &&
                              session.attendance !== "ABSENT" &&
                              session.status !== "TEACHER_ABSENT" &&
                              !session.isFree &&
                              session.paymentStatus !== "FREE" &&
                              (session.paymentStatus === "PAID" ||
                                session.paymentStatus ===
                                  "COVERED_BY_ADVANCE") && (
                                <button
                                  onClick={() => {
                                    if (
                                      confirm(
                                        "Are you sure you want to delete payment for this class? It will revert to unpaid.",
                                      )
                                    ) {
                                      onDeleteClassPayment(session.id);
                                    }
                                  }}
                                  className="text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-200 px-1.5 py-0.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900/60 transition-colors cursor-pointer inline-flex items-center gap-0.5"
                                  title="Delete payment and revert class to unpaid"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                  Delete Pay
                                </button>
                              )}

                            {onEditSession && (
                              <button
                                onClick={() => onEditSession(session)}
                                className="text-[11px] font-medium text-zinc-900 dark:text-zinc-100 hover:text-black dark:hover:text-white px-1.5 py-0.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer inline-flex items-center gap-1"
                                title="Edit literally everything for this session"
                              >
                                <Pencil className="w-2.5 h-2.5" />
                                Edit
                              </button>
                            )}

                            <button
                              onClick={() => onSelectSession(session.id)}
                              className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline cursor-pointer inline-flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              View
                            </button>

                            {onDeleteSession && (
                              <button
                                onClick={() => {
                                  if (
                                    confirm(
                                      "Are you sure you want to permanently delete this class session?",
                                    )
                                  ) {
                                    onDeleteSession(session.id);
                                  }
                                }}
                                className="text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-200 px-1.5 py-0.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900/60 transition-colors cursor-pointer inline-flex items-center gap-0.5"
                                title="Permanently delete this class session"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Events */}
                  {selectedDateEvents.map((ev) => {
                    const sub = ev.subjectId
                      ? subjectMap.get(ev.subjectId)
                      : null;
                    return (
                      <div
                        key={ev.id}
                        className="p-3 border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                            {ev.eventType.replace("_", " ")}
                          </span>
                          <span className=" text-xs text-zinc-500 dark:text-zinc-400">
                            {new Date(ev.startAt).toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                          {ev.title}
                        </div>
                        {sub && (
                          <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            Subject: {sub.name}
                          </div>
                        )}
                        {ev.description && (
                          <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-1">
                            {ev.description}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {/* Quick Action Footer */}
            <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <button
                onClick={() => onOpenScheduleModal(selectedDateKey)}
                className="w-full text-center py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                + Schedule Class for this Date
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AGENDA VIEW */}
      {viewMode === "agenda" && (
        <div className="space-y-8">
          {agendaDateKeys.length === 0 ? (
            <div className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800">
              No classes or events found matching the criteria. Click
              &quot;Schedule Class&quot; or &quot;Generate Next 2 Weeks&quot;.
            </div>
          ) : (
            agendaDateKeys.map((dateKey) => {
              const items = agendaGroupedByDate[dateKey];
              const dateObj = new Date(dateKey + "T00:00:00");
              const isToday = toDateKey(new Date()) === dateKey;

              return (
                <div key={dateKey} className="space-y-2">
                  {/* Date Heading */}
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-semibold uppercase tracking-wider ${isToday ? "text-zinc-900 dark:text-zinc-100 underline" : "text-zinc-500 dark:text-zinc-400"}`}
                    >
                      {dateObj.toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    {isToday && (
                      <span className="text-[10px] bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium px-1.5 py-0.2">
                        TODAY
                      </span>
                    )}
                    <div className="flex-1 border-b border-zinc-200 dark:border-zinc-800" />
                  </div>

                  {/* List of items on this day */}
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    {items.map((item) => {
                      if (item.type === "EVENT") {
                        const ev = item.data;
                        const sub = ev.subjectId
                          ? subjectMap.get(ev.subjectId)
                          : null;
                        return (
                          <div
                            key={ev.id}
                            className="p-3.5 flex items-start justify-between bg-zinc-50/60 dark:bg-zinc-900/60"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-[10px] uppercase tracking-wider text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 px-1 rounded">
                                  {ev.eventType.replace("_", " ")}
                                </span>
                                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                  {ev.title}
                                </span>
                                {sub && (
                                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                    · {sub.name}
                                  </span>
                                )}
                              </div>
                              {ev.description && (
                                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                                  {ev.description}
                                </p>
                              )}
                            </div>
                            <span className=" text-xs text-zinc-500 dark:text-zinc-400 shrink-0">
                              {new Date(ev.startAt).toLocaleTimeString(
                                "en-US",
                                { hour: "numeric", minute: "2-digit" },
                              )}
                            </span>
                          </div>
                        );
                      }

                      const session = item.data;
                      const teacher = teacherMap.get(session.teacherId);
                      const subject = subjectMap.get(session.subjectId);
                      const isFree =
                        session.isFree || session.paymentStatus === "FREE";
                      const color = getTeacherSessionColor(teacher, isFree);
                      const isPaid =
                        session.paymentStatus === "PAID" ||
                        session.paymentStatus === "COVERED_BY_ADVANCE";

                      return (
                        <div
                          key={session.id}
                          onClick={() => onSelectSession(session.id)}
                          className="p-3.5 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors group"
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className="w-3 h-3 rounded-full mt-1 shrink-0"
                              style={{ backgroundColor: color }}
                              title={`Teacher: ${teacher?.name}`}
                            />
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                  {subject?.name}
                                </span>
                                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                  · {teacher?.name}
                                </span>
                                {session.approvalStatus === "PENDING" && (
                                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 px-1.5 py-0.2 rounded flex items-center gap-1">
                                    <Clock3 className="w-2.5 h-2.5" /> PENDING
                                  </span>
                                )}
                                {session.isExtra && (
                                  <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/60 px-1.5 py-0.2 rounded">
                                    EXTRA
                                  </span>
                                )}
                                {(session.status === "TEACHER_ABSENT" ||
                                  session.attendance === "ABSENT") && (
                                  <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 px-1.5 py-0.2 rounded">
                                    TEACHER ABSENT
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                <span className="">
                                  {new Date(
                                    session.scheduledAt,
                                  ).toLocaleTimeString("en-US", {
                                    hour: "numeric",
                                    minute: "2-digit",
                                  })}
                                </span>
                                {session.notes?.length > 0 &&
                                  ` · ${session.notes.length} notes`}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {session.isFree ||
                            session.paymentStatus === "FREE" ? (
                              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-1.5 py-0.5 rounded">
                                FREE
                              </span>
                            ) : session.status === "TEACHER_ABSENT" ||
                              session.attendance === "ABSENT" ? (
                              <span className=" text-sm font-semibold text-zinc-400 line-through">
                                ৳{session.fee.toFixed(2)}
                              </span>
                            ) : (
                              <span className=" text-sm text-zinc-900 dark:text-zinc-100">
                                ৳{session.fee.toFixed(2)}
                              </span>
                            )}

                            {session.approvalStatus === "PENDING" && onApproveSession && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onApproveSession(session.id);
                                }}
                                className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300 hover:text-emerald-950 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded transition-colors cursor-pointer"
                              >
                                Approve
                              </button>
                            )}
                            {session.approvalStatus === "PENDING" && onRejectSession && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRejectSession(session.id);
                                }}
                                className="text-[11px] font-medium text-rose-800 dark:text-rose-300 hover:text-rose-950 px-2 py-0.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded transition-colors cursor-pointer"
                              >
                                Reject
                              </button>
                            )}

                            {session.status === "TEACHER_ABSENT" ||
                            session.attendance === "ABSENT" ? (
                              <span className="text-xs font-medium text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 px-1.5 py-0.5 rounded">
                                Absent
                              </span>
                            ) : session.isFree ||
                              session.paymentStatus === "FREE" ? (
                              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-1.5 py-0.5 rounded">
                                Free Class
                              </span>
                            ) : isPaid ? (
                              <span className="text-xs  text-zinc-500 dark:text-zinc-400">
                                {session.paymentStatus === "COVERED_BY_ADVANCE"
                                  ? "prepaid"
                                  : "paid"}
                              </span>
                            ) : session.status === "COMPLETED" ? (
                              <span className="text-xs  font-medium text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 px-1.5 py-0.5 rounded">
                                Unpaid
                              </span>
                            ) : (
                              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                {session.status.toLowerCase()}
                              </span>
                            )}

                            {onToggleFreeClass &&
                              session.attendance !== "ABSENT" &&
                              session.status !== "TEACHER_ABSENT" && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleFreeClass(
                                      session.id,
                                      !(
                                        session.isFree ||
                                        session.paymentStatus === "FREE"
                                      ),
                                    );
                                  }}
                                  className={`text-[11px] font-medium px-2 py-0.5 border transition-colors cursor-pointer ${
                                    session.isFree ||
                                    session.paymentStatus === "FREE"
                                      ? "text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100"
                                      : "text-zinc-700 dark:text-zinc-300 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border-zinc-200 dark:border-zinc-700"
                                  }`}
                                  title={
                                    session.isFree
                                      ? "Revert to paid class"
                                      : "Set as free class (won't be counted for payment)"
                                  }
                                >
                                  {session.isFree ||
                                  session.paymentStatus === "FREE"
                                    ? "Make Paid"
                                    : "Make Free"}
                                </button>
                              )}

                            {onDeleteClassPayment &&
                              session.attendance !== "ABSENT" &&
                              session.status !== "TEACHER_ABSENT" &&
                              !session.isFree &&
                              session.paymentStatus !== "FREE" &&
                              isPaid && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (
                                      confirm(
                                        "Are you sure you want to delete payment for this class? It will revert to unpaid.",
                                      )
                                    ) {
                                      onDeleteClassPayment(session.id);
                                    }
                                  }}
                                  className="text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-200 px-1.5 py-0.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900/60 transition-colors cursor-pointer inline-flex items-center gap-0.5"
                                  title="Delete payment and revert class to unpaid"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                  Delete Pay
                                </button>
                              )}

                            {onEditSession && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditSession(session);
                                }}
                                className="text-[11px] font-medium text-zinc-800 dark:text-zinc-200 hover:text-black dark:hover:text-white px-2 py-0.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer inline-flex items-center gap-1"
                              >
                                <Pencil className="w-2.5 h-2.5" />
                                Edit
                              </button>
                            )}

                            {onDeleteSession && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (
                                    confirm(
                                      "Are you sure you want to permanently delete this class session?",
                                    )
                                  ) {
                                    onDeleteSession(session.id);
                                  }
                                }}
                                className="text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-200 px-2 py-0.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900/60 transition-colors cursor-pointer inline-flex items-center gap-1"
                                title="Permanently delete this class session"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------
// Interactive SVG Donut Ring Component for Calendar Day
// ---------------------------------------------------------
interface DateDonutRingProps {
  dayNum: number;
  sessions: ClassSession[];
  teacherMap: Map<string, Teacher>;
  isToday: boolean;
  isSelected: boolean;
  isCurrentMonth: boolean;
  activeTeacherId: string;
}

function DateDonutRing({
  dayNum,
  sessions,
  teacherMap,
  isToday,
  isSelected,
  isCurrentMonth,
  activeTeacherId,
}: DateDonutRingProps) {
  const count = sessions.length;

  // If no sessions on this date: clean date badge
  if (count === 0) {
    return (
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
          isToday
            ? "border-2 border-zinc-900 dark:border-zinc-100 font-bold text-zinc-900 dark:text-zinc-100"
            : isSelected
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold"
              : isCurrentMonth
                ? "text-zinc-700 dark:text-zinc-300"
                : "text-zinc-400 dark:text-zinc-600"
        }`}
      >
        <span className=" text-xs">{dayNum}</span>
      </div>
    );
  }

  // With sessions: Multi-segment SVG Donut Ring
  // Circumference = 2 * PI * r = 2 * PI * 15.9155 ≈ 100
  const r = 15.9155;
  const strokeWidth = 3.6;
  const slicePercent = 100 / count;
  const gap = count > 1 ? 2.5 : 0; // Distinct slice separation when multiple classes

  return (
    <div
      className={`relative w-8 h-8 flex items-center justify-center rounded-full transition-transform ${
        isSelected ? "scale-110" : ""
      }`}
      title={`${count} class(es) on this day`}
    >
      <svg
        viewBox="0 0 40 40"
        className="w-8 h-8 -rotate-90 transform overflow-visible"
      >
        {/* Subtle background track */}
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke="currentColor"
          className="text-zinc-200 dark:text-zinc-800"
          strokeWidth={strokeWidth}
        />

        {/* Dynamic Teacher Color Arcs */}
        {sessions.map((session, idx) => {
          const teacher = teacherMap.get(session.teacherId);
          const isFree = session.isFree || session.paymentStatus === "FREE";
          const color = getTeacherSessionColor(teacher, isFree, idx);
          const isHighlighted =
            activeTeacherId === "ALL" || activeTeacherId === session.teacherId;

          const strokeDash = `${Math.max(1, slicePercent - gap)} ${100 - Math.max(1, slicePercent - gap)}`;
          const strokeOffset = -(idx * slicePercent);

          return (
            <circle
              key={session.id || idx}
              cx="20"
              cy="20"
              r={r}
              fill="none"
              stroke={color}
              strokeWidth={isHighlighted ? strokeWidth : strokeWidth * 0.7}
              strokeDasharray={strokeDash}
              strokeDashoffset={strokeOffset}
              opacity={isHighlighted ? 1 : 0.25}
              className="transition-all duration-200"
            />
          );
        })}
      </svg>

      {/* Date number in center of the donut */}
      <span
        className={`absolute  text-[11px] font-semibold select-none ${
          isToday
            ? "text-zinc-950 dark:text-white underline decoration-zinc-900 dark:decoration-zinc-100 decoration-1 underline-offset-2"
            : isSelected
              ? "text-zinc-900 dark:text-zinc-100"
              : "text-zinc-800 dark:text-zinc-200"
        }`}
      >
        {dayNum}
      </span>
    </div>
  );
}
