"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/toast";
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
  Share2,
  Copy,
  ExternalLink,
  Plus,
  Radio,
  History,
  ShieldCheck,
  UserCheck,
  Calendar,
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

interface ShareLinkItem {
  id: string;
  token: string;
  label: string | null;
  type: string;
  params: {
    showFinancials?: boolean;
    showContactInfo?: boolean;
    showHistory?: boolean;
  };
  expires_at: string | null;
  never_expires: boolean;
  revoked_at: string | null;
  created_at: string;
  viewCount?: number;
  lastViewedAt?: string | null;
}

interface ActivityEvent {
  id: string;
  category: "registration" | "payment" | "status" | "edit" | "delete" | "view";
  actor: string;
  action: string;
  details?: string;
  record_id?: string;
  participant_name?: string;
  created_at: string;
}

interface ViewLogEntry {
  id: string;
  token_id: string;
  ip_address?: string;
  user_agent?: string;
  browser?: string;
  os?: string;
  device?: string;
  referrer?: string;
  viewed_at: string;
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

export default function ClassPartyPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [coordinatorFilter, setCoordinatorFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecord, setSelectedRecord] =
    useState<RegistrationRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<RegistrationRecord | null>(
    null,
  );
  const [deletingRecord, setDeletingRecord] =
    useState<RegistrationRecord | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const [realtimePulse, setRealtimePulse] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareLinks, setShareLinks] = useState<ShareLinkItem[]>([]);
  const [loadingShareLinks, setLoadingShareLinks] = useState(false);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newLinkNeverExpires, setNewLinkNeverExpires] = useState(true);
  const [newLinkDays, setNewLinkDays] = useState("30");
  const [newLinkShowFinancials, setNewLinkShowFinancials] = useState(true);
  const [newLinkShowContactInfo, setNewLinkShowContactInfo] = useState(true);
  const [newLinkShowHistory, setNewLinkShowHistory] = useState(true);
  const [creatingLink, setCreatingLink] = useState(false);

  const [editingShareLink, setEditingShareLink] =
    useState<ShareLinkItem | null>(null);

  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [activityLogs, setActivityLogs] = useState<ActivityEvent[]>([]);
  const [viewLogs, setViewLogs] = useState<ViewLogEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeHistoryTab, setActiveHistoryTab] = useState<
    "activities" | "views"
  >("activities");

  const [sqlModalOpen, setSqlModalOpen] = useState(false);

  const fetchRegistrations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (methodFilter !== "all") params.set("method", methodFilter);
      if (coordinatorFilter !== "all") params.set("coordinator", coordinatorFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/class-party-26/admin?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setRegistrations(data.registrations || []);
        setStats(data.stats || null);
        setLastRefreshedAt(new Date());
      } else {
        toast.error("Failed to load registrations");
      }
    } catch (error) {
      console.error(error);
      toast.error("Network error fetching registrations");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, methodFilter, coordinatorFilter, searchQuery, toast]);

  const fetchShareLinks = useCallback(async () => {
    setLoadingShareLinks(true);
    try {
      const res = await fetch("/api/class-party-26/share-links");
      const data = await res.json();
      if (data.success) {
        setShareLinks(data.links || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingShareLinks(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/class-party-26/history");
      const data = await res.json();
      if (data.success) {
        setActivityLogs(data.activities || []);
        setViewLogs(data.viewLogs || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  useEffect(() => {
    fetchShareLinks();
  }, [fetchShareLinks]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("class-party-26-admin-live")
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
          fetchRegistrations();
          fetchShareLinks();
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
          fetchHistory();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRegistrations, fetchShareLinks, fetchHistory]);

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

  const handleCreateShareLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingLink(true);
    try {
      const res = await fetch("/api/class-party-26/share-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: newLinkLabel.trim() || undefined,
          type: "all",
          neverExpires: newLinkNeverExpires,
          daysExpiry: newLinkNeverExpires ? undefined : Number(newLinkDays),
          params: {
            showFinancials: newLinkShowFinancials,
            showContactInfo: newLinkShowContactInfo,
            showHistory: newLinkShowHistory,
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Sharable access link generated");
        setNewLinkLabel("");
        fetchShareLinks();
      } else {
        toast.error(data.message || "Failed to generate link");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error creating share link");
    } finally {
      setCreatingLink(false);
    }
  };

  const handleSaveEditShareLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShareLink) return;

    try {
      const res = await fetch(
        `/api/class-party-26/share-links/${editingShareLink.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: editingShareLink.label,
            never_expires: editingShareLink.never_expires,
            expires_at: editingShareLink.never_expires
              ? null
              : editingShareLink.expires_at,
            params: editingShareLink.params,
          }),
        },
      );

      const data = await res.json();
      if (data.success) {
        toast.success("Share link configuration updated");
        setEditingShareLink(null);
        fetchShareLinks();
      } else {
        toast.error(data.message || "Failed to update link");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error saving link changes");
    }
  };

  const handleDeleteShareLink = async (id: string) => {
    try {
      const res = await fetch(`/api/class-party-26/share-links/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Share link revoked and deleted");
        fetchShareLinks();
      } else {
        toast.error(data.message || "Failed to delete link");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error deleting link");
    }
  };

  const handleCopyLink = (link: ShareLinkItem) => {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://myinvoice.app";
    const fullUrl = `${origin}/class-party-26/share/${link.token}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLinkId(link.id);
    toast.success("Shareable URL copied to clipboard");
    setTimeout(() => {
      setCopiedLinkId(null);
    }, 2500);
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
            onClick={() => setShareModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition cursor-pointer shadow-xs"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share Links
            {shareLinks.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-bold">
                {shareLinks.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setHistoryModalOpen(true);
              fetchHistory();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer shadow-xs"
          >
            <History className="w-3.5 h-3.5 text-violet-500" />
            Activity & History
          </button>

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
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
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
            <div className="text-[11px] text-zinc-500">
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
            <div className="text-[11px] text-zinc-500">
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

      <ClassPartyCharts registrations={registrations} showFinancials={true} />

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
                        <div className="text-[11px] text-zinc-500">
                          ID: {record.student_id}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-zinc-700 dark:text-zinc-300">
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

                    <td className="py-3.5 px-4 text-xs">
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

                    <td className="py-3.5 px-4 font-bold text-amber-600 dark:text-amber-400">
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

      {shareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-violet-500" />
                  Manage Share Links (Realtime & Logged)
                </h2>
                <p className="text-xs text-zinc-500">
                  Generate multiple labeled links for participants,
                  coordinators, or partners. Every link visit is tracked and
                  views are logged.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShareModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleCreateShareLink}
              className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 space-y-3"
            >
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-violet-500" />
                Generate New Share Link
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Link Label (e.g., Subscriptions-style tag)
                  </label>
                  <input
                    type="text"
                    value={newLinkLabel}
                    onChange={(e) => setNewLinkLabel(e.target.value)}
                    placeholder="e.g. Batch 2026, Ayon Group, Public Preview"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Expiration
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer text-zinc-700 dark:text-zinc-300">
                      <input
                        type="checkbox"
                        checked={newLinkNeverExpires}
                        onChange={(e) =>
                          setNewLinkNeverExpires(e.target.checked)
                        }
                        className="rounded text-violet-600"
                      />
                      Never expires
                    </label>

                    {!newLinkNeverExpires && (
                      <div className="flex items-center gap-1 ml-auto">
                        <input
                          type="number"
                          min="1"
                          max="365"
                          value={newLinkDays}
                          onChange={(e) => setNewLinkDays(e.target.value)}
                          className="w-16 px-2 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-xs"
                        />
                        <span className="text-[11px] text-zinc-500">days</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-zinc-600 dark:text-zinc-400">
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newLinkShowFinancials}
                    onChange={(e) => setNewLinkShowFinancials(e.target.checked)}
                    className="rounded text-violet-600"
                  />
                  Include Financial Breakdown
                </label>

                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newLinkShowContactInfo}
                    onChange={(e) =>
                      setNewLinkShowContactInfo(e.target.checked)
                    }
                    className="rounded text-violet-600"
                  />
                  Include Contact Details
                </label>

                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newLinkShowHistory}
                    onChange={(e) => setNewLinkShowHistory(e.target.checked)}
                    className="rounded text-violet-600"
                  />
                  Include Activity History Feed
                </label>

                <button
                  type="submit"
                  disabled={creatingLink}
                  className="ml-auto px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold transition cursor-pointer shadow-xs disabled:opacity-50"
                >
                  Create Link
                </button>
              </div>
            </form>

            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Active Generated Links ({shareLinks.length})
              </h3>

              {loadingShareLinks ? (
                <div className="py-8 text-center text-xs text-zinc-400">
                  Loading links...
                </div>
              ) : shareLinks.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-500 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  No share links generated yet. Create one above to share with
                  attendees or coordinators.
                </div>
              ) : (
                <div className="divide-y divide-zinc-200 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                  {shareLinks.map((link) => {
                    const origin =
                      typeof window !== "undefined"
                        ? window.location.origin
                        : "https://myinvoice.app";
                    const fullUrl = `${origin}/class-party-26/share/${link.token}`;
                    const isCopied = copiedLinkId === link.id;

                    return (
                      <div
                        key={link.id}
                        className="p-3.5 bg-white dark:bg-zinc-900 hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-zinc-900 dark:text-zinc-100">
                              {link.label || "Class Party Public Share"}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                              {link.never_expires
                                ? "Never expires"
                                : link.expires_at
                                  ? `Expires ${new Date(link.expires_at).toLocaleDateString()}`
                                  : "Active"}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                            <span className="flex items-center gap-1 font-semibold text-violet-600 dark:text-violet-400">
                              <Eye className="w-3.5 h-3.5" />
                              {link.viewCount || 0} views logged
                            </span>
                            {link.lastViewedAt && (
                              <span>
                                Last viewed{" "}
                                {formatRelativeTime(link.lastViewedAt)}
                              </span>
                            )}
                            <span className="truncate max-w-xs  text-[10px] text-zinc-400">
                              token: {link.token.slice(0, 10)}...
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopyLink(link)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 font-semibold transition cursor-pointer"
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                            {isCopied ? "Copied" : "Copy Link"}
                          </button>

                          <a
                            href={fullUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition"
                            title="Open Public Link"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>

                          <button
                            type="button"
                            onClick={() => setEditingShareLink({ ...link })}
                            className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 transition cursor-pointer"
                            title="Edit Link Configuration"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteShareLink(link.id)}
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 transition cursor-pointer"
                            title="Revoke / Delete Link"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {editingShareLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="font-bold text-sm">Edit Share Link</h3>
              <button
                type="button"
                onClick={() => setEditingShareLink(null)}
                className="p-1 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditShareLink} className="space-y-3">
              <div className="space-y-1">
                <label className="font-semibold">Label</label>
                <input
                  type="text"
                  value={editingShareLink.label || ""}
                  onChange={(e) =>
                    setEditingShareLink({
                      ...editingShareLink,
                      label: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800"
                />
              </div>

              <div className="space-y-2">
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingShareLink.never_expires}
                    onChange={(e) =>
                      setEditingShareLink({
                        ...editingShareLink,
                        never_expires: e.target.checked,
                      })
                    }
                    className="rounded text-violet-600"
                  />
                  Never expires
                </label>

                {!editingShareLink.never_expires && (
                  <div className="space-y-1">
                    <label className="font-semibold">Expiry Date</label>
                    <input
                      type="date"
                      value={
                        editingShareLink.expires_at
                          ? editingShareLink.expires_at.split("T")[0]
                          : ""
                      }
                      onChange={(e) =>
                        setEditingShareLink({
                          ...editingShareLink,
                          expires_at: e.target.value
                            ? `${e.target.value}T23:59:59Z`
                            : null,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1 pt-1">
                <label className="font-semibold">Permissions</label>
                <div className="space-y-1">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingShareLink.params.showFinancials !== false}
                      onChange={(e) =>
                        setEditingShareLink({
                          ...editingShareLink,
                          params: {
                            ...editingShareLink.params,
                            showFinancials: e.target.checked,
                          },
                        })
                      }
                      className="rounded text-violet-600"
                    />
                    Show Financial Breakdown
                  </label>
                </div>
                <div className="space-y-1">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={
                        editingShareLink.params.showContactInfo !== false
                      }
                      onChange={(e) =>
                        setEditingShareLink({
                          ...editingShareLink,
                          params: {
                            ...editingShareLink.params,
                            showContactInfo: e.target.checked,
                          },
                        })
                      }
                      className="rounded text-violet-600"
                    />
                    Show Contact Numbers
                  </label>
                </div>
                <div className="space-y-1">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingShareLink.params.showHistory !== false}
                      onChange={(e) =>
                        setEditingShareLink({
                          ...editingShareLink,
                          params: {
                            ...editingShareLink.params,
                            showHistory: e.target.checked,
                          },
                        })
                      }
                      className="rounded text-violet-600"
                    />
                    Show Live History Timeline
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingShareLink(null)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-violet-600 text-white font-semibold"
                >
                  Save Updates
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {historyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <History className="w-5 h-5 text-violet-500" />
                  Class Party &apos;26 Realtime Activity & View Logs
                </h2>
                <p className="text-xs text-zinc-500">
                  Detailed timeline of attendee updates, verifications, and link
                  viewer logs.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveHistoryTab("activities")}
                className={`pb-2.5 font-semibold border-b-2 -mb-px transition cursor-pointer flex items-center gap-1.5 ${
                  activeHistoryTab === "activities"
                    ? "border-violet-600 text-violet-600 dark:border-violet-400 dark:text-violet-400"
                    : "border-transparent text-zinc-500 hover:text-zinc-800"
                }`}
              >
                <UserCheck className="w-4 h-4" />
                Registrations & Payments ({activityLogs.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveHistoryTab("views")}
                className={`pb-2.5 font-semibold border-b-2 -mb-px transition cursor-pointer flex items-center gap-1.5 ${
                  activeHistoryTab === "views"
                    ? "border-violet-600 text-violet-600 dark:border-violet-400 dark:text-violet-400"
                    : "border-transparent text-zinc-500 hover:text-zinc-800"
                }`}
              >
                <Eye className="w-4 h-4" />
                Link Views & Access Logs ({viewLogs.length})
              </button>
            </div>

            {loadingHistory ? (
              <div className="py-12 text-center text-xs text-zinc-400">
                Loading history...
              </div>
            ) : activeHistoryTab === "activities" ? (
              <div className="space-y-3">
                {activityLogs.length === 0 ? (
                  <div className="py-12 text-center text-xs text-zinc-500">
                    No activity logs recorded yet.
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-200 dark:divide-zinc-800 max-h-96 overflow-y-auto">
                    {activityLogs.map((log) => (
                      <div
                        key={log.id}
                        className="py-3 flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                            <span>{log.action}</span>
                            {log.participant_name && (
                              <span className="font-bold text-violet-600 dark:text-violet-400">
                                ({log.participant_name})
                              </span>
                            )}
                          </div>
                          {log.details && (
                            <p className="text-[11px] text-zinc-500">
                              {log.details}
                            </p>
                          )}
                          <div className="text-[10px] text-zinc-400 flex items-center gap-2">
                            <span>Actor: {log.actor}</span>
                            <span>•</span>
                            <span>
                              {new Date(log.created_at).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <span className="text-[11px] text-zinc-400 shrink-0">
                          {formatRelativeTime(log.created_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {viewLogs.length === 0 ? (
                  <div className="py-12 text-center text-xs text-zinc-500">
                    No view logs recorded yet. Views will be logged when
                    participants open share links.
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-200 dark:divide-zinc-800 max-h-96 overflow-y-auto">
                    {viewLogs.map((view) => (
                      <div
                        key={view.id}
                        className="py-3 flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                            Visited shared portal
                          </div>
                          <div className="text-[11px] text-zinc-500 flex flex-wrap gap-2">
                            <span>Browser: {view.browser || "Unknown"}</span>
                            <span>OS: {view.os || "Unknown"}</span>
                            <span>Device: {view.device || "Desktop"}</span>
                            {view.ip_address && (
                              <span>IP: {view.ip_address}</span>
                            )}
                          </div>
                          <div className="text-[10px] text-zinc-400">
                            {new Date(view.viewed_at).toLocaleString()}
                          </div>
                        </div>

                        <span className="text-[11px] text-zinc-400 shrink-0">
                          {formatRelativeTime(view.viewed_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                  Edit Submission
                </h2>
                <p className="text-xs text-zinc-500">ID: {editingRecord.id}</p>
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
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden"
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
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden uppercase"
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

            <div className="space-y-3 py-2 text-xs">
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
    </div>
  );
}
