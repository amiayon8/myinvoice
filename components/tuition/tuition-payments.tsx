"use client";

import React, { useState } from "react";
import {
  CreditCard,
  Plus,
  Search,
  ArrowDownLeft,
  FileText,
  Clock,
  Download,
  Pencil,
  Trash2,
} from "lucide-react";
import { PaymentRecord, Teacher } from "@/types/tuition";

interface TuitionPaymentsProps {
  payments: PaymentRecord[];
  teachers: Teacher[];
  onOpenRecordPayment: () => void;
  onEditPayment?: (payment: PaymentRecord) => void;
  onDeletePayment?: (paymentId: string) => void;
}

export default function TuitionPayments({
  payments,
  teachers,
  onOpenRecordPayment,
  onEditPayment,
  onDeletePayment,
}: TuitionPaymentsProps) {
  const [search, setSearch] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("ALL");

  const teacherMap = new Map(teachers.map((t) => [t.id, t]));

  const filteredPayments = payments
    .filter((p) => {
      if (selectedTeacherId !== "ALL" && p.teacherId !== selectedTeacherId)
        return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const teacher = teacherMap.get(p.teacherId);
        const matchTeacher = teacher?.name.toLowerCase().includes(q);
        const matchRef = p.reference?.toLowerCase().includes(q);
        const matchNote = p.note?.toLowerCase().includes(q);
        const matchMethod = p.method?.toLowerCase().includes(q);
        return matchTeacher || matchRef || matchNote || matchMethod;
      }
      return true;
    })
    .sort(
      (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime(),
    );

  const totalDisbursed = payments.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-8 text-zinc-900 dark:text-zinc-100 antialiased">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-xl font-medium tracking-tight text-zinc-900 dark:text-zinc-50">
            Payment & Settlement Ledger
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Comprehensive audit trail of cycle settlements and prepaid advance
            deposits
          </p>
        </div>

        <button
          onClick={onOpenRecordPayment}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Record Payment
        </button>
      </div>

      {/* Aggregate Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div>
          <span className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-medium block">
            Total Disbursed
          </span>
          <div className="text-3xl  font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 mt-1">
            ৳{totalDisbursed.toFixed(2)}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Across {payments.length} recorded payments
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 dark:text-zinc-400 font-medium">
              Teacher:
            </span>
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="border border-zinc-300 dark:border-zinc-700 px-2.5 py-1 text-xs bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
            >
              <option value="ALL">All Teachers</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search reference, note, or method..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1 border border-zinc-300 dark:border-zinc-700 text-xs focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400 w-56 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
            />
          </div>
        </div>
      </div>

      {/* Table Ledger */}
      <div className="border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
        <div className="grid grid-cols-12 px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900/80 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          <div className="col-span-3">Date & Teacher</div>
          <div className="col-span-2">Type & Method</div>
          <div className="col-span-3">Notes & Reference</div>
          <div className="col-span-2 text-right">Amount</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {filteredPayments.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No payment records found matching the filter.
          </div>
        ) : (
          filteredPayments.map((p) => {
            const teacher = teacherMap.get(p.teacherId);
            const dateStr = new Date(p.paidAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });

            return (
              <div
                key={p.id}
                className="grid grid-cols-12 px-4 py-3.5 text-xs items-center hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors"
              >
                <div className="col-span-3">
                  <div className="font-medium text-zinc-900 dark:text-zinc-100">
                    {teacher?.name || "Teacher"}
                  </div>
                  <div className=" text-zinc-500 dark:text-zinc-400 text-[11px] mt-0.5">
                    {dateStr}
                  </div>
                </div>

                <div className="col-span-2">
                  <div className="font-medium text-zinc-800 dark:text-zinc-200">
                    {p.type === "ADVANCE_DEPOSIT"
                      ? "Advance Deposit"
                      : p.type === "CYCLE_SETTLEMENT"
                        ? "Cycle Settlement"
                        : "Single Class"}
                  </div>
                  <div className="text-zinc-500 dark:text-zinc-400 text-[11px] mt-0.5">
                    {p.method}
                  </div>
                </div>

                <div className="col-span-3 pr-4">
                  {p.reference && (
                    <div className=" text-zinc-700 dark:text-zinc-300 text-[11px]">
                      Ref: {p.reference}
                    </div>
                  )}
                  {p.note && (
                    <div className="text-zinc-600 dark:text-zinc-400 line-clamp-1">
                      {p.note}
                    </div>
                  )}
                  {p.sessionIds.length > 0 && (
                    <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                      Covers {p.sessionIds.length} classes
                    </div>
                  )}
                </div>

                <div className="col-span-2 text-right  font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                  ৳{p.amount.toFixed(2)}
                </div>

                <div className="col-span-2 flex items-center justify-end gap-1.5">
                  {onEditPayment && (
                    <button
                      onClick={() => onEditPayment(p)}
                      className="px-2 py-1 text-[11px] font-medium text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer inline-flex items-center gap-1"
                      title="Edit payment details"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </button>
                  )}
                  {onDeletePayment && (
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            `Are you sure you want to permanently delete this payment of ৳${p.amount.toFixed(2)}? Covered classes will revert to unpaid and advance credits will be updated.`,
                          )
                        ) {
                          onDeletePayment(p.id);
                        }
                      }}
                      className="px-2 py-1 text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-200 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900/60 transition-colors cursor-pointer inline-flex items-center gap-1"
                      title="Delete payment record"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
