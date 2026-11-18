"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/toast";
import {
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  CreditCard,
  Banknote,
  Search,
  Database,
  RefreshCw,
  Filter,
  DollarSign,
  Eye,
  Check,
  X,
  FileSpreadsheet,
  Pencil,
  Trash2,
} from "lucide-react";

interface RegistrationRecord {
  id: string;
  created_at: string;
  full_name: string;
  phone: string;
  student_id: string | null;
  email: string | null;
  selected_option_id: string;
  selected_option_title: string;
  selected_option_category: string;
  base_price: number;
  vat_percent: number;
  vat_amount: number;
  subtotal_with_vat: number;
  payment_method: "cash" | "bkash";
  bkash_fee_percent: number;
  bkash_fee_amount: number;
  total_payable: number;
  bkash_sender_number: string | null;
  bkash_transaction_id: string | null;
  cash_paid_to: string | null;
  special_notes: string | null;
  payment_status: "pending" | "verified" | "rejected";
  verified_by: string | null;
  verified_at: string | null;
}

interface CoordinatorSummary {
  cashCount: number;
  cashTotal: number;
  bkashCount: number;
  bkashTotal: number;
  totalCount: number;
  totalAmount: number;
}

interface StatsSummary {
  totalRegistrations: number;
  verifiedRegistrations: number;
  pendingRegistrations: number;
  rejectedRegistrations: number;
  totalRevenueExpected: number;
  totalRevenueVerified: number;
  bkashCount: number;
  cashCount: number;
  bkashTotal: number;
  cashTotal: number;
  menuCounts: Record<string, number>;
  coordinatorCounts: Record<string, CoordinatorSummary>;
}

const COORDINATOR_NAMES = [
  "Ayon",
  "Apurbo",
  "Zunairah",
  "Zahira",
  "Punnota",
  "Ishmam",
  "Raheeb",
  "Rajoshi",
  "Niaz",
  "Zaima",
  "Shehab",
];

export default function ClassPartyPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecord, setSelectedRecord] =
    useState<RegistrationRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<RegistrationRecord | null>(
    null,
  );
  const [deletingRecord, setDeletingRecord] =
    useState<RegistrationRecord | null>(null);
  const [sqlModalOpen, setSqlModalOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const fetchRegistrations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (methodFilter !== "all") params.set("method", methodFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/class-party-26/admin?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setRegistrations(data.registrations || []);
        setStats(data.stats || null);
      } else {
        toast.error("Failed to load registrations");
      }
    } catch (error) {
      console.error(error);
      toast.error("Network error fetching registrations");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, methodFilter, searchQuery, toast]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  const handleUpdateStatus = async (
    id: string,
    newStatus: "verified" | "rejected" | "pending",
  ) => {
    setActionInProgress(id);
    try {
      const res = await fetch("/api/class-party-26/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          payment_status: newStatus,
          verified_by: "Coordinator",
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Payment marked as ${newStatus}`);
        fetchRegistrations();
        if (selectedRecord && selectedRecord.id === id) {
          setSelectedRecord((prev) =>
            prev ? { ...prev, payment_status: newStatus } : null,
          );
        }
      } else {
        toast.error("Failed to update status");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating payment status");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    setActionInProgress(editingRecord.id);
    try {
      const res = await fetch("/api/class-party-26/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingRecord),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Registration details updated");
        setEditingRecord(null);
        fetchRegistrations();
        if (selectedRecord && selectedRecord.id === editingRecord.id) {
          setSelectedRecord(editingRecord);
        }
      } else {
        toast.error(data.message || "Failed to save updates");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error saving changes");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDelete = async () => {
    if (!deletingRecord) return;

    setActionInProgress(deletingRecord.id);
    try {
      const res = await fetch(
        `/api/class-party-26/admin?id=${deletingRecord.id}`,
        {
          method: "DELETE",
        },
      );

      const data = await res.json();
      if (data.success) {
        toast.success("Registration deleted");
        setDeletingRecord(null);
        if (selectedRecord && selectedRecord.id === deletingRecord.id) {
          setSelectedRecord(null);
        }
        fetchRegistrations();
      } else {
        toast.error(data.message || "Failed to delete");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error deleting registration");
    } finally {
      setActionInProgress(null);
    }
  };

  const exportCSV = () => {
    if (!registrations.length) {
      toast.error("No registrations to export");
      return;
    }

    const headers = [
      "ID",
      "Created At",
      "Full Name",
      "Phone",
      "Student ID",
      "Email",
      "Menu Choice",
      "Category",
      "Base Price",
      "VAT Amount",
      "Subtotal",
      "Payment Method",
      "bKash Fee",
      "Total Payable",
      "bKash Number",
      "Transaction ID",
      "Cash Paid To",
      "Payment Status",
      "Special Notes",
    ];

    const rows = registrations.map((r) => [
      `"${r.id}"`,
      `"${r.created_at}"`,
      `"${r.full_name.replace(/"/g, '""')}"`,
      `"${r.phone}"`,
      `"${(r.student_id || "").replace(/"/g, '""')}"`,
      `"${(r.email || "").replace(/"/g, '""')}"`,
      `"${r.selected_option_title.replace(/"/g, '""')}"`,
      `"${r.selected_option_category}"`,
      r.base_price,
      r.vat_amount,
      r.subtotal_with_vat,
      r.payment_method,
      r.bkash_fee_amount,
      r.total_payable,
      `"${r.bkash_sender_number || ""}"`,
      `"${r.bkash_transaction_id || ""}"`,
      `"${r.cash_paid_to || ""}"`,
      r.payment_status,
      `"${(r.special_notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `class_party_26_registrations_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV export downloaded");
  };

  return (
    <div className="p-4 lg:p-12 max-w-7xl mx-auto space-y-8 font-sans">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/20 uppercase tracking-wider">
              Management Portal
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              Class Party 2026
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tight mt-1">
            Class Party &apos;26 Attendees
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
            The Royal Garden, Uttara • 27 November, 2026 • Registration &
            Payment Reconciliation
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={fetchRegistrations}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer shadow-xs"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Export CSV
          </button>

          <button
            type="button"
            onClick={() => setSqlModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer shadow-xs"
          >
            <Database className="w-3.5 h-3.5" />
            SQL Schema
          </button>
        </div>
      </header>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1 shadow-xs">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-zinc-400" />
              Total Registrations
            </span>
            <div className="text-2xl font-bold text-zinc-900 dark:text-white">
              {stats.totalRegistrations}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1 shadow-xs">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Verified
            </span>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {stats.verifiedRegistrations}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1 shadow-xs">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              Pending
            </span>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {stats.pendingRegistrations}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1 shadow-xs">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
              Verified Total
            </span>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              ৳{stats.totalRevenueVerified.toLocaleString()}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1 shadow-xs">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-pink-500" />
              bKash (Ayon)
            </span>
            <div className="text-xl font-bold text-pink-600 dark:text-pink-400">
              {stats.bkashCount}
            </div>
            <div className="text-[11px] font-mono text-zinc-500">
              ৳{stats.bkashTotal.toLocaleString()}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1 shadow-xs">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Banknote className="w-3.5 h-3.5 text-emerald-500" />
              Cash Total
            </span>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {stats.cashCount}
            </div>
            <div className="text-[11px] font-mono text-zinc-500">
              ৳{stats.cashTotal.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {stats &&
        stats.coordinatorCounts &&
        Object.keys(stats.coordinatorCounts).length > 0 && (
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                <Banknote className="w-4 h-4 text-emerald-500" />
                Coordinator Collection Summary
              </h2>
              <span className="text-xs text-zinc-500">
                Real-time payment breakdown
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries(stats.coordinatorCounts).map(([person, data]) => {
                const isAyon = person === "Ayon";

                return (
                  <div
                    key={person}
                    className={`p-3.5 rounded-xl border space-y-2 ${
                      isAyon
                        ? "bg-violet-50/70 dark:bg-violet-950/30 border-violet-300 dark:border-violet-500/40 ring-1 ring-violet-500/30"
                        : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200/80 dark:border-zinc-800/80"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                        {person}
                      </span>
                      <span className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        ৳{data.totalAmount.toLocaleString()}
                      </span>
                    </div>

                    <div className="text-xs space-y-1 font-mono text-zinc-600 dark:text-zinc-400 pt-1 border-t border-zinc-200/60 dark:border-zinc-800/60">
                      {isAyon ? (
                        <>
                          <div className="flex justify-between">
                            <span className="text-pink-600 dark:text-pink-400">
                              bKash:
                            </span>
                            <span>
                              ৳{data.bkashTotal.toLocaleString()} (
                              {data.bkashCount})
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-emerald-600 dark:text-emerald-400">
                              Cash:
                            </span>
                            <span>
                              ৳{data.cashTotal.toLocaleString()} (
                              {data.cashCount})
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between">
                          <span className="text-emerald-600 dark:text-emerald-400">
                            Cash:
                          </span>
                          <span>
                            ৳{data.cashTotal.toLocaleString()} ({data.cashCount}
                            )
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, phone, roll, TrxID, coordinator..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-violet-500 transition shadow-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 focus:outline-hidden cursor-pointer shadow-xs"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 focus:outline-hidden cursor-pointer shadow-xs"
          >
            <option value="all">All Methods</option>
            <option value="bkash">bKash</option>
            <option value="cash">Cash</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-950/80 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Participant</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Menu Selection</th>
                <th className="py-3 px-4">Method & Details</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-200/80 dark:divide-zinc-800/80">
              {registrations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    No registrations found matching the criteria.
                  </td>
                </tr>
              ) : (
                registrations.map((record) => (
                  <tr
                    key={record.id}
                    className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">
                        {record.full_name}
                      </div>
                      {record.student_id && (
                        <div className="text-[11px] text-zinc-500 font-mono">
                          ID: {record.student_id}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-zinc-700 dark:text-zinc-300">
                      <a
                        href={`https://wa.me/88${record.phone.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-emerald-600 dark:hover:text-emerald-400 underline inline-flex items-center gap-1"
                      >
                        {record.phone}
                      </a>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-zinc-900 dark:text-zinc-200 line-clamp-1 font-medium">
                        {record.selected_option_title}
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        {record.selected_option_category}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-xs">
                      {record.payment_method === "bkash" ? (
                        <div>
                          <span className="font-semibold text-pink-600 dark:text-pink-400 uppercase">
                            bKash (Ayon)
                          </span>
                          <div className="text-zinc-500 dark:text-zinc-400 text-[11px]">
                            Trx:{" "}
                            <span className="font-bold text-zinc-900 dark:text-white">
                              {record.bkash_transaction_id}
                            </span>
                          </div>
                          <div className="text-zinc-400 dark:text-zinc-500 text-[11px]">
                            From: {record.bkash_sender_number}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400 uppercase">
                            Cash
                          </span>
                          <div className="text-zinc-500 dark:text-zinc-400 text-[11px]">
                            Paid to:{" "}
                            <span className="font-bold text-zinc-900 dark:text-white">
                              {record.cash_paid_to}
                            </span>
                          </div>
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-bold font-mono text-amber-600 dark:text-amber-400">
                      ৳{record.total_payable}
                    </td>

                    <td className="py-3.5 px-4">
                      {record.payment_status === "verified" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          Verified
                        </span>
                      ) : record.payment_status === "rejected" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                          <XCircle className="w-3 h-3" />
                          Rejected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          <Clock className="w-3 h-3" />
                          Pending
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {record.payment_status !== "verified" && (
                          <button
                            type="button"
                            disabled={actionInProgress === record.id}
                            onClick={() =>
                              handleUpdateStatus(record.id, "verified")
                            }
                            title="Mark as Verified"
                            className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {record.payment_status !== "rejected" && (
                          <button
                            type="button"
                            disabled={actionInProgress === record.id}
                            onClick={() =>
                              handleUpdateStatus(record.id, "rejected")
                            }
                            title="Mark as Rejected"
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 transition cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setEditingRecord({ ...record })}
                          title="Edit Details"
                          className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 transition cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeletingRecord(record)}
                          title="Delete Submission"
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedRecord(record)}
                          title="View Full Details"
                          className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                  Edit Submission
                </h2>
                <p className="text-xs text-zinc-500 font-mono">
                  ID: {editingRecord.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Attendee Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editingRecord.full_name}
                    onChange={(e) =>
                      setEditingRecord({
                        ...editingRecord,
                        full_name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Phone
                  </label>
                  <input
                    type="text"
                    required
                    value={editingRecord.phone}
                    onChange={(e) =>
                      setEditingRecord({
                        ...editingRecord,
                        phone: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Student ID / Roll
                  </label>
                  <input
                    type="text"
                    value={editingRecord.student_id || ""}
                    onChange={(e) =>
                      setEditingRecord({
                        ...editingRecord,
                        student_id: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editingRecord.email || ""}
                    onChange={(e) =>
                      setEditingRecord({
                        ...editingRecord,
                        email: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Menu Title
                  </label>
                  <input
                    type="text"
                    required
                    value={editingRecord.selected_option_title}
                    onChange={(e) =>
                      setEditingRecord({
                        ...editingRecord,
                        selected_option_title: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Total Payable (BDT)
                  </label>
                  <input
                    type="number"
                    required
                    value={editingRecord.total_payable}
                    onChange={(e) =>
                      setEditingRecord({
                        ...editingRecord,
                        total_payable: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Payment Method
                  </label>
                  <select
                    value={editingRecord.payment_method}
                    onChange={(e) =>
                      setEditingRecord({
                        ...editingRecord,
                        payment_method: e.target.value as "cash" | "bkash",
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden cursor-pointer"
                  >
                    <option value="bkash">bKash (Ayon)</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Payment Status
                  </label>
                  <select
                    value={editingRecord.payment_status}
                    onChange={(e) =>
                      setEditingRecord({
                        ...editingRecord,
                        payment_status: e.target.value as
                          | "pending"
                          | "verified"
                          | "rejected",
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden cursor-pointer"
                  >
                    <option value="pending">Pending</option>
                    <option value="verified">Verified</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              {editingRecord.payment_method === "bkash" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-pink-50/60 dark:bg-pink-950/20 border border-pink-200 dark:border-pink-500/20">
                  <div className="space-y-1">
                    <label className="font-semibold text-pink-800 dark:text-pink-300">
                      Sender bKash
                    </label>
                    <input
                      type="text"
                      value={editingRecord.bkash_sender_number || ""}
                      onChange={(e) =>
                        setEditingRecord({
                          ...editingRecord,
                          bkash_sender_number: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-pink-800 dark:text-pink-300">
                      Transaction ID
                    </label>
                    <input
                      type="text"
                      value={editingRecord.bkash_transaction_id || ""}
                      onChange={(e) =>
                        setEditingRecord({
                          ...editingRecord,
                          bkash_transaction_id: e.target.value.toUpperCase(),
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden uppercase font-mono"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1 p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/20">
                  <label className="font-semibold text-emerald-800 dark:text-emerald-300">
                    Cash Received By Coordinator
                  </label>
                  <select
                    value={editingRecord.cash_paid_to || ""}
                    onChange={(e) =>
                      setEditingRecord({
                        ...editingRecord,
                        cash_paid_to: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden cursor-pointer"
                  >
                    <option value="">-- Select Coordinator --</option>
                    {COORDINATOR_NAMES.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                  Special Notes
                </label>
                <textarea
                  rows={2}
                  value={editingRecord.special_notes || ""}
                  onChange={(e) =>
                    setEditingRecord({
                      ...editingRecord,
                      special_notes: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionInProgress === editingRecord.id}
                  className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold transition cursor-pointer shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/60 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold">Delete Registration?</h2>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Are you sure you want to permanently delete the registration for{" "}
              <strong className="text-zinc-900 dark:text-zinc-100">
                {deletingRecord.full_name}
              </strong>{" "}
              (Phone: {deletingRecord.phone})? This action cannot be reversed.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingRecord(null)}
                className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionInProgress === deletingRecord.id}
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-semibold text-white transition cursor-pointer shadow-xs"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                  Attendee Information
                </h2>
                <p className="text-xs text-zinc-500">
                  Registered on{" "}
                  {new Date(selectedRecord.created_at).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 py-2 font-mono text-xs">
              <div className="flex justify-between py-1.5 border-b border-zinc-200 dark:border-zinc-800">
                <span className="text-zinc-500 dark:text-zinc-400">Name</span>
                <span className="font-bold text-zinc-900 dark:text-white">
                  {selectedRecord.full_name}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-200 dark:border-zinc-800">
                <span className="text-zinc-500 dark:text-zinc-400">Phone</span>
                <span>{selectedRecord.phone}</span>
              </div>
              {selectedRecord.student_id && (
                <div className="flex justify-between py-1.5 border-b border-zinc-200 dark:border-zinc-800">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    Student ID
                  </span>
                  <span>{selectedRecord.student_id}</span>
                </div>
              )}
              {selectedRecord.email && (
                <div className="flex justify-between py-1.5 border-b border-zinc-200 dark:border-zinc-800">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    Email
                  </span>
                  <span>{selectedRecord.email}</span>
                </div>
              )}
              <div className="flex justify-between py-1.5 border-b border-zinc-200 dark:border-zinc-800">
                <span className="text-zinc-500 dark:text-zinc-400">Menu</span>
                <span className="text-right font-medium">
                  {selectedRecord.selected_option_title}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-200 dark:border-zinc-800">
                <span className="text-zinc-500 dark:text-zinc-400">
                  Base Price
                </span>
                <span>৳{selectedRecord.base_price}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-200 dark:border-zinc-800">
                <span className="text-zinc-500 dark:text-zinc-400">
                  VAT (5%)
                </span>
                <span>৳{selectedRecord.vat_amount}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-200 dark:border-zinc-800">
                <span className="text-zinc-500 dark:text-zinc-400">
                  Payment Surcharge
                </span>
                <span>৳{selectedRecord.bkash_fee_amount}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-200 dark:border-zinc-800 text-sm font-bold text-amber-600 dark:text-amber-400">
                <span>Total Amount</span>
                <span>৳{selectedRecord.total_payable}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-200 dark:border-zinc-800">
                <span className="text-zinc-500 dark:text-zinc-400">Method</span>
                <span className="uppercase font-semibold">
                  {selectedRecord.payment_method}
                </span>
              </div>
              {selectedRecord.payment_method === "bkash" ? (
                <>
                  <div className="flex justify-between py-1.5 border-b border-zinc-200 dark:border-zinc-800">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      bKash Sender
                    </span>
                    <span>{selectedRecord.bkash_sender_number}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-zinc-200 dark:border-zinc-800">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Transaction ID
                    </span>
                    <span className="font-bold text-zinc-900 dark:text-white">
                      {selectedRecord.bkash_transaction_id}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between py-1.5 border-b border-zinc-200 dark:border-zinc-800">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    Cash Paid To
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {selectedRecord.cash_paid_to}
                  </span>
                </div>
              )}
              {selectedRecord.special_notes && (
                <div className="py-2 border-b border-zinc-200 dark:border-zinc-800">
                  <div className="text-zinc-500 dark:text-zinc-400 mb-1">
                    Notes:
                  </div>
                  <div className="text-zinc-700 dark:text-zinc-300 font-sans text-xs bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-lg border border-zinc-200/60 dark:border-zinc-800">
                    {selectedRecord.special_notes}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap justify-between items-center gap-2 pt-2">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleUpdateStatus(selectedRecord.id, "verified")
                  }
                  className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition cursor-pointer shadow-xs"
                >
                  Verify Payment
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleUpdateStatus(selectedRecord.id, "rejected")
                  }
                  className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-bold text-xs transition cursor-pointer"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingRecord({ ...selectedRecord });
                    setSelectedRecord(null);
                  }}
                  className="px-3 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-xs transition cursor-pointer"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeletingRecord(selectedRecord);
                    setSelectedRecord(null);
                  }}
                  className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-bold text-xs transition cursor-pointer"
                >
                  Delete
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {sqlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-3xl max-h-[85vh] overflow-y-auto bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2 text-zinc-900 dark:text-white">
                  <Database className="w-5 h-5 text-blue-500" />
                  Supabase SQL Schema
                </h2>
                <p className="text-xs text-zinc-500">
                  Run this in your Supabase SQL Editor to create table, indexes,
                  and RLS policies.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSqlModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <pre className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-[11px] font-mono text-zinc-800 dark:text-zinc-300 overflow-x-auto whitespace-pre leading-relaxed select-all">
              {`create table if not exists public.class_party_26_registrations (
    id uuid primary key default gen_random_uuid(),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    full_name text not null,
    phone text not null,
    student_id text,
    email text,
    selected_option_id text not null,
    selected_option_title text not null,
    selected_option_category text not null,
    base_price numeric(10, 2) not null,
    vat_percent numeric(5, 2) default 5.00 not null,
    vat_amount numeric(10, 2) not null,
    subtotal_with_vat numeric(10, 2) not null,
    payment_method text not null check (payment_method in ('cash', 'bkash')),
    bkash_fee_percent numeric(5, 2) default 0.00 not null,
    bkash_fee_amount numeric(10, 2) default 0.00 not null,
    total_payable numeric(10, 2) not null,
    bkash_sender_number text,
    bkash_transaction_id text,
    cash_paid_to text,
    special_notes text,
    payment_status text default 'pending' not null check (payment_status in ('pending', 'verified', 'rejected')),
    verified_by text,
    verified_at timestamp with time zone
);

create index if not exists idx_cp26_phone on public.class_party_26_registrations (phone);
create index if not exists idx_cp26_status on public.class_party_26_registrations (payment_status);
create index if not exists idx_cp26_method on public.class_party_26_registrations (payment_method);
create index if not exists idx_cp26_paid_to on public.class_party_26_registrations (cash_paid_to);

alter table public.class_party_26_registrations enable row level security;

create policy "Allow public submissions"
    on public.class_party_26_registrations for insert with check (true);
create policy "Allow read access"
    on public.class_party_26_registrations for select using (true);
create policy "Allow update access"
    on public.class_party_26_registrations for update using (true);
create policy "Allow delete access"
    on public.class_party_26_registrations for delete using (true);`}
            </pre>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard
                    .writeText(`create table if not exists public.class_party_26_registrations (
    id uuid primary key default gen_random_uuid(),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    full_name text not null,
    phone text not null,
    student_id text,
    email text,
    selected_option_id text not null,
    selected_option_title text not null,
    selected_option_category text not null,
    base_price numeric(10, 2) not null,
    vat_percent numeric(5, 2) default 5.00 not null,
    vat_amount numeric(10, 2) not null,
    subtotal_with_vat numeric(10, 2) not null,
    payment_method text not null check (payment_method in ('cash', 'bkash')),
    bkash_fee_percent numeric(5, 2) default 0.00 not null,
    bkash_fee_amount numeric(10, 2) default 0.00 not null,
    total_payable numeric(10, 2) not null,
    bkash_sender_number text,
    bkash_transaction_id text,
    cash_paid_to text,
    special_notes text,
    payment_status text default 'pending' not null check (payment_status in ('pending', 'verified', 'rejected')),
    verified_by text,
    verified_at timestamp with time zone
);`);
                  toast.success("SQL copied to clipboard");
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white transition cursor-pointer shadow-xs"
              >
                Copy SQL
              </button>

              <button
                type="button"
                onClick={() => setSqlModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
