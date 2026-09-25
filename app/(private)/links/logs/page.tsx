"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { listAllInvoiceViewLogs } from "@/services/invoices";
import { getSubscriptionViewLogs } from "@/services/subscriptions";
import { useToast } from "@/components/ui/toast";
import { RotateCw, Search } from "lucide-react";

interface ActivityLogItem {
  id: string;
  timestamp: string;
  category: "view" | "payment" | "warning";
  actor: string;
  action: string;
  details?: string;
  ipAddress?: string;
  contextTitle?: string;
  contextHref?: string;
  badge?: {
    text: string;
    variant: "danger" | "warning" | "muted";
  };
  isWarningOrError: boolean;
  isBot?: boolean;
}

function getDateGroupKey(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "Unknown Date";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const logDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffTime = today.getTime() - logDay.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays > 1 && diffDays < 7) {
    return date.toLocaleDateString(undefined, { weekday: "long" });
  }

  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(timestampStr: string): string {
  const date = new Date(timestampStr);
  if (isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default function ActivityLogsPage() {
  const toast = useToast();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [hideCrawlers, setHideCrawlers] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<
    "all" | "view" | "payment" | "warning"
  >("all");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        invoiceLogsRes,
        subLogsRes,
        invoicePaymentsRes,
        subPaymentsRes,
        updateRequestsRes,
      ] = await Promise.all([
        listAllInvoiceViewLogs().catch(() => []),
        getSubscriptionViewLogs().catch(() => []),
        supabase
          .from("invoice_payments")
          .select(
            "id, amount, payment_date, payment_method, notes, invoice:invoices(invoice_number, client:clients(name))",
          )
          .order("payment_date", { ascending: false })
          .limit(100),
        supabase
          .from("subscription_payments")
          .select(
            "id, amount, payment_date, notes, subscription:subscriptions(user:subscription_users(name), plan:subscription_plans(name))",
          )
          .order("payment_date", { ascending: false })
          .limit(100),
        supabase
          .from("payment_update_requests")
          .select(
            "id, type, invoice_number, client_name, transaction_id, amount, status, admin_notes, submitted_at",
          )
          .order("submitted_at", { ascending: false })
          .limit(50),
      ]);

      const unified: ActivityLogItem[] = [];

      (invoiceLogsRes || []).forEach((log: any) => {
        const invoiceNum = log.invoice?.invoice_number || "Invoice";
        const clientName = log.invoice?.client?.name;
        const userAgent = (log.user_agent || "").toLowerCase();
        const isBot =
          userAgent.includes("facebookexternalhit") ||
          userAgent.includes("bot") ||
          userAgent.includes("crawler") ||
          userAgent.includes("spider") ||
          userAgent.includes("preview");

        let actor = clientName || "Visitor";
        let action = `Viewed invoice ${invoiceNum}`;
        let badge: ActivityLogItem["badge"] = undefined;

        if (isBot) {
          actor =
            log.browser === "Unknown" ? "Web Crawler" : `${log.browser} Crawler`;
          action = `Scanned link preview for invoice ${invoiceNum}`;
          badge = { text: "Bot", variant: "muted" };
        } else if (
          log.referrer &&
          log.referrer.toLowerCase().includes("instagram")
        ) {
          actor = clientName || "Visitor via Instagram";
        }

        const detailsParts: string[] = [];
        if (log.browser && log.browser !== "Unknown")
          detailsParts.push(log.browser);
        if (log.os && log.os !== "Unknown") detailsParts.push(log.os);
        if (log.ip_address && log.ip_address !== "::1")
          detailsParts.push(log.ip_address);
        else if (log.ip_address === "::1") detailsParts.push("Localhost");

        unified.push({
          id: `inv-view-${log.id}`,
          timestamp: log.viewed_at,
          category: "view",
          actor,
          action,
          details: detailsParts.join(" · ") || undefined,
          ipAddress: log.ip_address || undefined,
          contextTitle: invoiceNum,
          contextHref: `/invoices`,
          badge,
          isWarningOrError: false,
          isBot,
        });
      });

      (subLogsRes || []).forEach((log: any) => {
        const label = log.token?.label || "Shared link";
        const userAgent = (log.user_agent || "").toLowerCase();
        const isBot =
          userAgent.includes("facebookexternalhit") ||
          userAgent.includes("bot") ||
          userAgent.includes("crawler") ||
          userAgent.includes("spider") ||
          userAgent.includes("preview");

        let actor = "Visitor";
        let action = `Accessed subscription link "${label}"`;
        let badge: ActivityLogItem["badge"] = undefined;

        if (isBot) {
          actor =
            log.browser === "Unknown" ? "Web Crawler" : `${log.browser} Crawler`;
          action = `Scanned link preview for "${label}"`;
          badge = { text: "Bot", variant: "muted" };
        }

        const detailsParts: string[] = [];
        if (log.browser && log.browser !== "Unknown")
          detailsParts.push(log.browser);
        if (log.os && log.os !== "Unknown") detailsParts.push(log.os);
        if (log.ip_address && log.ip_address !== "::1")
          detailsParts.push(log.ip_address);

        unified.push({
          id: `sub-view-${log.id}`,
          timestamp: log.viewed_at,
          category: "view",
          actor,
          action,
          details: detailsParts.join(" · ") || undefined,
          ipAddress: log.ip_address || undefined,
          contextTitle: label,
          contextHref: `/subscriptions`,
          badge,
          isWarningOrError: false,
          isBot,
        });
      });

      ((invoicePaymentsRes && invoicePaymentsRes.data) || []).forEach(
        (pay: any) => {
          const invoiceNum = pay.invoice?.invoice_number || "Invoice";
          const clientName = pay.invoice?.client?.name || "Client";
          const amountNum = Number(pay.amount) || 0;
          const methodClean = (pay.payment_method || "Payment").replace(
            "_",
            " ",
          );

          unified.push({
            id: `inv-pay-${pay.id}`,
            timestamp: pay.payment_date,
            category: "payment",
            actor: clientName,
            action: `Received ৳${amountNum.toLocaleString()} payment for ${invoiceNum}`,
            details: `${methodClean}${pay.notes ? ` · ${pay.notes}` : ""}`,
            contextTitle: invoiceNum,
            contextHref: `/invoices`,
            isWarningOrError: false,
          });
        },
      );

      ((subPaymentsRes && subPaymentsRes.data) || []).forEach((pay: any) => {
        const memberName = pay.subscription?.user?.name || "Member";
        const planName = pay.subscription?.plan?.name || "Subscription";
        const amountNum = Number(pay.amount) || 0;

        unified.push({
          id: `sub-pay-${pay.id}`,
          timestamp: pay.payment_date,
          category: "payment",
          actor: memberName,
          action: `Logged ৳${amountNum.toLocaleString()} payment for ${planName}`,
          details: pay.notes || undefined,
          contextTitle: planName,
          contextHref: `/subscriptions`,
          isWarningOrError: false,
        });
      });

      ((updateRequestsRes && updateRequestsRes.data) || []).forEach(
        (req: any) => {
          const isRejected = req.status === "rejected";
          const isPending = req.status === "pending";
          const amountNum = Number(req.amount) || 0;
          const target = req.invoice_number || "Invoice";

          unified.push({
            id: `req-${req.id}`,
            timestamp: req.submitted_at,
            category: isRejected || isPending ? "warning" : "payment",
            actor: req.client_name || "Client",
            action: isRejected
              ? `Payment verification rejected for ${target}`
              : isPending
                ? `Submitted payment verification of ৳${amountNum.toLocaleString()}`
                : `Verified payment of ৳${amountNum.toLocaleString()} for ${target}`,
            details: `Txn: ${req.transaction_id || "—"}${req.admin_notes ? ` · ${req.admin_notes}` : ""}`,
            contextTitle: target,
            contextHref: `/invoices`,
            badge: isRejected
              ? { text: "Rejected", variant: "danger" }
              : isPending
                ? { text: "Pending Review", variant: "warning" }
                : undefined,
            isWarningOrError: isRejected || isPending,
          });
        },
      );

      unified.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );

      setLogs(unified);
    } catch (err: any) {
      toast.error("Failed to load activity logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredItems = useMemo(() => {
    return logs.filter((item) => {
      if (hideCrawlers && item.isBot) return false;
      if (categoryFilter === "view" && item.category !== "view") return false;
      if (categoryFilter === "payment" && item.category !== "payment")
        return false;
      if (categoryFilter === "warning" && !item.isWarningOrError) return false;

      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();

      return (
        item.actor.toLowerCase().includes(query) ||
        item.action.toLowerCase().includes(query) ||
        (item.details && item.details.toLowerCase().includes(query)) ||
        (item.ipAddress && item.ipAddress.toLowerCase().includes(query)) ||
        (item.contextTitle && item.contextTitle.toLowerCase().includes(query))
      );
    });
  }, [logs, hideCrawlers, categoryFilter, searchQuery]);

  const groupedLogs = useMemo(() => {
    const groups: { dateGroup: string; items: ActivityLogItem[] }[] = [];
    const groupMap = new Map<string, ActivityLogItem[]>();

    filteredItems.forEach((item) => {
      const key = getDateGroupKey(item.timestamp);
      if (!groupMap.has(key)) {
        groupMap.set(key, []);
      }
      groupMap.get(key)!.push(item);
    });

    groupMap.forEach((items, dateGroup) => {
      groups.push({ dateGroup, items });
    });

    return groups;
  }, [filteredItems]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-6 lg:p-10 space-y-6 font-sans">
        <div className="h-6 w-36 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded" />
        <div className="space-y-2 pt-4">
          <div className="h-10 bg-zinc-100 dark:bg-zinc-900 animate-pulse rounded" />
          <div className="h-10 bg-zinc-100 dark:bg-zinc-900 animate-pulse rounded" />
          <div className="h-10 bg-zinc-100 dark:bg-zinc-900 animate-pulse rounded" />
          <div className="h-10 bg-zinc-100 dark:bg-zinc-900 animate-pulse rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 lg:p-10 space-y-6 font-sans text-zinc-900 dark:text-zinc-100">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-sm font-semibold tracking-tight">
            Activity Logs
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Audit history of link access, views, and payments.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchData}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RotateCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search actor, action, IP, or invoice..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none focus:border-zinc-900 dark:focus:border-zinc-100 font-sans"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <label className="inline-flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hideCrawlers}
              onChange={(e) => setHideCrawlers(e.target.checked)}
              className="rounded-none border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 accent-zinc-900 dark:accent-zinc-100 focus:ring-0 cursor-pointer h-3.5 w-3.5"
            />
            <span>Hide web crawlers</span>
          </label>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 outline-none focus:border-zinc-900 dark:focus:border-zinc-100 cursor-pointer"
          >
            <option value="all">All activities</option>
            <option value="view">Views only</option>
            <option value="payment">Payments only</option>
            <option value="warning">Warnings & issues</option>
          </select>

          <span className="font-mono text-[11px] text-zinc-400 dark:text-zinc-500 shrink-0">
            {filteredItems.length}{" "}
            {filteredItems.length === 1 ? "entry" : "entries"}
          </span>
        </div>
      </div>

      <div className="space-y-8 pt-2">
        {groupedLogs.map(({ dateGroup, items }) => (
          <section key={dateGroup} className="space-y-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-1">
              {dateGroup}
            </h2>

            <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-850">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="py-2.5 px-3.5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors text-xs"
                >
                  <div className="flex items-baseline gap-3 min-w-0 flex-1">
                    <span className="font-mono text-[11px] text-zinc-400 dark:text-zinc-500 shrink-0 select-none">
                      {formatTime(item.timestamp)}
                    </span>

                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 min-w-0">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100 shrink-0">
                        {item.actor}
                      </span>
                      <span className="text-zinc-700 dark:text-zinc-300">
                        {item.action}
                      </span>
                      {item.contextHref && item.contextTitle && (
                        <a
                          href={item.contextHref}
                          className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 underline decoration-zinc-300 dark:decoration-zinc-700 underline-offset-2 transition-colors"
                        >
                          {item.contextTitle}
                        </a>
                      )}
                      {item.badge && (
                        <span
                          className={`inline-block px-1.5 py-0.2 text-[10px] font-medium ${
                            item.badge.variant === "danger"
                              ? "text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900"
                              : item.badge.variant === "warning"
                                ? "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900"
                                : "text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                          }`}
                        >
                          {item.badge.text}
                        </span>
                      )}
                    </div>
                  </div>

                  {item.details && (
                    <span className="font-mono text-[11px] text-zinc-400 dark:text-zinc-500 shrink-0 sm:text-right">
                      {item.details}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}

        {filteredItems.length === 0 && (
          <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-12 text-center">
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              No activity logs found.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
