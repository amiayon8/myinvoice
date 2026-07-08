"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { getSharedSubscriptionData } from "@/services/subscriptions";
import {
  getCalendarMonthsElapsed,
  getPaidUpToMonthStr,
  getStartMonthStr,
} from "@/lib/date-utils";

interface SharedPageProps {
  params: Promise<{ token: string }>;
}

export default function PublicSharedSubscriptionPage({
  params: paramsPromise,
}: SharedPageProps) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"subscriptions" | "payments">(
    "subscriptions",
  );

  // Resolved data states
  const [scope, setScope] = useState<any>(null);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    // Resolve params promise
    paramsPromise.then((res) => {
      setToken(res.token);
    });
  }, [paramsPromise]);

  useEffect(() => {
    if (!token) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const result = await getSharedSubscriptionData(token);
        if (result.success) {
          setScope(result.scope);
          setSubscriptions(result.subscriptions || []);
          setPayments(result.payments || []);
        } else {
          setError(result.error || "Failed to load subscription details.");
        }
      } catch (err: any) {
        setError(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#020617] flex justify-center items-center font-sans p-6">
        <div className="text-center space-y-3">
          <i className="fa-solid fa-spinner animate-spin text-3xl text-indigo-600"></i>
          <p className="text-sm text-slate-550 dark:text-slate-405 font-bold uppercase tracking-wider">
            Loading subscription portal...
          </p>
        </div>
      </div>
    );
  }

  if (error || !scope) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#020617] flex justify-center items-center font-sans p-6">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 shadow-2xl rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-950/20 text-red-650 dark:text-red-405 rounded-full flex justify-center items-center text-2xl mx-auto shadow-inner">
            <i className="fa-solid fa-ban"></i>
          </div>
          <div className="space-y-2">
            <h2 className="font-black text-slate-850 dark:text-white text-lg uppercase tracking-tight">
              Access Restricted
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {error ||
                "This dashboard link is invalid, expired, or has been revoked by the system administrator."}
            </p>
          </div>
          <div className="border-t border-slate-100 dark:border-slate-800 pt-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            Security Protected · My Invoice
          </div>
        </div>
      </div>
    );
  }

  // Calculate metrics
  const activeSubs = subscriptions.filter((s) => s.status === "active");
  const mrr = activeSubs.reduce(
    (sum, s) => sum + Number(s.price_per_slot) * Number(s.slots_count),
    0,
  );
  const totalSlots = subscriptions.reduce(
    (sum, s) => sum + (s.slots_count || 0),
    0,
  );
  const totalPaid = subscriptions.reduce(
    (sum, s) => sum + (Number(s.total_amount_paid) || 0),
    0,
  );

  // Get list of unique plans present in the subscriptions
  const planMap: Record<string, any> = {};
  subscriptions.forEach((sub) => {
    if (sub.plan && !planMap[sub.plan.id]) {
      planMap[sub.plan.id] = sub.plan;
    }
  });
  const sharedPlans = Object.values(planMap);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020617] font-sans">
      {/* Top Banner */}
      <header className="bg-slate-900 text-white py-6 px-4 md:px-12 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="flex justify-center items-center bg-indigo-600 rounded-xl w-10 h-10 font-bold text-white shadow-lg shadow-indigo-600/35">
              <i className="text-xl fa-solid fa-file-invoice"></i>
            </div>
            <div>
              <span className="block font-black text-white text-lg tracking-tight">
                My Invoice
              </span>
              <span className="block font-black text-[8px] text-indigo-400 uppercase tracking-[0.3em]">
                Subscription Baba
              </span>
            </div>
          </div>
          <div className="text-left md:text-right bg-slate-800/50 px-4 py-2 border border-slate-700/40 rounded-xl max-w-sm">
            <span className="block font-black text-[8px] text-slate-400 uppercase tracking-widest">
              Shared Portal
            </span>
            <span className="block text-xs font-bold text-slate-200 mt-0.5 truncate">
              {scope.label || "Subscriptions Overview"}
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto p-4 lg:p-12 space-y-8">
        {/* KPI metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-slate-900 shadow-xl p-5 border border-slate-100 dark:border-slate-800/60 rounded-2xl">
            <div className="flex justify-between items-start">
              <div>
                <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider">
                  Active Monthly Rate
                </span>
                <h3 className="mt-1 font-black text-slate-800 dark:text-white text-2xl tracking-tight">
                  ৳{mrr.toLocaleString()}
                </h3>
              </div>
              <div className="bg-indigo-500/10 p-2.5 rounded-xl text-indigo-650 dark:text-indigo-400">
                <i className="fa-solid fa-sack-dollar text-lg"></i>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 shadow-xl p-5 border border-slate-100 dark:border-slate-800/60 rounded-2xl">
            <div className="flex justify-between items-start">
              <div>
                <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider">
                  Total Slots Monitored
                </span>
                <h3 className="mt-1 font-black text-slate-800 dark:text-white text-2xl tracking-tight">
                  {totalSlots} Slot{totalSlots === 1 ? "" : "s"}
                </h3>
              </div>
              <div className="bg-emerald-500/10 p-2.5 rounded-xl text-emerald-600 dark:text-emerald-450">
                <i className="fa-solid fa-ticket text-lg"></i>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 shadow-xl p-5 border border-slate-100 dark:border-slate-800/60 rounded-2xl">
            <div className="flex justify-between items-start">
              <div>
                <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider">
                  Subscriptions Loaded
                </span>
                <h3 className="mt-1 font-black text-slate-850 dark:text-white text-2xl tracking-tight">
                  {subscriptions.length}
                </h3>
              </div>
              <div className="bg-sky-500/10 p-2.5 rounded-xl text-sky-600 dark:text-sky-400">
                <i className="fa-solid fa-users text-lg"></i>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 shadow-xl p-5 border border-slate-100 dark:border-slate-800/60 rounded-2xl">
            <div className="flex justify-between items-start">
              <div>
                <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider">
                  Total Paid in History
                </span>
                <h3 className="mt-1 font-black text-slate-800 dark:text-white text-2xl tracking-tight">
                  ৳{totalPaid.toLocaleString()}
                </h3>
              </div>
              <div className="bg-amber-500/10 p-2.5 rounded-xl text-amber-600 dark:text-amber-450">
                <i className="fa-solid fa-circle-check text-lg"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Payment & Instructions Info Card */}
        <div className="bg-gradient-to-br from-indigo-50/50 via-pink-50/20 to-pink-50/30 dark:from-slate-900/60 dark:via-pink-950/5 dark:to-pink-950/10 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-md p-6 relative overflow-hidden transition-all duration-300 hover:shadow-lg">
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-pink-500/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -left-10 -top-10 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative flex flex-col md:flex-row justify-between gap-6">
            {/* Left Section: bKash Payment Details */}
            <div className="flex-1 flex items-start gap-4">
              <div className="bg-gradient-to-br from-pink-500 to-rose-500 text-white p-3 rounded-xl shadow-sm flex items-center justify-center shrink-0">
                <i className="fa-solid fa-mobile-screen-button text-lg"></i>
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[9px] font-black uppercase tracking-wider text-pink-600 dark:text-pink-400 bg-pink-100/50 dark:bg-pink-950/30 px-2 py-0.5 rounded-md">
                    bKash Personal
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-100/50 dark:bg-amber-950/30 px-2 py-0.5 rounded-md">
                    Send Money Only
                  </span>
                </div>
                <h4 className="font-extrabold text-slate-800 dark:text-white text-base">
                  Account Number: <span className="font-black text-pink-600 dark:text-pink-400 select-all cursor-pointer">01870828373</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Please use the <span className="font-bold text-slate-700 dark:text-slate-200">Send Money</span> feature in your bKash app. Include your subscription name or invoice reference in the transaction note.
                </p>
              </div>
            </div>

            {/* Vertical Divider line */}
            <div className="hidden md:block w-px bg-slate-200 dark:bg-slate-800 self-stretch"></div>

            {/* Right Section: Cancellation Policy */}
            <div className="flex-1 flex items-start gap-4">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-3 rounded-xl shadow-sm flex items-center justify-center shrink-0">
                <i className="fa-solid fa-calendar-xmark text-lg"></i>
              </div>
              <div className="space-y-1">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-100/50 dark:bg-indigo-950/30 px-2 py-0.5 rounded-md">
                    Cancellation Policy
                  </span>
                </div>
                <h4 className="font-extrabold text-slate-800 dark:text-white text-base">
                  1-Month Notification
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  To cancel or request subscription modifications, please notify us at least <span className="font-black text-indigo-600 dark:text-indigo-400">1 month in advance</span> to avoid the next billing cycle.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="border-b border-slate-200 dark:border-slate-800 flex items-center gap-1 overflow-x-auto pb-px scrollbar-none">
          <button
            onClick={() => setActiveTab("subscriptions")}
            className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all ${
              activeTab === "subscriptions"
                ? "border-indigo-600 text-indigo-600 font-black"
                : "border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-350"
            }`}
          >
            <i className="fa-solid fa-ticket"></i> Active Allocations (
            {subscriptions.length})
          </button>
          <button
            onClick={() => setActiveTab("payments")}
            className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all ${
              activeTab === "payments"
                ? "border-indigo-600 text-indigo-600 font-black"
                : "border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-350"
            }`}
          >
            <i className="fa-solid fa-clock-rotate-left"></i> Payment Log
            History ({payments.length})
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/50 rounded-2xl shadow-xl overflow-hidden">
          {/* TAB 1: SUBSCRIPTIONS VIEW */}
          {activeTab === "subscriptions" && (
            <div className="p-6 space-y-8 bg-slate-50/10 dark:bg-slate-950/5">
              {sharedPlans.map((plan) => {
                const planSubs = subscriptions.filter(
                  (sub) => sub.plan_id === plan.id,
                );
                const activeSlots = planSubs.reduce(
                  (sum, sub) =>
                    sub.status === "active"
                      ? sum + Number(sub.slots_count)
                      : sum,
                  0,
                );

                return (
                  <div
                    key={plan.id}
                    className="space-y-4 border border-slate-100 dark:border-slate-800/80 p-6 rounded-2xl bg-slate-50/30 dark:bg-slate-950/20"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <h3 className="font-black text-slate-850 dark:text-white text-sm uppercase tracking-tight">
                          {plan.name}
                        </h3>
                        <span className="text-[10px] text-slate-400 uppercase font-black tracking-wide">
                          ৳{Number(plan.selling_price).toLocaleString()} per
                          slot
                        </span>
                      </div>
                      <div>
                        <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-655 dark:text-indigo-400 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                          Active Slots: {activeSlots}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {planSubs.map((sub) => {
                        const todayStr = new Date().toISOString().split("T")[0];
                        const endStr = sub.kicked_at
                          ? new Date(sub.kicked_at).toISOString().split("T")[0]
                          : todayStr;
                        const monthsConsumed = getCalendarMonthsElapsed(
                          sub.start_date,
                          endStr,
                        );
                        const monthsRemaining =
                          Number(sub.months_paid) - monthsConsumed;
                        const totalCostPerMonth =
                          Number(sub.price_per_slot) * Number(sub.slots_count);
                        const balanceAmount = Math.round(
                          Math.abs(monthsRemaining) * totalCostPerMonth,
                        );

                        const startMonthStr = getStartMonthStr(sub.start_date);
                        const paidUpTo = getPaidUpToMonthStr(
                          sub.start_date,
                          sub.months_paid,
                        );

                        // Colors / visual helpers
                        const isKicked = sub.status === "kicked";
                        const isDue = !isKicked && monthsRemaining < -0.01;
                        const isAdvance = !isKicked && monthsRemaining > 0.01;

                        const initials = sub.user?.name
                          ? sub.user.name
                              .split(" ")
                              .map((n: string) => n[0])
                              .join("")
                              .substring(0, 2)
                              .toUpperCase()
                          : "??";

                        return (
                          <div
                            key={sub.id}
                            className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-sm relative flex flex-col justify-between ${
                              isKicked
                                ? "border-slate-200 dark:border-slate-800 opacity-60"
                                : isDue
                                  ? "border-rose-200 dark:border-rose-900/50 shadow-rose-50/10"
                                  : isAdvance
                                    ? "border-emerald-250 dark:border-emerald-900/50 shadow-emerald-50/10"
                                    : "border-slate-200 dark:border-slate-800"
                            }`}
                          >
                            <div>
                              <div className="flex justify-between items-start gap-2">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-10 h-10 rounded-full flex justify-center items-center font-black text-sm text-white ${
                                      isKicked
                                        ? "bg-slate-400"
                                        : isDue
                                          ? "bg-rose-500 shadow-lg shadow-rose-500/20"
                                          : isAdvance
                                            ? "bg-emerald-500 shadow-lg shadow-emerald-500/20"
                                            : "bg-indigo-550 shadow-lg shadow-indigo-650/20"
                                    }`}
                                  >
                                    {initials}
                                  </div>
                                  <div>
                                    <h4 className="font-black text-slate-855 dark:text-white text-sm tracking-tight leading-tight">
                                      {sub.user?.name}
                                    </h4>
                                    <span className="text-[10px] text-slate-400 block mt-0.5 font-semibold">
                                      {sub.user?.contact || "No Email"}
                                    </span>
                                  </div>
                                </div>

                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                                    isKicked
                                      ? "bg-slate-100 text-slate-500 dark:bg-slate-855"
                                      : isDue
                                        ? "bg-rose-100 text-rose-600 dark:bg-rose-950/30"
                                        : isAdvance
                                          ? "bg-emerald-100 text-emerald-605 dark:bg-emerald-950/30"
                                          : "bg-slate-100 text-slate-655 dark:bg-slate-800"
                                  }`}
                                >
                                  {sub.slots_count} Slot
                                  {sub.slots_count > 1 ? "s" : ""}
                                </span>
                              </div>

                              {/* Card Details */}
                              <div className="mt-4 space-y-2 border-t border-slate-105 dark:border-slate-805 pt-3 text-left">
                                <div className="flex justify-between text-xs">
                                  <span className="text-slate-405 font-bold">
                                    Monthly Price:
                                  </span>
                                  <span className="font-black text-slate-800 dark:text-slate-200">
                                    ৳{totalCostPerMonth.toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-slate-405 font-bold">
                                    Start Month:
                                  </span>
                                  <span className="font-bold text-slate-655 dark:text-slate-350">
                                    {startMonthStr}
                                  </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-slate-405 font-bold">
                                    Paid Upto:
                                  </span>
                                  <span className="font-black text-indigo-650 dark:text-indigo-400">
                                    {paidUpTo}
                                  </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-slate-405 font-bold">
                                    Total Spent:
                                  </span>
                                  <span className="font-black text-emerald-600 dark:text-emerald-450">
                                    ৳
                                    {Number(
                                      sub.total_amount_paid || 0,
                                    ).toLocaleString()}
                                  </span>
                                </div>
                              </div>

                              {/* Paid Upto Indicator */}
                              <div
                                className={`mt-4 p-3 rounded-xl flex items-center gap-2 border ${
                                  isKicked
                                    ? "bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-500"
                                    : isDue
                                      ? "bg-rose-50/30 dark:bg-rose-950/10 border-rose-100/50 dark:border-rose-900/20 text-rose-600 dark:text-rose-455"
                                      : isAdvance
                                        ? "bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-100/50 dark:border-emerald-900/20 text-emerald-650 dark:text-emerald-400"
                                        : "bg-slate-55 dark:bg-slate-950/30 border-slate-205 dark:border-slate-805 text-slate-705 dark:text-slate-350"
                                }`}
                              >
                                <i
                                  className={`text-sm fa-solid ${
                                    isKicked
                                      ? "fa-user-slash"
                                      : isDue
                                        ? "fa-triangle-exclamation"
                                        : "fa-circle-check"
                                  }`}
                                ></i>
                                <div className="text-[10px] leading-tight text-left">
                                  <span className="block font-black uppercase tracking-wider">
                                    {isKicked
                                      ? "Kicked / Frozen"
                                      : isDue
                                        ? "Overdue Debt"
                                        : isAdvance
                                          ? "Paid in Advance"
                                          : "Up to Date"}
                                  </span>
                                  <span className="block font-bold mt-0.5">
                                    {isKicked
                                      ? `Kicked in ${getStartMonthStr(sub.kicked_at)}`
                                      : (() => {
                                          const nextMonthIndex =
                                            Math.floor(
                                              Number(sub.months_paid),
                                            ) + 1;
                                          const nextMonthName =
                                            getPaidUpToMonthStr(
                                              sub.start_date,
                                              nextMonthIndex,
                                            );
                                          let remainsVal = 0;
                                          if (monthsRemaining < -0.01) {
                                            remainsVal = balanceAmount;
                                          } else if (monthsRemaining > 0.01) {
                                            const partialPaid = Number(sub.total_amount_paid || 0) % totalCostPerMonth;
                                            remainsVal = partialPaid === 0 ? totalCostPerMonth : Math.round(totalCostPerMonth - partialPaid);
                                          } else {
                                            remainsVal = 0;
                                          }
                                          return `${remainsVal} remains. Next for ${nextMonthName}`;
                                        })()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {subscriptions.length === 0 && (
                <div className="py-12 text-slate-400 text-sm text-center italic border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl animate-fade-in">
                  No allocations found.
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PAYMENTS HISTORY VIEW */}
          {activeTab === "payments" && (
            <div className="p-6">
              {payments.length === 0 ? (
                <p className="py-8 text-center text-slate-400 text-sm italic">
                  No payment history records found under this access scope.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {payments.map((p) => {
                    const isDeduction = p.amount < 0;
                    // Find associated user for labeling
                    const sub = subscriptions.find(
                      (s) => s.id === p.subscription_id,
                    );
                    const userName = sub?.user?.name || "Unknown User";
                    const planName = sub?.plan?.name || "Unknown Plan";

                    return (
                      <div
                        key={p.id}
                        className={`p-4 border rounded-xl flex justify-between items-center transition-all ${
                          isDeduction
                            ? "bg-rose-50/20 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/30"
                            : "bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/30"
                        }`}
                      >
                        <div className="space-y-1">
                          <span
                            className={`text-[10px] font-black uppercase tracking-wider block ${
                              isDeduction
                                ? "text-rose-500"
                                : "text-emerald-650 dark:text-emerald-450"
                            }`}
                          >
                            {isDeduction
                              ? "Deduction / Refund"
                              : "Payment Received"}
                          </span>
                          <span className="block text-xs font-bold text-slate-700 dark:text-slate-350">
                            {userName} ·{" "}
                            <span className="text-indigo-650 dark:text-indigo-400 font-semibold">
                              {planName}
                            </span>
                          </span>
                          <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                            {p.notes || "Payment recorded"}
                          </span>
                          <span className="block text-[9px] text-slate-400">
                            {new Date(p.payment_date).toLocaleString(
                              undefined,
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </span>
                        </div>
                        <div className="text-right">
                          <span
                            className={`text-sm font-black block ${
                              isDeduction
                                ? "text-rose-605"
                                : "text-emerald-650 dark:text-emerald-400"
                            }`}
                          >
                            {isDeduction ? "-" : "+"}৳
                            {Math.abs(Number(p.amount)).toLocaleString()}
                          </span>
                          <span className="block text-[10px] text-slate-400 font-bold">
                            {isDeduction ? "-" : "+"}
                            {Math.abs(Number(p.months))} Month
                            {Math.abs(Number(p.months)) === 1 ? "" : "s"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-8 text-slate-400 dark:text-slate-600 text-xs border-t border-slate-200 dark:border-slate-850 mt-12 bg-white dark:bg-slate-950/20 space-y-2">
        <p className="font-bold">
          © {new Date().getFullYear()} My Invoice Portal · Real-time Secured Tracker
        </p>
        <p className="font-semibold text-[10px] text-slate-500">
          This secure tracking link verifies access and ensures that the details remain tamper-proof.
        </p>
        <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-1">
          Developed by{" "}
          <a
            href="https://www.thenicedev.xyz/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
          >
            The Nice Developer
          </a>{" "}
          · Platform for subscription: <span className="font-semibold text-slate-500 dark:text-slate-400">Subscription Baba</span>
        </p>
      </footer>
    </div>
  );
}
