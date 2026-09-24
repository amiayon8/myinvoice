"use client";

import React, { useState, useEffect } from "react";
import { PaymentMethod, scopeSvgIds } from "@/types/payment-methods";
import {
  Copy,
  Check,
  Send,
  AlertCircle,
  ShieldCheck,
  CreditCard,
  ChevronDown,
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
  const isFullWidth = fullWidth ?? !!subscriptionId;
  const cols = columns ?? (isFullWidth ? 3 : 2);
  const [methods, setMethods] = useState<PaymentMethod[]>(initialMethods || []);
  const [loading, setLoading] = useState(!initialMethods);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal State for Payment Update Request
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
        } catch (err) {
          console.error("Failed to load payment methods:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchMethods();
    }
  }, [clientId, initialMethods]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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
      <div className={`w-full ${isFullWidth ? "" : "max-w-[800px]"} bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm animate-pulse mb-6 ${className}`}>
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/4 mb-4"></div>
        <div className={`grid grid-cols-1 md:grid-cols-2 ${cols === 3 ? "lg:grid-cols-3" : ""} gap-4`}>
          <div className="h-32 bg-slate-100 dark:bg-slate-800/50 rounded-xl"></div>
          <div className="h-32 bg-slate-100 dark:bg-slate-800/50 rounded-xl"></div>
          {cols === 3 && <div className="h-32 bg-slate-100 dark:bg-slate-800/50 rounded-xl"></div>}
        </div>
      </div>
    );
  }

  if (methods.length === 0) return null;

  const gridColsClass =
    cols === 3
      ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
      : cols === 1
      ? "grid-cols-1"
      : "grid-cols-1 md:grid-cols-2";

  return (
    <div className={`w-full ${isFullWidth ? "" : "max-w-[800px]"} mb-6 no-print space-y-4 ${className}`}>
      {/* Header with Verification Request CTA */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 px-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-wide">
              Payment Information
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isPaid
                ? "Payment received. Keep for your records."
                : "Choose your preferred payment method below."}
            </p>
          </div>
        </div>

        {!isPaid && (
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/25 transition-all duration-200 active:scale-95 cursor-pointer uppercase tracking-wider shrink-0"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Submit Payment Verification</span>
          </button>
        )}
      </div>

      {/* Dynamic Payment Cards Grid */}
      <div className={`grid ${gridColsClass} gap-4`}>
        {methods.map((method) => {
          const accentColor = method.color || "#6366f1";

          return (
            <div
              key={method.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden flex flex-col justify-between"
            >
              {/* Subtle top accent bar */}
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: accentColor }}
              />

              <div className="space-y-3">
                {/* Method Title & Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    {method.icon_svg ? (
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center p-1.5 text-white shadow-sm shrink-0 overflow-hidden [&>svg]:w-full [&>svg]:h-full [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:object-contain"
                        style={{ backgroundColor: accentColor }}
                        dangerouslySetInnerHTML={{ __html: scopeSvgIds(method.icon_svg, method.id) }}
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0"
                        style={{ backgroundColor: accentColor }}
                      >
                        <i
                          className={`fa-solid ${method.icon_name || "fa-credit-card"} text-base`}
                        ></i>
                      </div>
                    )}
                    <div>
                      <h4 className="font-extrabold text-slate-900 dark:text-white text-sm tracking-tight">
                        {method.name}
                      </h4>
                      <span className="text-[10px] font-bold text-slate-400 capitalize">
                        {method.type.replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  {method.badge && (
                    <span
                      className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider"
                      style={{
                        backgroundColor: `${accentColor}18`,
                        color: accentColor,
                      }}
                    >
                      {method.badge}
                    </span>
                  )}
                </div>

                {/* Key-Value Fields */}
                {method.fields && method.fields.length > 0 && (
                  <div className="space-y-2 bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60">
                    {method.fields.map((field) => {
                      const isCopied = copiedId === `${method.id}-${field.id}`;

                      return (
                        <div
                          key={field.id}
                          className="flex items-center justify-between gap-2 text-xs"
                        >
                          <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">
                            {field.label}:
                          </span>
                          <div className="flex items-center gap-1.5 font-bold">
                            <span
                              className={`${
                                field.is_highlighted
                                  ? "text-slate-900 dark:text-white font-black text-[13px] tracking-tight"
                                  : "text-slate-700 dark:text-slate-300 text-[11px]"
                              }`}
                            >
                              {field.value}
                            </span>
                            {field.is_copyable !== false && (
                              <button
                                onClick={() =>
                                  handleCopy(
                                    field.value,
                                    `${method.id}-${field.id}`,
                                  )
                                }
                                className={`p-1 rounded-md transition-colors cursor-pointer ${
                                  isCopied
                                    ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
                                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800"
                                }`}
                                title="Copy to clipboard"
                              >
                                {isCopied ? (
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Instructions */}
                {method.instructions && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed italic">
                    {method.instructions}
                  </p>
                )}
              </div>

              {/* Quick Verify button for this method */}
              {!isPaid && (
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex justify-end">
                  <button
                    onClick={() => handleOpenModal(method.id)}
                    className="text-[11px] font-black text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>I paid via {method.name}</span>
                    <Send className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL: Payment Update & Verification Request */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in font-sans">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100">
            {/* Modal Header */}
            <div className="p-6 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-600/30">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white uppercase tracking-tight">
                    Submit Payment Details
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {invoiceNumber
                      ? `For Invoice #${invoiceNumber}`
                      : "For Subscription Billing"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {submitSuccess ? (
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl p-6 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                    <Check className="w-6 h-6 stroke-[3]" />
                  </div>
                  <h4 className="font-black text-emerald-800 dark:text-emerald-300 text-base">
                    Verification Request Received!
                  </h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed">
                    Thank you! We have received your transaction ID (
                    <strong>{trxId || "submitted"}</strong>). We will verify and
                    update the invoice status shortly.
                  </p>
                  <button
                    onClick={() => setModalOpen(false)}
                    className="mt-4 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitRequest} className="space-y-4">
                  {submitError && (
                    <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl p-3 flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-medium">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  {/* Payment Method Selector */}
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      Payment Method Used *
                    </label>
                    <select
                      value={selectedMethodId}
                      onChange={(e) => setSelectedMethodId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      {methods.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.type.replace("_", " ")})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Transaction ID */}
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      Transaction ID / Reference Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 9J87AKL12, TRX-9982, EFT-102"
                      value={trxId}
                      onChange={(e) => setTrxId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  {/* Sender Account Number */}
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      Sender Account Number / Mobile Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 017XXXXXXXX or Bank A/C Number"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  {/* Amount Paid */}
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      Amount Paid ({currency})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 15000"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  {/* Additional Notes */}
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      Notes / Remarks (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Any additional information or payment time..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                    >
                      {submitting ? (
                        <>
                          <i className="fa-solid fa-spinner animate-spin text-sm"></i>
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Submit Verification</span>
                        </>
                      )}
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
