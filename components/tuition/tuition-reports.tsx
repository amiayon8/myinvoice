"use client";

import React from "react";
import { Teacher, Subject, ClassSession, PaymentRecord } from "@/types/tuition";

interface TuitionReportsProps {
  teachers: Teacher[];
  subjects: Subject[];
  sessions: ClassSession[];
  payments: PaymentRecord[];
}

export default function TuitionReports({
  teachers,
  subjects,
  sessions,
  payments
}: TuitionReportsProps) {
  const teacherMap = new Map(teachers.map(t => [t.id, t]));
  const subjectMap = new Map(subjects.map(s => [s.id, s]));

  const completedSessions = sessions.filter(s => s.status === "COMPLETED");
  const totalCost = completedSessions.reduce((acc, curr) => acc + curr.fee, 0);
  const totalPaid = completedSessions
    .filter(s => s.paymentStatus === "PAID" || s.paymentStatus === "COVERED_BY_ADVANCE")
    .reduce((acc, curr) => acc + curr.fee, 0);
  const totalOutstanding = Math.max(0, totalCost - totalPaid);

  // Breakdown by Teacher
  const teacherStats = teachers.map(t => {
    const tSessions = completedSessions.filter(s => s.teacherId === t.id);
    const cost = tSessions.reduce((acc, curr) => acc + curr.fee, 0);
    const paid = tSessions
      .filter(s => s.paymentStatus === "PAID" || s.paymentStatus === "COVERED_BY_ADVANCE")
      .reduce((acc, curr) => acc + curr.fee, 0);

    return {
      teacher: t,
      sessionCount: tSessions.length,
      totalCost: cost,
      paid,
      unpaid: cost - paid,
    };
  });

  // Breakdown by Subject
  const subjectStats = subjects.map(sub => {
    const subSessions = completedSessions.filter(s => s.subjectId === sub.id);
    const cost = subSessions.reduce((acc, curr) => acc + curr.fee, 0);
    return {
      subject: sub,
      sessionCount: subSessions.length,
      totalCost: cost,
    };
  });

  const freeSessionsCount = completedSessions.filter(s => s.isFree || s.paymentStatus === "FREE").length;

  return (
    <div className="space-y-12 text-zinc-900 dark:text-zinc-100 antialiased">
      {/* Top Header */}
      <div className="pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <h2 className="text-xl font-medium tracking-tight text-zinc-900 dark:text-zinc-50">Academic & Cost Analytics</h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">High-density breakdown of class sessions, settlement status, and subject expenses</p>
      </div>

      {/* Aggregate Scorecards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        <div>
          <span className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-medium block">Total Classes Completed</span>
          <div className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 mt-1">
            {completedSessions.length}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {completedSessions.length} total sessions {freeSessionsCount > 0 && `(${freeSessionsCount} free)`}
          </p>
        </div>

        <div>
          <span className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-medium block">Total Academic Value</span>
          <div className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 mt-1">
            ৳{totalCost.toFixed(2)}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Gross tuition cost {freeSessionsCount > 0 && `(Free classes: ৳0)`}
          </p>
        </div>

        <div>
          <span className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-medium block">Settled / Paid</span>
          <div className="text-3xl font-semibold tracking-tight text-emerald-600 dark:text-emerald-400 mt-1">
            ৳{totalPaid.toFixed(2)}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {totalCost > 0 ? ((totalPaid / totalCost) * 100).toFixed(0) : 0}% settled
          </p>
        </div>

        <div>
          <span className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-medium block">Outstanding Balance</span>
          <div className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 mt-1">
            ৳{totalOutstanding.toFixed(2)}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Billable debt (Free classes excluded)</p>
        </div>
      </div>

      {/* Breakdown by Teacher Table */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-tight text-zinc-900 dark:text-zinc-100">Cost Breakdown by Teacher</h3>
        <div className="border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
          <div className="grid grid-cols-12 px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900/80 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            <div className="col-span-4">Teacher</div>
            <div className="col-span-2 text-right">Classes</div>
            <div className="col-span-2 text-right">Total Cost</div>
            <div className="col-span-2 text-right">Paid</div>
            <div className="col-span-2 text-right">Outstanding</div>
          </div>

          {teacherStats.map(stat => (
            <div key={stat.teacher.id} className="grid grid-cols-12 px-4 py-3 text-xs items-center hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40">
              <div className="col-span-4 font-medium text-zinc-900 dark:text-zinc-100">
                {stat.teacher.name}
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-normal">
                  ৳{stat.teacher.dailyRate ?? stat.teacher.hourlyRate}/day · {stat.teacher.paymentPolicy.type.replace(/_/g, " ").toLowerCase()}
                </div>
              </div>
              <div className="col-span-2 text-right  text-zinc-700 dark:text-zinc-300">
                {stat.sessionCount} classes
              </div>
              <div className="col-span-2 text-right  text-zinc-900 dark:text-zinc-100 font-medium">
                ৳{stat.totalCost.toFixed(2)}
              </div>
              <div className="col-span-2 text-right  text-emerald-600 dark:text-emerald-400">
                ৳{stat.paid.toFixed(2)}
              </div>
              <div className="col-span-2 text-right  font-semibold text-zinc-900 dark:text-zinc-100">
                ৳{stat.unpaid.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Breakdown by Subject Table */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-tight text-zinc-900 dark:text-zinc-100">Cost Breakdown by Subject</h3>
        <div className="border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
          <div className="grid grid-cols-12 px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900/80 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            <div className="col-span-6">Subject</div>
            <div className="col-span-3 text-right">Classes</div>
            <div className="col-span-3 text-right">Total Spent</div>
          </div>

          {subjectStats.map(stat => (
            <div key={stat.subject.id} className="grid grid-cols-12 px-4 py-3 text-xs items-center hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40">
              <div className="col-span-6 font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: stat.subject.color || "#64748b" }} />
                {stat.subject.name}
              </div>
              <div className="col-span-3 text-right  text-zinc-700 dark:text-zinc-300">
                {stat.sessionCount} classes
              </div>
              <div className="col-span-3 text-right  font-semibold text-zinc-900 dark:text-zinc-100">
                ৳{stat.totalCost.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
