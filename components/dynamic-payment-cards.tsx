"use client";

import React, { useState, useEffect } from "react";
import { PaymentMethod, scopeSvgIds } from "@/types/payment-methods";
import {
  Copy,
  Check,
  ShieldCheck,
  AlertCircle,
  X,
  Loader2,
} from "lucide-react";

interface DynamicPaymentCardsProps {
  clientId?: string | null;
  clientName?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  subscriptionId?: string;
  isPaid?: boolean;
  currency?: string;
  totalDue?: number;
  initialMethods?: PaymentMethod[];
  fullWidth?: boolean;
  columns?: 1 | 2 | 3;
  className?: string;
}

export function DynamicPaymentCards({
  clientId,
  clientName,
  invoiceId,
  invoiceNumber,
  subscriptionId,
  isPaid = false,
  currency = "৳",
  totalDue = 0,
  initialMethods,
  fullWidth,
  columns,
  className = "",
}: DynamicPaymentCardsProps) {
  const isFullWidth = fullWidth ?? Boolean(subscriptionId);
  const cols = columns ?? (isFullWidth ? 3 : 2);
  const [methods, setMethods] = useState<PaymentMethod[]>(initialMethods || []);
  const [loading, setLoading] = useState(!initialMethods);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [trxId, setTrxId] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [selectedMethodId, setSelectedMethodId] = useState("");
  const [paidAmount, setPaidAmount] = useState(
    totalDue > 0 ? totalDue.toString() : "",
  );
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (initialMethods) {
      setMethods(initialMethods);
      if (initialMethods.length > 0) {
        setSelectedMethodId(initialMethods[0].id);
      }
      setLoading(false);
    } else {
      const fetchMethods = async () => {
        try {
          const url = clientId
            ? `/api/payment-methods?clientId=${encodeURIComponent(clientId)}&public=true`
            : `/api/payment-methods?public=true`;
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            setMethods(data.payment_methods || []);
            if (data.payment_methods?.length > 0) {
              setSelectedMethodId(data.payment_methods[0].id);
            }
          }
        } catch {
          setMethods([]);
        } finally {
          setLoading(false);
        }
      };
      fetchMethods();
    }
  }, [clientId, initialMethods]);

  const handleCopy = (text: string, id: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      const input = document.createElement("input");
      input.value = text;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleOpenModal = (methodId?: string) => {
    if (methodId) setSelectedMethodId(methodId);
    setPaidAmount(totalDue > 0 ? totalDue.toString() : "");
    setSubmitSuccess(false);
    setSubmitError(null);
    setModalOpen(true);
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trxId.trim() || !accountNumber.trim()) {
      setSubmitError(
        "Please fill in both the Transaction ID and Sender Account Number.",
      );
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const selectedMethod = methods.find((m) => m.id === selectedMethodId);

    try {
      const res = await fetch("/api/payment-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: invoiceId ? "invoice" : "subscription",
          invoice_id: invoiceId,
          invoice_number: invoiceNumber,
          subscription_id: subscriptionId,
          client_id: clientId,
          client_name: clientName,
          transaction_id: trxId.trim(),
          account_number: accountNumber.trim(),
          payment_method_id: selectedMethodId,
          payment_method_name: selectedMethod?.name,
          amount: paidAmount ? parseFloat(paidAmount) : undefined,
          currency,
          notes: notes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit request");
      }

      setSubmitSuccess(true);
      setTrxId("");
      setAccountNumber("");
      setNotes("");
    } catch (err: any) {
      setSubmitError(err.message || "Failed to submit payment verification.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div
        className={`w-full ${isFullWidth ? "" : "max-w-[210mm]"} border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 ${className}`}
      >
        <div className="h-3 bg-zinc-100 dark:bg-zinc-800 w-32 mb-4 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="h-20 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800/60 animate-pulse" />
          <div className="h-20 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800/60 animate-pulse" />
        </div>
      </div>
    );
  }

  if (methods.length === 0) return null;

  const gridColsClass =
    cols === 3
      ? "grid-cols-1 md:grid-cols-2"
      : cols === 1
        ? "grid-cols-1"
        : "grid-cols-1 md:grid-cols-2";

  return (
    <div
      className={`w-full ${isFullWidth ? "" : "max-w-[210mm]"} border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 text-zinc-900 dark:text-zinc-100 font-sans ${className}`}
    >
      <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800 mb-4">
        <div>
          <h3 className="text-xs font-semibold tracking-tight uppercase text-zinc-500">
            Payment Details
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {isPaid
              ? "All dues have been settled."
              : "Direct transfer instructions for settlement."}
          </p>
        </div>

        {!isPaid ? (
          <button
            type="button"
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Submit Verification
          </button>
        ) : (
          <span className=" text-xs text-zinc-400">Settled</span>
        )}
      </div>

      <div className={`grid ${gridColsClass} gap-3`}>
        {methods.map((method) => {
          return (
            <div
              key={method.id}
              className="border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/40 dark:bg-zinc-950/40 p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800/60">
                  <div className="flex items-center gap-2.5">
                    {method.icon_svg ? (
                      <div
                        style={{
                          backgroundColor: method?.color,
                        }}
                        className="rounded size-10 p-1 overflow-hidden flex items-center justify-center shrink-0 [&>svg]:w-full [&>svg]:h-full"
                        dangerouslySetInnerHTML={{
                          __html: scopeSvgIds(method.icon_svg, method.id),
                        }}
                      />
                    ) : null}
                    <div>
                      <h4 className="font-medium text-xs text-zinc-900 dark:text-zinc-100 leading-tight">
                        {method.name}
                      </h4>
                      <span className="text-[10px] text-zinc-400 uppercase  tracking-wider">
                        {method.type.replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  {method.badge && (
                    <span className="text-[10px]  text-zinc-500 border border-zinc-200 dark:border-zinc-800 px-1.5 py-0.5">
                      {method.badge}
                    </span>
                  )}
                </div>

                {method.fields && method.fields.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {method.fields.map((field) => {
                      const isCopied = copiedId === `${method.id}-${field.id}`;

                      return (
                        <div
                          key={field.id}
                          className="flex items-center justify-between gap-2 text-xs"
                        >
                          <span className="text-zinc-500 text-[11px]">
                            {field.label}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className=" text-xs text-zinc-800 dark:text-zinc-200">
                              {field.value}
                            </span>
                            {field.is_copyable !== false && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleCopy(
                                    field.value,
                                    `${method.id}-${field.id}`,
                                  )
                                }
                                className="p-0.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                                title="Copy"
                              >
                                {isCopied ? (
                                  <Check className="w-3 h-3 text-zinc-900 dark:text-zinc-100" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {method.instructions && (
                  <p className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/60 text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    {method.instructions}
                  </p>
                )}
              </div>

              {!isPaid && (
                <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/60 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleOpenModal(method.id)}
                    className="text-[11px] font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 underline transition-colors"
                  >
                    I paid via {method.name}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-6 text-zinc-900 dark:text-zinc-100">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div>
                <h4 className="text-sm font-semibold tracking-tight">
                  Submit Payment Details
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {invoiceNumber
                    ? `Invoice #${invoiceNumber}`
                    : "Subscription dues verification"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4">
              {submitSuccess ? (
                <div className="py-6 text-center space-y-3">
                  <div className="w-8 h-8 mx-auto flex items-center justify-center border border-zinc-200 dark:border-zinc-700 rounded-full text-zinc-900 dark:text-zinc-100">
                    <Check className="w-4 h-4" />
                  </div>
                  <h5 className="text-xs font-semibold">
                    Payment Details Submitted
                  </h5>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-xs mx-auto">
                    Your reference has been logged. We will verify the
                    transaction and update the balance.
                  </p>
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="mt-3 px-4 py-1.5 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmitRequest}
                  className="space-y-3.5 text-xs"
                >
                  {submitError && (
                    <div className="border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 p-2.5 flex items-center gap-2 text-rose-600 dark:text-rose-400">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                      Payment Method
                    </label>
                    <select
                      value={selectedMethodId}
                      onChange={(e) => setSelectedMethodId(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-transparent border border-zinc-300 dark:border-zinc-700 outline-none focus:border-zinc-900 dark:focus:border-zinc-100"
                    >
                      {methods.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.type.replace("_", " ")})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                      Transaction ID / Reference
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 9J87AKL12"
                      value={trxId}
                      onChange={(e) => setTrxId(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-transparent border border-zinc-300 dark:border-zinc-700 outline-none focus:border-zinc-900 dark:focus:border-zinc-100 "
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                      Sender Account / Phone Number
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 017XXXXXXXX"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-transparent border border-zinc-300 dark:border-zinc-700 outline-none focus:border-zinc-900 dark:focus:border-zinc-100 "
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                      Amount Paid ({currency})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-transparent border border-zinc-300 dark:border-zinc-700 outline-none focus:border-zinc-900 dark:focus:border-zinc-100 "
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                      Notes (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Additional details or transfer remarks"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-transparent border border-zinc-300 dark:border-zinc-700 outline-none focus:border-zinc-900 dark:focus:border-zinc-100 resize-none font-sans"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      className="px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
                    >
                      {submitting && (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      )}
                      <span>Submit Verification</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DynamicPaymentCards;
