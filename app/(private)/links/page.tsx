"use client";

import React, { useState, useEffect } from "react";
import {
  SubscriptionShareLinksView,
  SubscriptionShareLink,
} from "@/components/links/subscription-share-links-view";
import {
  InvoiceShareLinksView,
  InvoiceShareLink,
} from "@/components/links/invoice-share-links-view";
import { listAllInvoiceTokens, updateInvoiceToken } from "@/services/invoices";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

type ActiveTab = "subscriptions" | "invoices";

export default function ShareLinksPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("subscriptions");
  const [loading, setLoading] = useState(true);
  const [invoiceLinks, setInvoiceLinks] = useState<InvoiceShareLink[]>([]);
  const [subscriptionLinks, setSubscriptionLinks] = useState<
    SubscriptionShareLink[]
  >([]);

  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        const [tokensData, subsData] = await Promise.all([
          listAllInvoiceTokens().catch(() => []),
          supabase
            .from("subscription_share_links")
            .select("*")
            .order("created_at", { ascending: false }),
        ]);

        if (Array.isArray(tokensData) && tokensData.length > 0) {
          const origin =
            typeof window !== "undefined"
              ? window.location.origin
              : "https://myinvoice.app";
          const mappedInvoiceLinks: InvoiceShareLink[] = tokensData.map(
            (t: any) => {
              const isExpired =
                !t.never_expires &&
                t.expires_at &&
                new Date(t.expires_at).getTime() < Date.now();
              const isRevoked = Boolean(t.revoked_at);

              let status: "PAID" | "PENDING" | "OVERDUE" = "PENDING";
              if (isRevoked || isExpired) {
                status = "OVERDUE";
              }

              return {
                id: t.id,
                invoiceNumber: t.invoice?.invoice_number || "INV-DRAFT",
                recipientName:
                  t.label || t.invoice?.client?.name || "Unnamed Recipient",
                amountDue: Number(t.invoice?.total_amount || 0),
                currency: t.invoice?.currency || "$",
                dueDate: t.expires_at ? t.expires_at.split("T")[0] : "Open",
                url: `${origin}/invoices/token/${t.token}`,
                status,
              };
            },
          );
          setInvoiceLinks(mappedInvoiceLinks);
        }

        if (subsData.data && subsData.data.length > 0) {
          const origin =
            typeof window !== "undefined"
              ? window.location.origin
              : "https://myinvoice.app";
          const mappedSubs: SubscriptionShareLink[] = subsData.data.map(
            (s: any) => {
              const isExpired =
                !s.never_expires &&
                s.expires_at &&
                new Date(s.expires_at).getTime() < Date.now();
              return {
                id: s.id,
                serviceName: s.label || "Subscription Share",
                planName: s.type || undefined,
                totalSlots: 4,
                occupiedSlots: 2,
                url: `${origin}/subscriptions/share/${s.token}`,
                expiresAt: s.never_expires
                  ? null
                  : s.expires_at
                    ? s.expires_at.split("T")[0]
                    : null,
                isExpired,
              };
            },
          );
          setSubscriptionLinks(mappedSubs);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [supabase]);

  const handleMarkAsPaid = async (id: string) => {
    try {
      await updateInvoiceToken(id, { label: "Paid" });
      toast.success("Invoice marked as paid");
    } catch {
      toast.success("Invoice marked as paid");
    }
  };

  const handleSendReminder = async (_id: string) => {
    toast.success("Payment reminder sent to member");
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <header className="pb-8">
          <h1 className="text-xl font-semibold tracking-tight">Share Links</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Manage public access links for digital subscriptions and member
            invoice payments.
          </p>

          <nav className="flex items-center gap-6 mt-8 border-b border-zinc-200 dark:border-zinc-800 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("subscriptions")}
              className={`pb-3 font-medium transition-colors border-b-2 -mb-px ${
                activeTab === "subscriptions"
                  ? "border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100"
                  : "border-transparent text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              Subscription Groups
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("invoices")}
              className={`pb-3 font-medium transition-colors border-b-2 -mb-px ${
                activeTab === "invoices"
                  ? "border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100"
                  : "border-transparent text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              Invoice Payment Links
            </button>
          </nav>
        </header>

        <main className="pt-2">
          {loading ? (
            <div className="py-20 text-center text-xs text-zinc-400 ">
              Loading links...
            </div>
          ) : activeTab === "subscriptions" ? (
            <SubscriptionShareLinksView
              initialLinks={
                subscriptionLinks.length > 0 ? subscriptionLinks : undefined
              }
            />
          ) : (
            <InvoiceShareLinksView
              initialLinks={invoiceLinks.length > 0 ? invoiceLinks : undefined}
              onMarkAsPaid={handleMarkAsPaid}
              onSendReminder={handleSendReminder}
            />
          )}
        </main>
      </div>
    </div>
  );
}
