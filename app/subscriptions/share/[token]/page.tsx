"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { getSharedSubscriptionData } from "@/services/subscriptions";
import {
  getCalendarMonthsElapsed,
  getPaidUpToMonthStr,
  getStartMonthStr,
} from "@/lib/date-utils";
import { DynamicPaymentCards } from "@/components/dynamic-payment-cards";
import {
  Sun,
  Moon,
  AlertCircle,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";

interface SharedPageProps {
  params: Promise<{ token: string }>;
}

export default function PublicSharedSubscriptionPage({
  params: paramsPromise,
}: SharedPageProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"subscriptions" | "payments">(
    "subscriptions",
  );
  const [showRemoved, setShowRemoved] = useState(false);

  const [scope, setScope] = useState<any>(null);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  useEffect(() => {
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
          setPaymentMethods(result.paymentMethods || []);
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
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center font-sans text-xs text-zinc-400 ">
        Loading subscription data...
      </div>
    );
  }

  if (error || !scope) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-6 font-sans text-zinc-900 dark:text-zinc-100">
        <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 max-w-sm w-full space-y-3 text-center">
          <div className="flex justify-center text-zinc-400 dark:text-zinc-500">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-sm font-semibold tracking-tight uppercase">
            Access Restricted
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            {error || "This link is invalid, expired, or has been revoked."}
          </p>
        </div>
      </div>
    );
  }

  const activeSubs = subscriptions.filter((s) => s.status === "active");
  const monthlyRateTotal = activeSubs.reduce(
    (sum, s) => sum + Number(s.price_per_slot) * Number(s.slots_count),
    0,
  );
  const totalSlotsCount = subscriptions.reduce(
    (sum, s) => sum + (s.slots_count || 0),
    0,
  );
  const totalPaidSum = subscriptions.reduce(
    (sum, s) => sum + (Number(s.total_amount_paid) || 0),
    0,
  );

  const planMap: Record<string, any> = {};
  subscriptions.forEach((sub) => {
    if (sub.plan && !planMap[sub.plan.id]) {
      planMap[sub.plan.id] = sub.plan;
    }
  });
  const sharedPlans = Object.values(planMap);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-100">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-semibold tracking-tight">
              {scope.label || "Subscription Group"}
            </h1>
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 ">
              Subscription Baba
            </span>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            {mounted && theme === "dark" ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <div>
            <span className="block text-[11px] text-zinc-400 font-medium uppercase tracking-wider">
              Monthly Total
            </span>
            <span className=" text-base font-semibold mt-0.5 block text-zinc-900 dark:text-zinc-100">
              ৳{monthlyRateTotal.toLocaleString()}
            </span>
          </div>

          <div>
            <span className="block text-[11px] text-zinc-400 font-medium uppercase tracking-wider">
              Allocated Slots
            </span>
            <span className=" text-base font-semibold mt-0.5 block text-zinc-900 dark:text-zinc-100">
              {totalSlotsCount}
            </span>
          </div>

          <div>
            <span className="block text-[11px] text-zinc-400 font-medium uppercase tracking-wider">
              Members
            </span>
            <span className=" text-base font-semibold mt-0.5 block text-zinc-900 dark:text-zinc-100">
              {subscriptions.length}
            </span>
          </div>

          <div>
            <span className="block text-[11px] text-zinc-400 font-medium uppercase tracking-wider">
              Total Settled
            </span>
            <span className=" text-base font-semibold mt-0.5 block text-zinc-900 dark:text-zinc-100">
              ৳{totalPaidSum.toLocaleString()}
            </span>
          </div>
        </div>

        <div>
          <DynamicPaymentCards
            clientId={
              scope?.clientId ||
              (scope?.type === "client" ? scope?.clientId : null)
            }
            clientName={scope?.label}
            subscriptionId={subscriptions[0]?.id}
            currency="৳"
            totalDue={subscriptions.reduce(
              (sum, s) =>
                sum +
                (Number(s.price_per_slot) || 0) * (Number(s.slots_count) || 1),
              0,
            )}
            isPaid={false}
            initialMethods={paymentMethods}
            fullWidth={true}
            columns={3}
          />
        </div>

        <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
          <span>Notice Period</span>
          <span className="font-medium text-zinc-900 dark:text-zinc-200">
            Please notify 1 month in advance for any plan cancellations or
            modifications.
          </span>
        </div>

        <div>
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
            <div className="flex items-center gap-6 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("subscriptions")}
                className={`font-medium transition-colors ${
                  activeTab === "subscriptions"
                    ? "text-zinc-900 dark:text-zinc-100 border-b-2 border-zinc-900 dark:border-zinc-100 pb-3 -mb-3"
                    : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                }`}
              >
                Allocations ({subscriptions.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("payments")}
                className={`font-medium transition-colors ${
                  activeTab === "payments"
                    ? "text-zinc-900 dark:text-zinc-100 border-b-2 border-zinc-900 dark:border-zinc-100 pb-3 -mb-3"
                    : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                }`}
              >
                Payment History ({payments.length})
              </button>
            </div>

            {activeTab === "subscriptions" && (
              <label className="flex items-center gap-1.5 text-xs text-zinc-500 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showRemoved}
                  onChange={(e) => setShowRemoved(e.target.checked)}
                  className="accent-zinc-900 dark:accent-zinc-100"
                />
                <span>Include removed</span>
              </label>
            )}
          </div>

          {activeTab === "subscriptions" && (
            <div className="pt-6 space-y-8">
              {sharedPlans.map((plan) => {
                const planSubs = subscriptions.filter(
                  (sub) =>
                    sub.plan_id === plan.id &&
                    (showRemoved || sub.status !== "kicked"),
                );
                const activeSlots = planSubs.reduce(
                  (sum, sub) =>
                    sub.status === "active"
                      ? sum + Number(sub.slots_count)
                      : sum,
                  0,
                );

                return (
                  <div key={plan.id} className="space-y-3">
                    <div className="flex items-baseline justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-2">
                      <h2 className="text-sm font-semibold tracking-tight">
                        {plan.name}
                      </h2>
                      <span className=" text-xs text-zinc-500">
                        ৳{Number(plan.selling_price).toLocaleString()} / slot ·{" "}
                        {activeSlots} active
                      </span>
                    </div>

                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
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

                        const isKicked = sub.status === "kicked";
                        const isDue = !isKicked && monthsRemaining < -0.01;

                        return (
                          <div
                            key={sub.id}
                            className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              isKicked ? "opacity-50" : ""
                            }`}
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-xs text-zinc-900 dark:text-zinc-100">
                                  {sub.user?.name || "Member"}
                                </span>
                                <span className=" text-[11px] text-zinc-400">
                                  ({sub.slots_count}{" "}
                                  {sub.slots_count === 1 ? "slot" : "slots"})
                                </span>
                              </div>
                              <div className="text-[11px] text-zinc-500 ">
                                <span>Started: {startMonthStr}</span>
                                <span className="mx-2">·</span>
                                <span>Paid to: {paidUpTo}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-6 sm:text-right">
                              <div>
                                <span className="block  text-xs text-zinc-900 dark:text-zinc-100">
                                  ৳{totalCostPerMonth.toLocaleString()} / mo
                                </span>
                                <span className="block  text-[11px] text-zinc-400">
                                  Paid: ৳
                                  {Number(
                                    sub.total_amount_paid || 0,
                                  ).toLocaleString()}
                                </span>
                              </div>

                              <div className="min-w-[90px] text-right">
                                {isKicked ? (
                                  <span className="text-[11px] text-zinc-400 ">
                                    Removed
                                  </span>
                                ) : isDue ? (
                                  <span className=" text-xs font-medium text-rose-600 dark:text-rose-400">
                                    Due ৳{balanceAmount.toLocaleString()}
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-zinc-500 ">
                                    Current
                                  </span>
                                )}
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
                <div className="py-12 text-center text-xs text-zinc-400">
                  No active allocations found in this link.
                </div>
              )}
            </div>
          )}

          {activeTab === "payments" && (
            <div className="pt-6">
              {payments.length === 0 ? (
                <div className="py-12 text-center text-xs text-zinc-400">
                  No payment records found under this view.
                </div>
              ) : (
                <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-100 dark:border-zinc-800 text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                        <th className="py-2.5 px-4 font-normal">
                          Member / Plan
                        </th>
                        <th className="py-2.5 px-4 font-normal">Date</th>
                        <th className="py-2.5 px-4 font-normal">Notes</th>
                        <th className="py-2.5 px-4 text-right font-normal">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                      {payments.map((p) => {
                        const isDeduction = p.amount < 0;
                        const sub = subscriptions.find(
                          (s) => s.id === p.subscription_id,
                        );
                        const userName = sub?.user?.name || "Member";
                        const planName = sub?.plan?.name || "Subscription";

                        return (
                          <tr
                            key={p.id}
                            className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20"
                          >
                            <td className="py-2.5 px-4">
                              <span className="font-medium text-zinc-900 dark:text-zinc-100 block">
                                {userName}
                              </span>
                              <span className="text-[11px] text-zinc-400 block ">
                                {planName}
                              </span>
                            </td>
                            <td className="py-2.5 px-4  text-zinc-500 dark:text-zinc-400">
                              {
                                new Date(p.payment_date)
                                  .toISOString()
                                  .split("T")[0]
                              }
                            </td>
                            <td className="py-2.5 px-4 text-zinc-600 dark:text-zinc-400">
                              {p.notes || "Payment logged"}
                            </td>
                            <td className="py-2.5 px-4 text-right  font-medium">
                              <span
                                className={
                                  isDeduction
                                    ? "text-rose-600 dark:text-rose-400"
                                    : "text-zinc-900 dark:text-zinc-100"
                                }
                              >
                                {isDeduction ? "-" : "+"}৳
                                {Math.abs(Number(p.amount)).toLocaleString()}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <footer className="text-center py-8 text-xs text-zinc-400 dark:text-zinc-600 border-t border-zinc-200 dark:border-zinc-800 mt-12">
        <p className="mb-2">Subscription Baba</p>
        <p>
          Developed by{" "}
          <a
            className="text-black dark:text-white hover:underline"
            href="https://www.thenicedev.xyz"
          >
            The Nice Developer
          </a>
        </p>
      </footer>
    </div>
  );
}
