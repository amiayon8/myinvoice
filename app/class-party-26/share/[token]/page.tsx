"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { useTheme } from "next-themes";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { ClassPartyCharts } from "@/components/class-party/class-party-charts";
import { getClassPartyFinancials, getClassPartySubtotal } from "@/lib/class-party-calc";
import {
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  CreditCard,
  Banknote,
  Search,
  RefreshCw,
  Filter,
  DollarSign,
  Sun,
  Moon,
  Radio,
  History,
  ShieldCheck,
  AlertTriangle,
  UserCheck,
  Sparkles,
  Calendar,
  MapPin,
  ListFilter,
  X,
  Check,
  Eye,
  Lock,
} from "lucide-react";

interface RegistrationRecord {
  id: string;
  created_at: string;
  full_name: string;
  phone?: string;
  student_id: string | null;
  email?: string | null;
  selected_option_id: string;
  selected_option_title: string;
  selected_option_category: string;
  base_price?: number;
  subtotal?: number;
  subtotal_with_vat?: number;
  payment_method: "cash" | "bkash";
  total_payable?: number;
  paid_amount?: number;
  due_amount?: number;
  raw_submitted_amount?: number;
  bkash_sender_number?: string | null;
  bkash_transaction_id?: string | null;
  cash_paid_to?: string | null;
  special_notes?: string | null;
  payment_status: "pending" | "verified" | "rejected";
  verified_by?: string | null;
  verified_at?: string | null;
}

interface ActivityItem {
  id: string;
  category: "registration" | "payment" | "status" | "edit" | "delete" | "view";
  actor: string;
  action: string;
  details?: string;
  record_id?: string;
  participant_name?: string;
  created_at: string;
}

interface StatsSummary {
  totalRegistrations: number;
  verifiedRegistrations: number;
  pendingRegistrations: number;
  rejectedRegistrations: number;
  totalSubtotal?: number | null;
  totalRevenueExpected: number | null;
  totalRevenueVerified: number | null;
  totalDues?: number | null;
  bkashCount: number;
  cashCount: number;
  bkashTotal: number | null;
  cashTotal: number | null;
  bkashDues?: number | null;
  cashDues?: number | null;
  menuCounts: Record<string, number>;
  coordinatorCounts: Record<
    string,
    {
      cashCount: number;
      cashTotal: number;
      cashDues?: number;
      bkashCount: number;
      bkashTotal: number;
      bkashDues?: number;
      totalCount: number;
      totalAmount: number;
      totalDues?: number;
    }
  > | null;
}

interface LinkMetadata {
  id: string;
  label: string | null;
  type: string;
  params: {
    showFinancials?: boolean;
    showContactInfo?: boolean;
    showHistory?: boolean;
    organizer?: string | null;
    canApprovePayments?: boolean;
  };
  never_expires: boolean;
  expires_at: string | null;
  created_at: string;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "Recently";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffSec < 45) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
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

export default function ClassPartySharePage() {
  const params = useParams();
  const token = typeof params?.token === "string" ? params.token : "";
  const { theme, setTheme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [linkMeta, setLinkMeta] = useState<LinkMetadata | null>(null);
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [historyItems, setHistoryItems] = useState<ActivityItem[]>([]);
  const [stats, setStats] = useState<StatsSummary | null>(null);

  const [activeTab, setActiveTab] = useState<"attendees" | "history">(
    "attendees",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [coordinatorFilter, setCoordinatorFilter] = useState("all");
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] =
    useState<RegistrationRecord | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [realtimePulse, setRealtimePulse] = useState(false);
  const toast = useToast();

  const fetchSharedData = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/class-party-26/share/${token}`, {
        cache: "no-store",
      });
      const data = await res.json();

      if (data.success) {
        setLinkMeta(data.link);
        setRegistrations(data.registrations || []);
        setStats(data.stats || null);
        setHistoryItems(data.history || []);
        setErrorState(null);
        setLastRefreshedAt(new Date());
      } else {
        setErrorState(data.message || "Unable to view shared party records.");
      }
    } catch {
      setErrorState("Network connectivity issue. Please check connection.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const canApproveRecord = useCallback(
    (record: RegistrationRecord): boolean => {
      if (!linkMeta?.params.canApprovePayments) return false;
      const organizer = linkMeta.params.organizer;
      if (!organizer) return true;
      const target = organizer.toLowerCase();
      if (target === "ayon") {
        return (
          record.payment_method === "bkash" ||
          record.cash_paid_to?.toLowerCase() === "ayon"
        );
      }
      return record.cash_paid_to?.toLowerCase() === target;
    },
    [linkMeta],
  );

  const myPendingCount = useMemo(() => {
    if (!linkMeta?.params.canApprovePayments || !linkMeta?.params.organizer) {
      return 0;
    }
    return registrations.filter(
      (r) => r.payment_status === "pending" && canApproveRecord(r),
    ).length;
  }, [registrations, linkMeta, canApproveRecord]);

  const handleUpdateStatus = async (
    recordId: string,
    newStatus: "verified" | "rejected" | "pending",
  ) => {
    setActionInProgress(recordId);
    try {
      const res = await fetch(`/api/class-party-26/share/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationId: recordId,
          status: newStatus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          newStatus === "verified"
            ? "Payment verified"
            : newStatus === "rejected"
              ? "Payment marked as rejected"
              : "Payment status reset to pending",
        );
        const actorName = linkMeta?.params.organizer || "Organizer";
        setRegistrations((prev) =>
          prev.map((r) =>
            r.id === recordId
              ? {
                  ...r,
                  payment_status: newStatus,
                  verified_by: newStatus === "pending" ? null : actorName,
                  verified_at:
                    newStatus === "pending" ? null : new Date().toISOString(),
                }
              : r,
          ),
        );
        if (selectedRecord && selectedRecord.id === recordId) {
          setSelectedRecord((prev) =>
            prev
              ? {
                  ...prev,
                  payment_status: newStatus,
                  verified_by: newStatus === "pending" ? null : actorName,
                  verified_at:
                    newStatus === "pending" ? null : new Date().toISOString(),
                }
              : null,
          );
        }
        fetchSharedData();
      } else {
        toast.error(data.message || "Failed to update payment status");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error updating status");
    } finally {
      setActionInProgress(null);
    }
  };

  useEffect(() => {
    fetchSharedData();
  }, [fetchSharedData]);

  useEffect(() => {
    if (!token) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`cp26-shared-${token}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "class_party_26_registrations",
        },
        () => {
          setRealtimePulse(true);
          setTimeout(() => setRealtimePulse(false), 2000);
          fetchSharedData();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "class_party_26_activity_logs",
        },
        () => {
          fetchSharedData();
        },
      )
      .subscribe();

    const intervalTimer = setInterval(() => {
      fetchSharedData();
    }, 25000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(intervalTimer);
    };
  }, [token, fetchSharedData]);

  const filteredRegistrations = useMemo(() => {
    return registrations.filter((record) => {
      if (statusFilter === "due") {
        const fin = getClassPartyFinancials(record as any);
        if (fin.dueAmount <= 0) return false;
      } else if (statusFilter === "paid") {
        const fin = getClassPartyFinancials(record as any);
        if (fin.dueAmount > 0) return false;
      } else if (statusFilter !== "all" && record.payment_status !== statusFilter) {
        return false;
      }
      if (methodFilter !== "all" && record.payment_method !== methodFilter) {
        return false;
      }
      if (coordinatorFilter !== "all") {
        const target = coordinatorFilter.toLowerCase();
        const isMatch =
          target === "ayon"
            ? record.payment_method === "bkash" ||
              record.cash_paid_to?.toLowerCase() === "ayon"
            : record.cash_paid_to?.toLowerCase() === target;
        if (!isMatch) return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchName = record.full_name?.toLowerCase().includes(query);
        const matchStudentId = record.student_id?.toLowerCase().includes(query);
        const matchPhone = record.phone?.toLowerCase().includes(query);
        const matchOption = record.selected_option_title
          ?.toLowerCase()
          .includes(query);
        const matchCoordinator = record.cash_paid_to
          ?.toLowerCase()
          .includes(query);
        const matchTrx = record.bkash_transaction_id
          ?.toLowerCase()
          .includes(query);

        return (
          matchName ||
          matchStudentId ||
          matchPhone ||
          matchOption ||
          matchCoordinator ||
          matchTrx
        );
      }
      return true;
    });
  }, [registrations, statusFilter, methodFilter, coordinatorFilter, searchQuery]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-violet-600/10 dark:bg-violet-500/20 flex items-center justify-center mb-4 animate-pulse">
          <Sparkles className="w-6 h-6 text-violet-600 dark:text-violet-400" />
        </div>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Loading Class Party &apos;26 Details
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Synchronizing attendee records and live reconciliation...
        </p>
      </div>
    );
  }

  if (errorState) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Access Restricted or Unavailable
          </h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {errorState}
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={fetchSharedData}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold hover:opacity-90 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try Reconnecting
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/20 uppercase tracking-wider">
                {linkMeta?.label || "Live Shared Board"}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              Class Party &apos;26 Attendees
            </h1>

            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                The Royal Garden, Uttara
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                27 November, 2026
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={fetchSharedData}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>

            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer shadow-xs"
              title="Toggle Dark / Light Theme"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-zinc-600" />
              )}
            </button>
          </div>
        </header>

        {linkMeta?.params.organizer && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-emerald-500/10 border border-violet-500/20 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                {linkMeta.params.organizer[0]}
              </div>
              <div className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                    Coordinator Workspace: {linkMeta.params.organizer}
                  </span>
                  {linkMeta.params.canApprovePayments && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                      Payment Verification Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  {linkMeta.params.canApprovePayments
                    ? `You are authorized to approve payments received by ${linkMeta.params.organizer}. Other collections are read-only.`
                    : `Viewing shared dashboard for ${linkMeta.params.organizer}.`}
                </p>
              </div>
            </div>

            {myPendingCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setCoordinatorFilter(linkMeta.params.organizer!);
                  setStatusFilter("pending");
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-semibold transition cursor-pointer self-start sm:self-auto shrink-0 shadow-xs"
              >
                <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>{myPendingCount} pending paid to you</span>
              </button>
            )}
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1 shadow-xs">
              <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-zinc-400" />
                Total Registered
              </span>
              <div className="text-2xl font-bold text-zinc-900 dark:text-white">
                {stats.totalRegistrations}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1 shadow-xs">
              <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Verified (Paid)
              </span>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {stats.verifiedRegistrations}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1 shadow-xs">
              <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                Pending
              </span>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {stats.pendingRegistrations}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1 shadow-xs">
              <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-blue-500" />
                Total Subtotal
              </span>
              <div className="text-xl font-bold text-zinc-900 dark:text-white">
                {stats.totalSubtotal !== null && stats.totalSubtotal !== undefined
                  ? `৳${stats.totalSubtotal.toLocaleString()}`
                  : stats.totalRevenueExpected !== null
                    ? `৳${stats.totalRevenueExpected.toLocaleString()}`
                    : "Private"}
              </div>
              <div className="text-[11px] text-zinc-500">Gross expected</div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1 shadow-xs">
              <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                <Banknote className="w-3.5 h-3.5 text-emerald-500" />
                Total Collected
              </span>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {stats.totalRevenueVerified !== null
                  ? `৳${stats.totalRevenueVerified.toLocaleString()}`
                  : "Private"}
              </div>
              <div className="text-[11px] text-zinc-500">Approved payments</div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-rose-200 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/20 space-y-1 shadow-xs">
              <span className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5 font-semibold">
                <Clock className="w-3.5 h-3.5 text-rose-500" />
                Total Dues
              </span>
              <div className="text-xl font-bold text-rose-600 dark:text-rose-400">
                {stats.totalDues !== null && stats.totalDues !== undefined
                  ? `৳${stats.totalDues.toLocaleString()}`
                  : "Private"}
              </div>
              <div className="text-[11px] text-rose-500/80 font-medium">Unapproved + partial</div>
            </div>
          </div>
        )}

        {stats && stats.coordinatorCounts && (
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                <Banknote className="w-4 h-4 text-emerald-500" />
                Coordinator Collection & Dues Summary
              </h2>
              <span className="text-xs text-zinc-500">Live reconciliation</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries(stats.coordinatorCounts).map(([person, data]) => {
                const isAyon = person === "Ayon";
                const isSelected = coordinatorFilter === person;

                return (
                  <button
                    type="button"
                    key={person}
                    onClick={() =>
                      setCoordinatorFilter(
                        coordinatorFilter === person ? "all" : person,
                      )
                    }
                    className={`p-3.5 rounded-xl border space-y-2 text-left transition cursor-pointer ${
                      isSelected
                        ? "bg-violet-100/90 dark:bg-violet-900/40 border-violet-500 dark:border-violet-400 ring-2 ring-violet-500 shadow-xs"
                        : isAyon
                          ? "bg-violet-50/70 dark:bg-violet-950/30 border-violet-300 dark:border-violet-500/40 ring-1 ring-violet-500/30 hover:border-violet-400"
                          : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                        {person}
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-600 dark:bg-violet-400" />
                        )}
                      </span>
                      <div className="text-right">
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                          ৳{data.totalAmount.toLocaleString()}
                        </span>
                        {(data.totalDues ?? 0) > 0 && (
                          <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 block">
                            Due: ৳{(data.totalDues ?? 0).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-xs space-y-1 text-zinc-600 dark:text-zinc-400 pt-1 border-t border-zinc-200/60 dark:border-zinc-800/60">
                      {isAyon ? (
                        <>
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-pink-600 dark:text-pink-400">
                              bKash:
                            </span>
                            <span>
                              ৳{data.bkashTotal.toLocaleString()} ({data.bkashCount})
                              {(data.bkashDues ?? 0) > 0 && (
                                <span className="text-rose-500 font-semibold ml-1">
                                  [Due ৳{data.bkashDues}]
                                </span>
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-emerald-600 dark:text-emerald-400">
                              Cash:
                            </span>
                            <span>
                              ৳{data.cashTotal.toLocaleString()} ({data.cashCount})
                              {(data.cashDues ?? 0) > 0 && (
                                <span className="text-rose-500 font-semibold ml-1">
                                  [Due ৳{data.cashDues}]
                                </span>
                              )}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-emerald-600 dark:text-emerald-400">
                            Cash:
                          </span>
                          <span>
                            ৳{data.cashTotal.toLocaleString()} ({data.cashCount})
                            {(data.cashDues ?? 0) > 0 && (
                              <span className="text-rose-500 font-semibold ml-1">
                                [Due ৳{data.cashDues}]
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <ClassPartyCharts
          registrations={registrations}
          showFinancials={linkMeta?.params.showFinancials !== false}
        />

        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <nav className="flex items-center gap-6 text-sm">
            <button
              type="button"
              onClick={() => setActiveTab("attendees")}
              className={`pb-3 font-semibold transition-colors border-b-2 -mb-3 cursor-pointer flex items-center gap-2 ${
                activeTab === "attendees"
                  ? "border-violet-600 text-violet-600 dark:border-violet-400 dark:text-violet-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              <Users className="w-4 h-4" />
              Attendees List
              <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                {filteredRegistrations.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`pb-3 font-semibold transition-colors border-b-2 -mb-3 cursor-pointer flex items-center gap-2 ${
                activeTab === "history"
                  ? "border-violet-600 text-violet-600 dark:border-violet-400 dark:text-violet-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              <History className="w-4 h-4" />
              Activity & History
              <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                {historyItems.length}
              </span>
            </button>
          </nav>

          <span className="text-[11px] text-zinc-400 hidden sm:inline">
            Updated {formatRelativeTime(lastRefreshedAt.toISOString())}
          </span>
        </div>

        {activeTab === "attendees" ? (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search attendee by name, student ID, menu..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-violet-500 transition shadow-xs"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filter:</span>
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 focus:outline-hidden cursor-pointer shadow-xs"
                >
                  <option value="all">All Statuses</option>
                  <option value="verified">Verified (Approved)</option>
                  <option value="pending">Pending Approval</option>
                  <option value="due">Has Dues (Due &gt; 0)</option>
                  <option value="paid">Fully Settled (Due = 0)</option>
                  <option value="rejected">Rejected</option>
                </select>

                <select
                  value={methodFilter}
                  onChange={(e) => setMethodFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 focus:outline-hidden cursor-pointer shadow-xs"
                >
                  <option value="all">All Payment Methods</option>
                  <option value="bkash">bKash</option>
                  <option value="cash">Cash</option>
                </select>

                <select
                  value={coordinatorFilter}
                  onChange={(e) => setCoordinatorFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 focus:outline-hidden cursor-pointer shadow-xs"
                >
                  <option value="all">All Coordinators</option>
                  {COORDINATOR_NAMES.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>

                {coordinatorFilter !== "all" && (
                  <button
                    type="button"
                    onClick={() => setCoordinatorFilter("all")}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/20 hover:bg-violet-500/20 transition cursor-pointer"
                    title="Clear coordinator filter"
                  >
                    <span>Paid to: {coordinatorFilter}</span>
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-950/80 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Attendee</th>
                      <th className="py-3 px-4">Menu Choice</th>
                      <th className="py-3 px-4">Payment Method</th>
                      {linkMeta?.params.showFinancials !== false && (
                        <>
                          <th className="py-3 px-4">Subtotal</th>
                          <th className="py-3 px-4">Paid Amount</th>
                          <th className="py-3 px-4">Due</th>
                        </>
                      )}
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">
                        {linkMeta?.params.canApprovePayments ? "Approval" : "Details"}
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-zinc-200/80 dark:divide-zinc-800/80">
                    {filteredRegistrations.length === 0 ? (
                      <tr>
                        <td
                          colSpan={linkMeta?.params.showFinancials !== false ? 8 : 5}
                          className="py-12 text-center text-zinc-500 dark:text-zinc-400 text-xs"
                        >
                          No attendee records found matching the criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredRegistrations.map((record) => (
                        <tr
                          key={record.id}
                          className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                        >
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-zinc-900 dark:text-zinc-100">
                              {record.full_name}
                            </div>
                            {record.student_id && (
                              <div className="text-[11px] text-zinc-500">
                                Roll/ID: {record.student_id}
                              </div>
                            )}
                            {record.phone && (
                              <div className="text-[11px] text-zinc-400">
                                {record.phone}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="text-zinc-900 dark:text-zinc-200 font-medium line-clamp-1">
                              {record.selected_option_title}
                            </div>
                            <div className="text-[11px] text-zinc-500">
                              {record.selected_option_category}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-xs">
                            {record.payment_method === "bkash" ? (
                              <div>
                                <span className="font-semibold text-pink-600 dark:text-pink-400 uppercase">
                                  bKash (Ayon)
                                </span>
                                {record.bkash_transaction_id && (
                                  <div className="text-zinc-500 text-[11px]">
                                    Trx: {record.bkash_transaction_id}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div>
                                <span className="font-semibold text-emerald-600 dark:text-emerald-400 uppercase">
                                  Cash
                                </span>
                                {record.cash_paid_to && (
                                  <div className="text-zinc-500 text-[11px]">
                                    Paid to: {record.cash_paid_to}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          {linkMeta?.params.showFinancials !== false && (() => {
                            const fin = getClassPartyFinancials(record as any);
                            return (
                              <>
                                <td className="py-3.5 px-4 font-semibold text-zinc-900 dark:text-zinc-100">
                                  ৳{fin.subtotal.toLocaleString()}
                                </td>
                                <td className="py-3.5 px-4">
                                  {fin.isApproved ? (
                                    <div>
                                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                        ৳{fin.paidAmount.toLocaleString()}
                                      </span>
                                      <span className="block text-[10px] text-zinc-400">Verified</span>
                                    </div>
                                  ) : (
                                    <div>
                                      <span className="font-semibold text-zinc-400">
                                        ৳0
                                      </span>
                                      {fin.rawSubmittedAmount > 0 && (
                                        <span className="block text-[10px] text-amber-500 font-normal">
                                          (৳{fin.rawSubmittedAmount.toLocaleString()} unapproved)
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </td>
                                <td className="py-3.5 px-4">
                                  {fin.dueAmount > 0 ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                      ৳{fin.dueAmount.toLocaleString()}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                      ৳0 (Paid)
                                    </span>
                                  )}
                                </td>
                              </>
                            );
                          })()}

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
                            <div className="inline-flex items-center justify-end gap-1.5">
                              {canApproveRecord(record) ? (
                                <>
                                  {record.payment_status !== "verified" && (
                                    <button
                                      type="button"
                                      disabled={actionInProgress === record.id}
                                      onClick={() =>
                                        handleUpdateStatus(record.id, "verified")
                                      }
                                      title="Approve & Verify Payment"
                                      className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition cursor-pointer disabled:opacity-50"
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
                                      title="Reject Payment"
                                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 transition cursor-pointer disabled:opacity-50"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </>
                              ) : (
                                <span className="text-[11px] text-zinc-400 dark:text-zinc-500 hidden sm:inline">
                                  {record.payment_method === "bkash"
                                    ? "Paid to Ayon"
                                    : `Paid to ${record.cash_paid_to || "other"}`}
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => setSelectedRecord(record)}
                                title="View attendee details"
                                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition cursor-pointer"
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
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <History className="w-4 h-4 text-violet-500" />
                  Live Event History & Reconciliation Feed
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Real-time timeline of registrations, verifications, and link
                  updates
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                {historyItems.length} Logged Events
              </span>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs">
              {historyItems.length === 0 ? (
                <div className="py-12 text-center text-xs text-zinc-500 dark:text-zinc-400">
                  No activity history logged yet.
                </div>
              ) : (
                <div className="relative border-l border-zinc-200 dark:border-zinc-800 ml-4 space-y-6">
                  {historyItems.map((item) => {
                    const isPayment = item.category === "payment";
                    const isDelete = item.category === "delete";
                    const isView = item.category === "view";

                    return (
                      <div key={item.id} className="relative pl-6">
                        <div
                          className={`absolute -left-2.5 top-1 w-5 h-5 rounded-full border-2 border-white dark:border-zinc-900 flex items-center justify-center ${
                            isPayment
                              ? "bg-emerald-500 text-white"
                              : isDelete
                                ? "bg-red-500 text-white"
                                : isView
                                  ? "bg-blue-500 text-white"
                                  : "bg-violet-500 text-white"
                          }`}
                        >
                          {isPayment ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : isDelete ? (
                            <XCircle className="w-3 h-3" />
                          ) : isView ? (
                            <ShieldCheck className="w-3 h-3" />
                          ) : (
                            <UserCheck className="w-3 h-3" />
                          )}
                        </div>

                        <div className="space-y-0.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                              {item.action}
                            </span>
                            <span className="text-[11px] text-zinc-400">
                              {formatRelativeTime(item.created_at)}
                            </span>
                          </div>

                          {item.details && (
                            <p className="text-xs text-zinc-600 dark:text-zinc-400">
                              {item.details}
                            </p>
                          )}

                          <div className="text-[11px] text-zinc-400 flex items-center gap-2 pt-0.5">
                            <span>Actor: {item.actor}</span>
                            <span>•</span>
                            <span>
                              {new Date(item.created_at).toLocaleTimeString(
                                undefined,
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {selectedRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-2xl space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
                <div>
                  <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                    Attendee Details & Payment Status
                  </h2>
                  <p className="text-[11px] text-zinc-500">
                    Registered on{" "}
                    {new Date(selectedRecord.created_at).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5 py-1">
                <div className="flex justify-between py-1.5 border-b border-zinc-200/80 dark:border-zinc-800/80">
                  <span className="text-zinc-500 dark:text-zinc-400">Name</span>
                  <span className="font-bold text-zinc-900 dark:text-white text-sm">
                    {selectedRecord.full_name}
                  </span>
                </div>

                {selectedRecord.student_id && (
                  <div className="flex justify-between py-1.5 border-b border-zinc-200/80 dark:border-zinc-800/80">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Roll / Student ID
                    </span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {selectedRecord.student_id}
                    </span>
                  </div>
                )}

                {selectedRecord.phone && (
                  <div className="flex justify-between py-1.5 border-b border-zinc-200/80 dark:border-zinc-800/80">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Contact Number
                    </span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {selectedRecord.phone}
                    </span>
                  </div>
                )}

                {selectedRecord.email && (
                  <div className="flex justify-between py-1.5 border-b border-zinc-200/80 dark:border-zinc-800/80">
                    <span className="text-zinc-500 dark:text-zinc-400">Email</span>
                    <span className="text-zinc-700 dark:text-zinc-300">
                      {selectedRecord.email}
                    </span>
                  </div>
                )}

                <div className="flex justify-between py-1.5 border-b border-zinc-200/80 dark:border-zinc-800/80">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    Selected Menu
                  </span>
                  <span className="font-medium text-right text-zinc-900 dark:text-zinc-100">
                    {selectedRecord.selected_option_title}
                    <span className="block text-[11px] text-zinc-400">
                      {selectedRecord.selected_option_category}
                    </span>
                  </span>
                </div>

                {linkMeta?.params.showFinancials !== false && (() => {
                  const fin = getClassPartyFinancials(selectedRecord as any);
                  return (
                    <>
                      <div className="flex justify-between py-1.5 border-b border-zinc-200/80 dark:border-zinc-800/80">
                        <span className="text-zinc-500 dark:text-zinc-400">
                          Package Subtotal
                        </span>
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                          ৳{fin.subtotal.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-zinc-200/80 dark:border-zinc-800/80">
                        <span className="text-zinc-500 dark:text-zinc-400">
                          Paid Amount
                        </span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {fin.isApproved
                            ? `৳${fin.paidAmount.toLocaleString()} (Verified)`
                            : `৳0 (৳${fin.rawSubmittedAmount.toLocaleString()} Pending)`}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-zinc-200/80 dark:border-zinc-800/80 text-sm font-bold">
                        <span className="text-zinc-700 dark:text-zinc-300">
                          Effective Due
                        </span>
                        <span
                          className={
                            fin.dueAmount > 0
                              ? "text-rose-600 dark:text-rose-400 font-bold"
                              : "text-emerald-600 dark:text-emerald-400 font-bold"
                          }
                        >
                          ৳{fin.dueAmount.toLocaleString()}
                        </span>
                      </div>
                    </>
                  );
                })()}

                <div className="flex justify-between py-1.5 border-b border-zinc-200/80 dark:border-zinc-800/80">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    Payment Channel
                  </span>
                  <span className="font-semibold uppercase text-zinc-800 dark:text-zinc-200">
                    {selectedRecord.payment_method === "bkash"
                      ? "bKash"
                      : "Cash Collection"}
                  </span>
                </div>

                {selectedRecord.payment_method === "bkash" ? (
                  <>
                    {selectedRecord.bkash_sender_number && (
                      <div className="flex justify-between py-1.5 border-b border-zinc-200/80 dark:border-zinc-800/80">
                        <span className="text-zinc-500 dark:text-zinc-400">
                          bKash Sender
                        </span>
                        <span>{selectedRecord.bkash_sender_number}</span>
                      </div>
                    )}
                    {selectedRecord.bkash_transaction_id && (
                      <div className="flex justify-between py-1.5 border-b border-zinc-200/80 dark:border-zinc-800/80">
                        <span className="text-zinc-500 dark:text-zinc-400">
                          Transaction ID
                        </span>
                        <span className="font-mono font-bold text-pink-600 dark:text-pink-400">
                          {selectedRecord.bkash_transaction_id}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between py-1.5 border-b border-zinc-200/80 dark:border-zinc-800/80">
                      <span className="text-zinc-500 dark:text-zinc-400">
                        Recipient Coordinator
                      </span>
                      <span className="font-bold text-violet-600 dark:text-violet-400">
                        Ayon (Official bKash)
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between py-1.5 border-b border-zinc-200/80 dark:border-zinc-800/80">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Paid To Coordinator
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {selectedRecord.cash_paid_to || "Unassigned"}
                    </span>
                  </div>
                )}

                <div className="flex justify-between py-1.5 border-b border-zinc-200/80 dark:border-zinc-800/80">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    Current Status
                  </span>
                  <div>
                    {selectedRecord.payment_status === "verified" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        Verified
                        {selectedRecord.verified_by &&
                          ` by ${selectedRecord.verified_by}`}
                      </span>
                    ) : selectedRecord.payment_status === "rejected" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                        <XCircle className="w-3 h-3" />
                        Rejected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        <Clock className="w-3 h-3" />
                        Pending Approval
                      </span>
                    )}
                  </div>
                </div>

                {selectedRecord.special_notes && (
                  <div className="py-2 border-b border-zinc-200/80 dark:border-zinc-800/80">
                    <span className="text-zinc-500 dark:text-zinc-400 block mb-1">
                      Special Notes
                    </span>
                    <p className="bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-xl border border-zinc-200/70 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300">
                      {selectedRecord.special_notes}
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-2">
                {canApproveRecord(selectedRecord) ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {selectedRecord.payment_status !== "verified" && (
                        <button
                          type="button"
                          disabled={actionInProgress === selectedRecord.id}
                          onClick={() =>
                            handleUpdateStatus(selectedRecord.id, "verified")
                          }
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition cursor-pointer shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Verify Payment
                        </button>
                      )}

                      {selectedRecord.payment_status !== "rejected" && (
                        <button
                          type="button"
                          disabled={actionInProgress === selectedRecord.id}
                          onClick={() =>
                            handleUpdateStatus(selectedRecord.id, "rejected")
                          }
                          className="px-4 py-2 rounded-xl bg-red-600/10 hover:bg-red-600/20 text-red-600 dark:text-red-400 font-bold transition cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                        >
                          <X className="w-3.5 h-3.5" />
                          Reject Payment
                        </button>
                      )}

                      {selectedRecord.payment_status !== "pending" && (
                        <button
                          type="button"
                          disabled={actionInProgress === selectedRecord.id}
                          onClick={() =>
                            handleUpdateStatus(selectedRecord.id, "pending")
                          }
                          className="px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold transition cursor-pointer disabled:opacity-50"
                        >
                          Revert to Pending
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-zinc-400 shrink-0" />
                    <span>
                      This payment was collected by{" "}
                      <strong className="text-zinc-800 dark:text-zinc-200">
                        {selectedRecord.payment_method === "bkash"
                          ? "Ayon"
                          : selectedRecord.cash_paid_to || "another coordinator"}
                      </strong>
                      . Only that coordinator is authorized to approve this
                      transaction.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
