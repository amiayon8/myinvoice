"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/supabase/client";
import { ClassPartyCharts } from "@/components/class-party/class-party-charts";
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
  vat_percent?: number;
  vat_amount?: number;
  subtotal_with_vat?: number;
  payment_method: "cash" | "bkash";
  bkash_fee_percent?: number;
  bkash_fee_amount?: number;
  total_payable?: number;
  bkash_sender_number?: string | null;
  bkash_transaction_id?: string | null;
  cash_paid_to?: string | null;
  special_notes?: string | null;
  payment_status: "pending" | "verified" | "rejected";
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
  totalRevenueExpected: number | null;
  totalRevenueVerified: number | null;
  bkashCount: number;
  cashCount: number;
  bkashTotal: number | null;
  cashTotal: number | null;
  menuCounts: Record<string, number>;
  coordinatorCounts: Record<
    string,
    {
      cashCount: number;
      cashTotal: number;
      bkashCount: number;
      bkashTotal: number;
      totalCount: number;
      totalAmount: number;
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
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [realtimePulse, setRealtimePulse] = useState(false);

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
      if (statusFilter !== "all" && record.payment_status !== statusFilter) {
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
                Verified
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
                <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                Verified Collection
              </span>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {stats.totalRevenueVerified !== null
                  ? `৳${stats.totalRevenueVerified.toLocaleString()}`
                  : "Private"}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1 shadow-xs">
              <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-pink-500" />
                bKash (Ayon)
              </span>
              <div className="text-xl font-bold text-pink-600 dark:text-pink-400">
                {stats.bkashCount}
              </div>
              {stats.bkashTotal !== null && (
                <div className="text-[11px] text-zinc-500">
                  ৳{stats.bkashTotal.toLocaleString()}
                </div>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1 shadow-xs">
              <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                <Banknote className="w-3.5 h-3.5 text-emerald-500" />
                Cash Total
              </span>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {stats.cashCount}
              </div>
              {stats.cashTotal !== null && (
                <div className="text-[11px] text-zinc-500">
                  ৳{stats.cashTotal.toLocaleString()}
                </div>
              )}
            </div>
          </div>
        )}

        {stats && stats.coordinatorCounts && (
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                <Banknote className="w-4 h-4 text-emerald-500" />
                Coordinator Collection Summary
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
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        ৳{data.totalAmount.toLocaleString()}
                      </span>
                    </div>

                    <div className="text-xs space-y-1 text-zinc-600 dark:text-zinc-400 pt-1 border-t border-zinc-200/60 dark:border-zinc-800/60">
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
                  <option value="verified">Verified</option>
                  <option value="pending">Pending</option>
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
                        <th className="py-3 px-4">Amount</th>
                      )}
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-zinc-200/80 dark:divide-zinc-800/80">
                    {filteredRegistrations.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
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

                          {linkMeta?.params.showFinancials !== false && (
                            <td className="py-3.5 px-4 font-bold text-amber-600 dark:text-amber-400">
                              ৳{record.total_payable || 0}
                            </td>
                          )}

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
      </div>
    </div>
  );
}
