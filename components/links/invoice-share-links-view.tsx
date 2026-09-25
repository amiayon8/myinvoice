"use client";

import React, { useState } from "react";
import {
  Copy,
  Check,
  Bell,
  CheckCircle2,
  Plus,
  ExternalLink,
  Filter,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

export type InvoicePaymentStatus = "PAID" | "PENDING" | "OVERDUE";

export interface InvoiceShareLink {
  id: string;
  invoiceNumber: string;
  recipientName: string;
  amountDue: number;
  currency: string;
  dueDate: string;
  url: string;
  status: InvoicePaymentStatus;
}

interface InvoiceShareLinksViewProps {
  initialLinks?: InvoiceShareLink[];
  onMarkAsPaid?: (id: string) => Promise<void> | void;
  onSendReminder?: (id: string) => Promise<void> | void;
  onCreateLink?: (
    newLink: Omit<InvoiceShareLink, "id">,
  ) => Promise<void> | void;
  onEditLink?: (
    id: string,
    updates: Partial<InvoiceShareLink>,
  ) => Promise<void> | void;
  onDeleteLink?: (id: string) => Promise<void> | void;
}

const DEFAULT_INVOICE_LINKS: InvoiceShareLink[] = [
  {
    id: "inv-link-1",
    invoiceNumber: "INV-2026-081",
    recipientName: "Sarah Jenkins",
    amountDue: 24.5,
    currency: "$",
    dueDate: "2026-09-20",
    url: "https://myinvoice.app/invoices/token/inv-tok-8831",
    status: "OVERDUE",
  },
  {
    id: "inv-link-2",
    invoiceNumber: "INV-2026-084",
    recipientName: "Devon Miles",
    amountDue: 18.0,
    currency: "$",
    dueDate: "2026-09-30",
    url: "https://myinvoice.app/invoices/token/inv-tok-9924",
    status: "PENDING",
  },
  {
    id: "inv-link-3",
    invoiceNumber: "INV-2026-079",
    recipientName: "Marcus Vance",
    amountDue: 35.0,
    currency: "$",
    dueDate: "2026-09-15",
    url: "https://myinvoice.app/invoices/token/inv-tok-7712",
    status: "PAID",
  },
  {
    id: "inv-link-4",
    invoiceNumber: "INV-2026-088",
    recipientName: "Elena Rostova",
    amountDue: 50.0,
    currency: "$",
    dueDate: "2026-09-22",
    url: "https://myinvoice.app/invoices/token/inv-tok-4409",
    status: "OVERDUE",
  },
  {
    id: "inv-link-5",
    invoiceNumber: "INV-2026-090",
    recipientName: "Liam Chen",
    amountDue: 18.0,
    currency: "$",
    dueDate: "2026-10-05",
    url: "https://myinvoice.app/invoices/token/inv-tok-5518",
    status: "PENDING",
  },
];

export function InvoiceShareLinksView({
  initialLinks = DEFAULT_INVOICE_LINKS,
  onMarkAsPaid,
  onSendReminder,
  onCreateLink,
  onEditLink,
  onDeleteLink,
}: InvoiceShareLinksViewProps) {
  const [links, setLinks] = useState<InvoiceShareLink[]>(initialLinks);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [remindedId, setRemindedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "EXCEPTIONS_ONLY" | "PENDING" | "OVERDUE" | "PAID"
  >("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [recipientName, setRecipientName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [amountDue, setAmountDue] = useState("");
  const [currency, setCurrency] = useState("$");
  const [dueDate, setDueDate] = useState("");

  const [editingLink, setEditingLink] = useState<InvoiceShareLink | null>(null);
  const [editRecipientName, setEditRecipientName] = useState("");
  const [editInvoiceNumber, setEditInvoiceNumber] = useState("");
  const [editAmountDue, setEditAmountDue] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editStatus, setEditStatus] = useState<InvoicePaymentStatus>("PENDING");

  const handleOpenEdit = (link: InvoiceShareLink) => {
    setEditingLink(link);
    setEditRecipientName(link.recipientName);
    setEditInvoiceNumber(link.invoiceNumber);
    setEditAmountDue(link.amountDue.toString());
    setEditDueDate(link.dueDate === "Open" ? "" : link.dueDate);
    setEditStatus(link.status);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLink) return;

    const updates: Partial<InvoiceShareLink> = {
      recipientName: editRecipientName.trim() || editingLink.recipientName,
      invoiceNumber: editInvoiceNumber.trim() || editingLink.invoiceNumber,
      amountDue: parseFloat(editAmountDue) || editingLink.amountDue,
      dueDate: editDueDate || "Open",
      status: editStatus,
    };

    if (onEditLink) {
      await onEditLink(editingLink.id, updates);
    }

    setLinks((prev) =>
      prev.map((l) => (l.id === editingLink.id ? { ...l, ...updates } : l)),
    );
    setEditingLink(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this invoice share link?"))
      return;
    if (onDeleteLink) {
      await onDeleteLink(id);
    }
    setLinks((prev) => prev.filter((l) => l.id !== id));
  };

  const handleCopy = async (id: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName.trim() || !amountDue) return;

    const token = Math.random().toString(36).substring(2, 10);
    const domain =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://myinvoice.app";
    const generatedUrl = `${domain}/invoices/token/${token}`;

    const newLink: InvoiceShareLink = {
      id: `inv-link-${Date.now()}`,
      invoiceNumber:
        invoiceNumber.trim() ||
        `INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      recipientName: recipientName.trim(),
      amountDue: parseFloat(amountDue) || 0,
      currency,
      dueDate:
        dueDate ||
        new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
      url: generatedUrl,
      status: "PENDING",
    };

    if (onCreateLink) {
      await onCreateLink(newLink);
    }

    setLinks((previous) => [newLink, ...previous]);
    setRecipientName("");
    setInvoiceNumber("");
    setAmountDue("");
    setDueDate("");
    setIsModalOpen(false);
  };

  const filteredLinks = links.filter((item) => {
    if (statusFilter === "ALL") return true;
    if (statusFilter === "EXCEPTIONS_ONLY")
      return item.status === "OVERDUE" || item.status === "PENDING";
    return item.status === statusFilter;
  });

  const totalOutstanding = links
    .filter((item) => item.status !== "PAID")
    .reduce((sum, item) => sum + item.amountDue, 0);

  const overdueCount = links.filter((item) => item.status === "OVERDUE").length;

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Invoice Share Links
          </h2>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            <span>Direct payment links sent to group members.</span>
            {overdueCount > 0 && (
              <span className=" text-rose-600 dark:text-rose-400">
                {overdueCount} overdue
              </span>
            )}
            {totalOutstanding > 0 && (
              <span className=" text-zinc-700 dark:text-zinc-300">
                Outstanding: ${totalOutstanding.toFixed(2)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center border border-zinc-200 dark:border-zinc-800 px-2 py-1 text-xs">
            <Filter className="w-3 h-3 text-zinc-400 mr-1.5" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-transparent text-zinc-700 dark:text-zinc-300 outline-none text-xs cursor-pointer"
            >
              <option value="ALL">All Links</option>
              <option value="EXCEPTIONS_ONLY">Unpaid Only</option>
              <option value="OVERDUE">Overdue</option>
              <option value="PENDING">Pending</option>
              <option value="PAID">Paid</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Payment Link
          </button>
        </div>
      </div>

      {filteredLinks.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-200">
            No invoice payment links found
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
            {statusFilter === "EXCEPTIONS_ONLY"
              ? "All outstanding balances are settled."
              : "Create a payment link to collect dues from members."}
          </p>
          {statusFilter !== "ALL" ? (
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
            >
              Show All Links
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Payment Link
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                <th className="py-3 pr-4 font-normal">Member</th>
                <th className="py-3 px-4 font-normal">Invoice URL</th>
                <th className="py-3 px-4 font-normal">Due Date</th>
                <th className="py-3 px-4 font-normal">Status</th>
                <th className="py-3 pl-4 text-right font-normal">
                  Quick Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900 text-xs">
              {filteredLinks.map((item) => {
                const isOverdue = item.status === "OVERDUE";
                const isPending = item.status === "PENDING";
                const isPaid = item.status === "PAID";

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40 transition-colors"
                  >
                    <td className="py-3.5 pr-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">
                          {item.recipientName}
                        </span>
                        <span className=" text-[11px] text-zinc-400 dark:text-zinc-500">
                          {item.invoiceNumber}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className=" text-zinc-600 dark:text-zinc-400 truncate max-w-[200px]">
                          {item.url}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(item.id, item.url)}
                          title="Copy Link"
                          className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                        >
                          {copiedId === item.id ? (
                            <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    <td className="py-3.5 px-4  text-zinc-600 dark:text-zinc-400">
                      {item.dueDate}
                    </td>

                    <td className="py-3.5 px-4">
                      {isPaid && (
                        <span className="text-zinc-400 dark:text-zinc-500 font-normal">
                          Paid
                        </span>
                      )}
                      {isPending && (
                        <span className="font-medium text-amber-700 dark:text-amber-400">
                          Pending
                        </span>
                      )}
                      {isOverdue && (
                        <span className="font-medium text-rose-600 dark:text-rose-400">
                          Overdue
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 pl-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopy(item.id, item.url)}
                          className="px-2 py-1 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                        >
                          {copiedId === item.id ? "Copied" : "Copy"}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                          title="Edit Link"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="p-1 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                          title="Delete Link"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                          title="Open Invoice Link"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-6 text-zinc-900 dark:text-zinc-100">
            <h3 className="text-sm font-semibold tracking-tight">
              Create Invoice Payment Link
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Issue a direct payment URL for a member or group share.
            </p>

            <form onSubmit={handleCreate} className="mt-5 space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                  Member or Group Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Morgan"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-transparent border border-zinc-300 dark:border-zinc-700 outline-none focus:border-zinc-900 dark:focus:border-zinc-100 font-sans"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                  Invoice Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. INV-2026-092"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-transparent border border-zinc-300 dark:border-zinc-700 outline-none focus:border-zinc-900 dark:focus:border-zinc-100 "
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                    Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-transparent border border-zinc-300 dark:border-zinc-700 outline-none focus:border-zinc-900 dark:focus:border-zinc-100 "
                  >
                    <option value="$">$ (USD)</option>
                    <option value="৳">৳ (BDT)</option>
                    <option value="€">€ (EUR)</option>
                    <option value="£">£ (GBP)</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                    Amount Due
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    value={amountDue}
                    onChange={(e) => setAmountDue(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-transparent border border-zinc-300 dark:border-zinc-700 outline-none focus:border-zinc-900 dark:focus:border-zinc-100 "
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-transparent border border-zinc-300 dark:border-zinc-700 outline-none focus:border-zinc-900 dark:focus:border-zinc-100 "
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
                >
                  Create Payment Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {editingLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-6 text-zinc-900 dark:text-zinc-100">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-sm font-semibold tracking-tight">
                Edit Invoice Payment Link
              </h3>
              <button
                type="button"
                onClick={() => setEditingLink(null)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-5 space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                  Recipient Name
                </label>
                <input
                  type="text"
                  required
                  value={editRecipientName}
                  onChange={(e) => setEditRecipientName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-transparent border border-zinc-300 dark:border-zinc-700 outline-none focus:border-zinc-900 dark:focus:border-zinc-100 font-sans"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                  Invoice Number
                </label>
                <input
                  type="text"
                  value={editInvoiceNumber}
                  onChange={(e) => setEditInvoiceNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-transparent border border-zinc-300 dark:border-zinc-700 outline-none focus:border-zinc-900 dark:focus:border-zinc-100 "
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                    Amount Due
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editAmountDue}
                    onChange={(e) => setEditAmountDue(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-transparent border border-zinc-300 dark:border-zinc-700 outline-none focus:border-zinc-900 dark:focus:border-zinc-100 "
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) =>
                      setEditStatus(e.target.value as InvoicePaymentStatus)
                    }
                    className="w-full px-3 py-2 text-xs bg-transparent border border-zinc-300 dark:border-zinc-700 outline-none focus:border-zinc-900 dark:focus:border-zinc-100 cursor-pointer"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="OVERDUE">Overdue</option>
                    <option value="PAID">Paid</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-transparent border border-zinc-300 dark:border-zinc-700 outline-none focus:border-zinc-900 dark:focus:border-zinc-100 "
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingLink(null)}
                  className="px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
