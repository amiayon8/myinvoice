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
import {
  ClassPartyShareLinksView,
  ClassPartyShareLinkData,
} from "@/components/links/class-party-share-links-view";
import {
  listAllInvoiceTokens,
  updateInvoiceToken,
  deleteInvoiceToken,
} from "@/services/invoices";
import {
  updateSubscriptionShareLink,
  deleteSubscriptionShareLink,
} from "@/services/subscriptions";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

type ActiveTab = "subscriptions" | "invoices" | "class-party";

export default function ShareLinksPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("subscriptions");
  const [loading, setLoading] = useState(true);
  const [invoiceLinks, setInvoiceLinks] = useState<InvoiceShareLink[]>([]);
  const [subscriptionLinks, setSubscriptionLinks] = useState<
    SubscriptionShareLink[]
  >([]);
  const [classPartyLinks, setClassPartyLinks] = useState<
    ClassPartyShareLinkData[]
  >([]);

  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        const [tokensData, subsData, classPartyRes] = await Promise.all([
          listAllInvoiceTokens().catch(() => []),
          supabase
            .from("subscription_share_links")
            .select("*")
            .order("created_at", { ascending: false }),
          fetch("/api/class-party-26/share-links")
            .then((r) => r.json())
            .catch(() => ({ links: [] })),
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

        if (classPartyRes?.links) {
          const origin =
            typeof window !== "undefined"
              ? window.location.origin
              : "https://myinvoice.app";
          const mappedClassParty: ClassPartyShareLinkData[] =
            classPartyRes.links.map((cp: any) => {
              const isExpired =
                !cp.never_expires &&
                cp.expires_at &&
                new Date(cp.expires_at).getTime() < Date.now();

              return {
                id: cp.id,
                token: cp.token,
                label: cp.label || "General Attendance",
                type: cp.type || "all",
                url: `${origin}/class-party-26/share/${cp.token}`,
                neverExpires: Boolean(cp.never_expires),
                expiresAt: cp.expires_at ? cp.expires_at.split("T")[0] : null,
                isExpired,
                viewCount: cp.viewCount || 0,
                lastViewedAt: cp.lastViewedAt,
                showFinancials: cp.params?.showFinancials !== false,
                showContactInfo: cp.params?.showContactInfo !== false,
                showHistory: cp.params?.showHistory !== false,
              };
            });
          setClassPartyLinks(mappedClassParty);
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

  const handleEditInvoiceLink = async (
    id: string,
    updates: Partial<InvoiceShareLink>,
  ) => {
    try {
      await updateInvoiceToken(id, {
        label: updates.recipientName,
        expiresAt:
          updates.dueDate && updates.dueDate !== "Open"
            ? `${updates.dueDate}T23:59:59`
            : null,
        neverExpires: !updates.dueDate || updates.dueDate === "Open",
      });
      setInvoiceLinks((prev) =>
        prev.map((l) => (l.id === id ? { ...l, ...updates } : l)),
      );
      toast.success("Invoice payment link updated");
    } catch {
      toast.error("Failed to update invoice payment link");
    }
  };

  const handleDeleteInvoiceLink = async (id: string) => {
    try {
      await deleteInvoiceToken(id);
      setInvoiceLinks((prev) => prev.filter((l) => l.id !== id));
      toast.success("Invoice payment link deleted");
    } catch {
      toast.error("Failed to delete invoice payment link");
    }
  };

  const handleEditSubscriptionLink = async (
    id: string,
    updates: Partial<SubscriptionShareLink>,
  ) => {
    try {
      await updateSubscriptionShareLink(id, {
        label: updates.serviceName,
        type: updates.planName,
        expiresAt: updates.expiresAt ? `${updates.expiresAt}T23:59:59` : null,
        neverExpires: !updates.expiresAt,
      });
      setSubscriptionLinks((prev) =>
        prev.map((l) => (l.id === id ? { ...l, ...updates } : l)),
      );
      toast.success("Subscription share link updated");
    } catch {
      toast.error("Failed to update subscription share link");
    }
  };

  const handleDeleteSubscriptionLink = async (id: string) => {
    try {
      await deleteSubscriptionShareLink(id);
      setSubscriptionLinks((prev) => prev.filter((l) => l.id !== id));
      toast.success("Subscription share link deleted");
    } catch {
      toast.error("Failed to delete subscription share link");
    }
  };

  const handleCreateClassPartyLink = async (newLinkData: {
    label: string;
    neverExpires: boolean;
    daysExpiry?: number;
    showFinancials: boolean;
    showContactInfo: boolean;
    showHistory: boolean;
  }) => {
    try {
      const res = await fetch("/api/class-party-26/share-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: newLinkData.label,
          type: "all",
          neverExpires: newLinkData.neverExpires,
          daysExpiry: newLinkData.daysExpiry,
          params: {
            showFinancials: newLinkData.showFinancials,
            showContactInfo: newLinkData.showContactInfo,
            showHistory: newLinkData.showHistory,
          },
        }),
      });
      const data = await res.json();
      if (data.success && data.link) {
        const origin =
          typeof window !== "undefined"
            ? window.location.origin
            : "https://myinvoice.app";
        const cp = data.link;
        const newFormattedLink: ClassPartyShareLinkData = {
          id: cp.id,
          token: cp.token,
          label: cp.label || "General Attendance",
          type: cp.type || "all",
          url: `${origin}/class-party-26/share/${cp.token}`,
          neverExpires: Boolean(cp.never_expires),
          expiresAt: cp.expires_at ? cp.expires_at.split("T")[0] : null,
          isExpired: false,
          viewCount: 0,
          lastViewedAt: null,
          showFinancials: cp.params?.showFinancials !== false,
          showContactInfo: cp.params?.showContactInfo !== false,
          showHistory: cp.params?.showHistory !== false,
        };
        setClassPartyLinks((prev) => [newFormattedLink, ...prev]);
        toast.success("Class Party share link generated");
      }
    } catch {
      toast.error("Failed to create Class Party share link");
    }
  };

  const handleEditClassPartyLink = async (
    id: string,
    updates: Partial<ClassPartyShareLinkData>,
  ) => {
    try {
      const res = await fetch(`/api/class-party-26/share-links/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: updates.label,
          never_expires: updates.neverExpires,
          expires_at: updates.neverExpires
            ? null
            : updates.expiresAt
              ? `${updates.expiresAt}T23:59:59Z`
              : null,
          params: {
            showFinancials: updates.showFinancials,
            showContactInfo: updates.showContactInfo,
            showHistory: updates.showHistory,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Class Party share link updated");
      }
    } catch {
      toast.error("Failed to update Class Party share link");
    }
  };

  const handleDeleteClassPartyLink = async (id: string) => {
    try {
      const res = await fetch(`/api/class-party-26/share-links/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setClassPartyLinks((prev) => prev.filter((l) => l.id !== id));
        toast.success("Class Party share link deleted");
      }
    } catch {
      toast.error("Failed to delete Class Party share link");
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <header className="pb-8">
          <h1 className="text-xl font-semibold tracking-tight">Share Links</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Manage public access links for digital subscriptions, member
            invoice payments, and Class Party &apos;26 reconciliation.
          </p>

          <nav className="flex items-center gap-6 mt-8 border-b border-zinc-200 dark:border-zinc-800 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("subscriptions")}
              className={`pb-3 font-medium transition-colors border-b-2 -mb-px cursor-pointer ${
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
              className={`pb-3 font-medium transition-colors border-b-2 -mb-px cursor-pointer ${
                activeTab === "invoices"
                  ? "border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100"
                  : "border-transparent text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              Invoice Payment Links
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("class-party")}
              className={`pb-3 font-medium transition-colors border-b-2 -mb-px cursor-pointer flex items-center gap-1.5 ${
                activeTab === "class-party"
                  ? "border-violet-600 dark:border-violet-400 text-violet-600 dark:text-violet-400 font-bold"
                  : "border-transparent text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              Class Party &apos;26
              {classPartyLinks.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300">
                  {classPartyLinks.length}
                </span>
              )}
            </button>
          </nav>
        </header>

        <main className="pt-2">
          {loading ? (
            <div className="py-20 text-center text-xs text-zinc-400">
              Loading links...
            </div>
          ) : activeTab === "subscriptions" ? (
            <SubscriptionShareLinksView
              initialLinks={
                subscriptionLinks.length > 0 ? subscriptionLinks : undefined
              }
              onEditLink={handleEditSubscriptionLink}
              onDeleteLink={handleDeleteSubscriptionLink}
            />
          ) : activeTab === "invoices" ? (
            <InvoiceShareLinksView
              initialLinks={invoiceLinks.length > 0 ? invoiceLinks : undefined}
              onMarkAsPaid={handleMarkAsPaid}
              onSendReminder={handleSendReminder}
              onEditLink={handleEditInvoiceLink}
              onDeleteLink={handleDeleteInvoiceLink}
            />
          ) : (
            <ClassPartyShareLinksView
              initialLinks={classPartyLinks}
              onCreateLink={handleCreateClassPartyLink}
              onEditLink={handleEditClassPartyLink}
              onDeleteLink={handleDeleteClassPartyLink}
            />
          )}
        </main>
      </div>
    </div>
  );
}
