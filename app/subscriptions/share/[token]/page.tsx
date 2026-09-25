"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useTheme } from "next-themes";
import { getSharedSubscriptionData } from "@/services/subscriptions";
import {
  getCalendarMonthsElapsed,
  getPaidUpToMonthDate,
  getPaidUpToMonthStr,
  getStartMonthStr,
} from "@/lib/date-utils";
import { DynamicPaymentCards } from "@/components/dynamic-payment-cards";
import {
  Sun,
  Moon,
  AlertCircle,
  CreditCard,
} from "lucide-react";

interface SharedPageProps {
  params: Promise<{ token: string }>;
}

interface SlotAllocationItem {
  id: string;
  userName: string;
  userContact?: string;
  planName: string;
  planId: string;
  slotsCount: number;
  costPerMonth: number;
  dueAmount: number;
  advanceAmount: number;
  monthsRemaining: number;
  startDate: string;
  monthsPaid: number;
  paidUpTo: string;
  nextMonthName: string;
  status: "kicked" | "due" | "advance" | "current";
  kickedAt?: string;
}

function getAmountNeededForMonths(
  slot: SlotAllocationItem,
  monthsCount: number,
): number {
  if (monthsCount <= 0 || slot.costPerMonth <= 0) return 0;

  if (slot.dueAmount > 0) {
    return slot.dueAmount + (monthsCount - 1) * slot.costPerMonth;
  }

  const fullMonthsCovered = Math.floor(
    slot.advanceAmount / slot.costPerMonth,
  );
  const targetMonths = fullMonthsCovered + monthsCount;
  const targetAdvanceCash = targetMonths * slot.costPerMonth;
  return Math.max(0, targetAdvanceCash - slot.advanceAmount);
}

function getTargetPayUpToStr(
  slot: SlotAllocationItem,
  allocated: number,
): string {
  const baseDate = getPaidUpToMonthDate(slot.startDate, slot.monthsPaid);

  if (slot.dueAmount > 0) {
    if (allocated >= slot.dueAmount) {
      const extraCash = allocated - slot.dueAmount;
      const extraMonths = Math.floor(
        extraCash / Math.max(1, slot.costPerMonth),
      );
      const targetDate = new Date(
        baseDate.getFullYear(),
        baseDate.getMonth() + 1 + extraMonths,
        1,
      );
      return targetDate.toLocaleDateString(undefined, {
        month: "short",
        year: "numeric",
      });
    }
    const targetDate = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth() + 1,
      1,
    );
    return targetDate.toLocaleDateString(undefined, {
      month: "short",
      year: "numeric",
    });
  }

  const totalAdvanceCash = slot.advanceAmount + allocated;
  const fullAdvanceMonths = Math.floor(
    totalAdvanceCash / Math.max(1, slot.costPerMonth),
  );

  if (fullAdvanceMonths > 0) {
    const targetDate = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth() + fullAdvanceMonths,
      1,
    );
    return targetDate.toLocaleDateString(undefined, {
      month: "short",
      year: "numeric",
    });
  }

  const targetDate = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth() + 1,
    1,
  );
  return targetDate.toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}

function computeAutoDistribution(
  slots: SlotAllocationItem[],
  totalAmount: number,
): Record<string, number> {
  const allocation: Record<string, number> = {};
  slots.forEach((s) => {
    allocation[s.id] = 0;
  });

  let remaining = Math.max(0, Math.round(totalAmount));
  if (remaining <= 0 || slots.length === 0) return allocation;

  const dueSlots = [...slots]
    .filter((s) => s.dueAmount > 0)
    .sort((a, b) => a.dueAmount - b.dueAmount);

  for (const slot of dueSlots) {
    if (remaining <= 0) break;
    const pay = Math.min(remaining, slot.dueAmount);
    allocation[slot.id] = (allocation[slot.id] || 0) + pay;
    remaining -= pay;
  }

  if (remaining > 0) {
    const advanceSlots = [...slots].sort(
      (a, b) => a.costPerMonth - b.costPerMonth,
    );

    while (remaining > 0 && advanceSlots.length > 0) {
      let allocatedInPass = false;
      for (const slot of advanceSlots) {
        if (remaining <= 0) break;
        const currentAdv = slot.advanceAmount + (allocation[slot.id] || 0);
        const partial = currentAdv % slot.costPerMonth;
        const needed =
          partial > 0 ? slot.costPerMonth - partial : slot.costPerMonth;
        const chunk = Math.min(remaining, Math.max(1, needed));
        allocation[slot.id] = (allocation[slot.id] || 0) + chunk;
        remaining -= chunk;
        allocatedInPass = true;
      }
      if (!allocatedInPass) break;
    }

    if (remaining > 0 && advanceSlots.length > 0) {
      allocation[advanceSlots[0].id] =
        (allocation[advanceSlots[0].id] || 0) + remaining;
      remaining = 0;
    }
  }

  return allocation;
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

  const [settlementMode, setSettlementMode] = useState<"auto" | "manual">(
    "auto",
  );
  const [autoAmountInput, setAutoAmountInput] = useState<string>("");
  const [manualAllocations, setManualAllocations] = useState<
    Record<string, number>
  >({});
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);


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
          const methods = result.paymentMethods || [];
          setPaymentMethods(methods);
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

  const slotItems = useMemo<SlotAllocationItem[]>(() => {
    const todayStr = new Date().toISOString().split("T")[0];

    return subscriptions.map((sub) => {
      const endStr = sub.kicked_at
        ? new Date(sub.kicked_at).toISOString().split("T")[0]
        : todayStr;
      const monthsConsumed = getCalendarMonthsElapsed(sub.start_date, endStr);
      const totalCostPerMonth =
        Number(sub.price_per_slot) * Number(sub.slots_count);
      const totalAmountPaid = Number(sub.total_amount_paid);
      const isKicked = sub.status === "kicked";

      let dueAmount = 0;
      let advanceAmount = 0;
      let monthsRemaining = Number(sub.months_paid || 0) - monthsConsumed;

      if (!isKicked) {
        if (!isNaN(totalAmountPaid) && totalAmountPaid > 0) {
          const consumedCash = monthsConsumed * totalCostPerMonth;
          const netCash = totalAmountPaid - consumedCash;
          if (netCash > 0.01) {
            advanceAmount = Math.round(netCash);
          } else if (netCash < -0.01) {
            dueAmount = Math.round(Math.abs(netCash));
          }
          if (totalCostPerMonth > 0) {
            monthsRemaining = netCash / totalCostPerMonth;
          }
        } else {
          if (monthsRemaining < -0.01) {
            dueAmount = Math.round(
              Math.abs(monthsRemaining) * totalCostPerMonth,
            );
          } else if (monthsRemaining > 0.01) {
            advanceAmount = Math.round(monthsRemaining * totalCostPerMonth);
          }
        }
      }

      const isDue = dueAmount > 0;
      const isAdvance = advanceAmount > 0;

      const paidUpTo = getPaidUpToMonthStr(sub.start_date, sub.months_paid);

      const monthsPaidNum = Number(sub.months_paid || 0);
      const fullMonthsPaid = Math.floor(monthsPaidNum);
      const nextMonthIndex = fullMonthsPaid + 1;
      const nextMonthName = getPaidUpToMonthStr(sub.start_date, nextMonthIndex);

      let status: "kicked" | "due" | "advance" | "current" = "current";
      if (isKicked) status = "kicked";
      else if (isDue) status = "due";
      else if (isAdvance) status = "advance";

      return {
        id: sub.id,
        userName: sub.user?.name || "Member",
        userContact: sub.user?.contact || undefined,
        planName: sub.plan?.name || "Shared Plan",
        planId: sub.plan_id,
        slotsCount: Number(sub.slots_count) || 1,
        costPerMonth: totalCostPerMonth,
        dueAmount,
        advanceAmount,
        monthsRemaining,
        startDate: sub.start_date,
        monthsPaid: Number(sub.months_paid) || 0,
        paidUpTo,
        nextMonthName,
        status,
        kickedAt: sub.kicked_at || undefined,
      };
    });
  }, [subscriptions]);

  const activeSlotItems = useMemo(
    () => slotItems.filter((s) => s.status !== "kicked"),
    [slotItems],
  );

  const totalOutstandingDue = useMemo(
    () => activeSlotItems.reduce((acc, curr) => acc + curr.dueAmount, 0),
    [activeSlotItems],
  );

  const totalAdvancePool = useMemo(
    () => activeSlotItems.reduce((acc, curr) => acc + curr.advanceAmount, 0),
    [activeSlotItems],
  );

  const monthlyRateTotal = useMemo(
    () => activeSlotItems.reduce((sum, s) => sum + s.costPerMonth, 0),
    [activeSlotItems],
  );

  const preset1Month = useMemo(() => {
    return activeSlotItems.reduce(
      (sum, slot) =>
        sum +
        (slot.dueAmount > 0
          ? slot.dueAmount
          : getAmountNeededForMonths(slot, 1)),
      0,
    );
  }, [activeSlotItems]);

  const preset2Months = useMemo(() => {
    return activeSlotItems.reduce(
      (sum, slot) =>
        sum +
        (slot.dueAmount > 0
          ? slot.dueAmount + slot.costPerMonth
          : getAmountNeededForMonths(slot, 2)),
      0,
    );
  }, [activeSlotItems]);

  const preset3Months = useMemo(() => {
    return activeSlotItems.reduce(
      (sum, slot) =>
        sum +
        (slot.dueAmount > 0
          ? slot.dueAmount + slot.costPerMonth * 2
          : getAmountNeededForMonths(slot, 3)),
      0,
    );
  }, [activeSlotItems]);

  const totalSlotsCount = useMemo(
    () => subscriptions.reduce((sum, s) => sum + (s.slots_count || 0), 0),
    [subscriptions],
  );

  const totalPaidSum = useMemo(
    () =>
      subscriptions.reduce(
        (sum, s) => sum + (Number(s.total_amount_paid) || 0),
        0,
      ),
    [subscriptions],
  );

  useEffect(() => {
    if (activeSlotItems.length > 0 && autoAmountInput === "") {
      if (totalOutstandingDue > 0) {
        setAutoAmountInput(totalOutstandingDue.toString());
      } else {
        setAutoAmountInput(preset1Month.toString());
      }
    }
  }, [activeSlotItems, totalOutstandingDue, preset1Month, autoAmountInput]);

  const currentAllocations = useMemo<Record<string, number>>(() => {
    if (settlementMode === "auto") {
      const parsedAmount = parseFloat(autoAmountInput) || 0;
      return computeAutoDistribution(activeSlotItems, parsedAmount);
    }
    const result: Record<string, number> = {};
    activeSlotItems.forEach((s) => {
      result[s.id] = manualAllocations[s.id] || 0;
    });
    return result;
  }, [settlementMode, autoAmountInput, activeSlotItems, manualAllocations]);

  const totalAllocatedAmount = useMemo(() => {
    return Object.values(currentAllocations).reduce(
      (sum, val) => sum + (val || 0),
      0,
    );
  }, [currentAllocations]);

  const handleManualSlotChange = (slotId: string, val: string) => {
    const num = Math.max(0, parseFloat(val) || 0);
    setManualAllocations((prev) => ({
      ...prev,
      [slotId]: num,
    }));
  };

  const handleApplyPreset = (amount: number) => {
    setSettlementMode("auto");
    setAutoAmountInput(amount.toString());
  };

  const handleManualQuickAdd = (slotId: string, addedAmount: number) => {
    setManualAllocations((prev) => {
      const existing = prev[slotId] || 0;
      return {
        ...prev,
        [slotId]: Math.max(0, existing + addedAmount),
      };
    });
  };

  const handleManualSetExact = (slotId: string, exactAmount: number) => {
    setManualAllocations((prev) => ({
      ...prev,
      [slotId]: exactAmount,
    }));
  };

  const itemizedNote = useMemo(() => {
    const breakdownItems = activeSlotItems
      .filter((s) => (currentAllocations[s.id] || 0) > 0)
      .map((s) => {
        const allocated = currentAllocations[s.id];
        return `${s.userName} (${s.planName}): ৳${allocated}`;
      });

    return `[${settlementMode === "auto" ? "Auto-Settle" : "Manual"}] ${breakdownItems.join(", ")}`;
  }, [activeSlotItems, currentAllocations, settlementMode]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center font-sans text-xs text-zinc-400">
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
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
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
              Total Outstanding Dues
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span
                className={`text-base font-semibold ${
                  totalOutstandingDue > 0
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-zinc-900 dark:text-zinc-100"
                }`}
              >
                ৳{totalOutstandingDue.toLocaleString()}
              </span>
              {totalOutstandingDue > 0 && (
                <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">
                  Due
                </span>
              )}
            </div>
          </div>

          <div>
            <span className="block text-[11px] text-zinc-400 font-medium uppercase tracking-wider">
              Prepaid Advance Balance
            </span>
            <span
              className={`text-base font-semibold mt-0.5 block ${
                totalAdvancePool > 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-zinc-900 dark:text-zinc-100"
              }`}
            >
              +৳{totalAdvancePool.toLocaleString()}
            </span>
          </div>

          <div>
            <span className="block text-[11px] text-zinc-400 font-medium uppercase tracking-wider">
              Monthly Total
            </span>
            <span className="text-base font-semibold mt-0.5 block text-zinc-900 dark:text-zinc-100">
              ৳{monthlyRateTotal.toLocaleString()}
            </span>
          </div>

          <div>
            <span className="block text-[11px] text-zinc-400 font-medium uppercase tracking-wider">
              Slots & Members
            </span>
            <span className="text-base font-semibold mt-0.5 block text-zinc-900 dark:text-zinc-100">
              {totalSlotsCount} slots · {subscriptions.length} members
            </span>
          </div>
        </div>

        <section className="border border-zinc-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-900 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-zinc-500" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                Payment Allocation
              </h2>
            </div>

            <div className="inline-flex border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800/80 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setSettlementMode("auto")}
                className={`px-3 py-1 font-medium transition-colors cursor-pointer ${
                  settlementMode === "auto"
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                Auto Distribute
              </button>
              <button
                type="button"
                onClick={() => {
                  setSettlementMode("manual");
                  if (Object.keys(manualAllocations).length === 0) {
                    setManualAllocations(currentAllocations);
                  }
                }}
                className={`px-3 py-1 font-medium transition-colors cursor-pointer ${
                  settlementMode === "manual"
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                Manual Per Slot
              </button>
            </div>
          </div>

          {settlementMode === "auto" ? (
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/80 space-y-3">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1.5 flex-1 max-w-sm">
                  <label
                    htmlFor="auto-amount-input"
                    className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 uppercase tracking-wide"
                  >
                    Payment Amount to Settle (৳)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500 dark:text-zinc-400 font-mono font-semibold">
                      ৳
                    </span>
                    <input
                      id="auto-amount-input"
                      type="number"
                      min="0"
                      step="1"
                      placeholder="Enter amount"
                      value={autoAmountInput}
                      onChange={(e) => setAutoAmountInput(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-sm bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 font-mono font-medium shadow-xs"
                    />
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Auto-settles smallest dues first, then rolls into advance for smaller plans.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <span className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                    Quick Presets
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    {totalOutstandingDue > 0 && (
                      <button
                        type="button"
                        onClick={() => handleApplyPreset(totalOutstandingDue)}
                        className="px-2.5 py-1.5 border border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-medium hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors cursor-pointer"
                      >
                        Clear Dues (৳{totalOutstandingDue.toLocaleString()})
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleApplyPreset(preset1Month)}
                      className="px-2.5 py-1.5 border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-medium hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                    >
                      1 Mo (৳{preset1Month.toLocaleString()})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset(preset2Months)}
                      className="px-2.5 py-1.5 border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-medium hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                    >
                      2 Mos (৳{preset2Months.toLocaleString()})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset(preset3Months)}
                      className="px-2.5 py-1.5 border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-medium hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                    >
                      3 Mos (৳{preset3Months.toLocaleString()})
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <p className="text-zinc-700 dark:text-zinc-300 font-medium">
                Adjust exact payment amounts for each member slot below:
              </p>
              <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                Total: ৳{totalAllocatedAmount.toLocaleString()}
              </span>
            </div>
          )}

          <div className="border border-zinc-200 dark:border-zinc-700/80">
            <div className="grid grid-cols-12 px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-700">
              <div className="col-span-6 sm:col-span-5">Member & Plan</div>
              <div className="hidden sm:block sm:col-span-4">Current Status & Paid Upto</div>
              <div className="col-span-6 sm:col-span-3 text-right">
                {settlementMode === "auto" ? "Allocated Amount" : "Custom Amount (৳)"}
              </div>
            </div>

            <div className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
              {activeSlotItems.map((slot) => {
                const allocated = currentAllocations[slot.id] || 0;
                const isDue = slot.dueAmount > 0;
                const targetPayUpToStr = getTargetPayUpToStr(slot, allocated);

                let impactText = "";
                if (allocated > 0) {
                  if (isDue) {
                    if (allocated >= slot.dueAmount) {
                      const extra = allocated - slot.dueAmount;
                      const extraMonths = Math.floor(
                        extra / Math.max(1, slot.costPerMonth),
                      );
                      impactText =
                        extraMonths > 0
                          ? `Clears due + ${extraMonths}mo advance`
                          : "Clears due";
                    } else {
                      const remainingDue = slot.dueAmount - allocated;
                      impactText = `৳${remainingDue.toLocaleString()} due left`;
                    }
                  } else {
                    const totalAdv = slot.advanceAmount + allocated;
                    const fullAdvMonths = Math.floor(
                      totalAdv / Math.max(1, slot.costPerMonth),
                    );
                    impactText =
                      fullAdvMonths > 0
                        ? `${fullAdvMonths}mo advance covered`
                        : `+৳${allocated.toLocaleString()} advance`;
                  }
                }

                return (
                  <div
                    key={slot.id}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                          {slot.userName}
                        </span>
                        <span className="text-zinc-400">·</span>
                        <span className="text-zinc-600 dark:text-zinc-400 font-medium truncate">
                          {slot.planName}
                          {slot.slotsCount > 1
                            ? ` (${slot.slotsCount} slots)`
                            : ""}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span>Paid to: {slot.paidUpTo}</span>
                        <span>·</span>
                        <span className="font-medium text-zinc-800 dark:text-zinc-200">
                          Pay upto: {targetPayUpToStr}
                        </span>
                        <span>·</span>
                        <span>Rate: ৳{slot.costPerMonth}/mo</span>
                        <span>·</span>
                        {slot.dueAmount > 0 ? (
                          <span className="inline-block px-1.5 py-0.2 text-[10px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900">
                            Due: ৳{slot.dueAmount.toLocaleString()}
                          </span>
                        ) : slot.advanceAmount > 0 ? (
                          <span className="inline-block px-1.5 py-0.2 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900">
                            Advance: +৳{slot.advanceAmount.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-zinc-400">Up to date</span>
                        )}
                      </div>
                    </div>

                    {settlementMode === "auto" ? (
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 shrink-0 min-w-[120px]">
                        <span className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          ৳{allocated.toLocaleString()}
                        </span>
                        {impactText ? (
                          <span className="text-[11px] text-zinc-600 dark:text-zinc-400 font-medium">
                            {impactText}
                          </span>
                        ) : (
                          <span className="text-[11px] text-zinc-400 dark:text-zinc-600">
                            —
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 shrink-0">
                        {slot.dueAmount > 0 ? (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                handleManualSetExact(slot.id, slot.dueAmount)
                              }
                              className="px-2 py-1 text-[11px] bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors cursor-pointer font-medium"
                            >
                              Due (৳{slot.dueAmount.toLocaleString()})
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleManualSetExact(
                                  slot.id,
                                  slot.dueAmount + slot.costPerMonth,
                                )
                              }
                              className="px-2 py-1 text-[11px] border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-medium transition-colors cursor-pointer"
                            >
                              +1 Mo (৳
                              {(
                                slot.dueAmount + slot.costPerMonth
                              ).toLocaleString()}
                              )
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                handleManualSetExact(
                                  slot.id,
                                  getAmountNeededForMonths(slot, 1),
                                )
                              }
                              className="px-2 py-1 text-[11px] border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-medium transition-colors cursor-pointer"
                            >
                              1 Mo (৳
                              {getAmountNeededForMonths(
                                slot,
                                1,
                              ).toLocaleString()}
                              )
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleManualSetExact(
                                  slot.id,
                                  getAmountNeededForMonths(slot, 2),
                                )
                              }
                              className="px-2 py-1 text-[11px] border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-medium transition-colors cursor-pointer"
                            >
                              2 Mos (৳
                              {getAmountNeededForMonths(
                                slot,
                                2,
                              ).toLocaleString()}
                              )
                            </button>
                          </>
                        )}
                        <div className="relative w-28">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400 text-xs font-mono font-semibold">
                            ৳
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={manualAllocations[slot.id] ?? ""}
                            placeholder="0"
                            onChange={(e) =>
                              handleManualSlotChange(slot.id, e.target.value)
                            }
                            className="w-full pl-6 pr-2.5 py-1 text-xs bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 font-mono font-medium text-right shadow-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Total to Settle
                </span>
                <span className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                  ৳{totalAllocatedAmount.toLocaleString()}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <a
                  href="#payment-details"
                  className="px-3.5 py-2 text-xs font-medium border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                >
                  View Accounts & Instructions ↓
                </a>
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors cursor-pointer shadow-xs"
                >
                  Submit Payment Verification (৳{totalAllocatedAmount.toLocaleString()})
                </button>
              </div>
            </div>

            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 border-t border-zinc-200 dark:border-zinc-700/60 pt-2.5">
              How it works: Transfer ৳{totalAllocatedAmount.toLocaleString()} to any payment account below, then click &quot;Submit Payment Verification&quot; with your Transaction ID.
            </p>
          </div>
        </section>

        <div id="payment-details">
          <DynamicPaymentCards
            id="payment-methods"
            clientId={
              scope?.clientId ||
              (scope?.type === "client" ? scope?.clientId : null)
            }
            clientName={scope?.label}
            subscriptionId={subscriptions[0]?.id}
            currency="৳"
            totalDue={
              totalAllocatedAmount > 0
                ? totalAllocatedAmount
                : totalOutstandingDue > 0
                  ? totalOutstandingDue
                  : monthlyRateTotal
            }
            defaultNotes={itemizedNote}
            externalModalOpen={isPaymentModalOpen}
            onExternalModalClose={() => setIsPaymentModalOpen(false)}
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
                className={`font-medium transition-colors cursor-pointer ${
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
                className={`font-medium transition-colors cursor-pointer ${
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
                const planSlotItems = slotItems.filter(
                  (slot) =>
                    slot.planId === plan.id &&
                    (showRemoved || slot.status !== "kicked"),
                );
                const activeSlots = planSlotItems.reduce(
                  (sum, s) =>
                    s.status !== "kicked" ? sum + Number(s.slotsCount) : sum,
                  0,
                );

                return (
                  <div key={plan.id} className="space-y-3">
                    <div className="flex items-baseline justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-2">
                      <h2 className="text-sm font-semibold tracking-tight">
                        {plan.name}
                      </h2>
                      <span className="text-xs text-zinc-500">
                        ৳{Number(plan.selling_price).toLocaleString()} / slot ·{" "}
                        {activeSlots} active
                      </span>
                    </div>

                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                      {planSlotItems.map((slot) => {
                        const isKicked = slot.status === "kicked";
                        const isDue = slot.status === "due";
                        const isAdvance = slot.status === "advance";

                        let badgeColor =
                          "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700";
                        let statusText = "Current";
                        let detailSubtext = `Current through ${slot.paidUpTo}. Next due for ${slot.nextMonthName}`;

                        if (isKicked) {
                          badgeColor =
                            "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border-zinc-200 dark:border-zinc-700";
                          statusText = "Kicked / Frozen";
                          detailSubtext = `Removed in ${getStartMonthStr(slot.kickedAt || "")}`;
                        } else if (isDue) {
                          badgeColor =
                            "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900";
                          statusText = `Due ৳${slot.dueAmount.toLocaleString()}`;
                          detailSubtext = `${slot.dueAmount} remains. Next for ${slot.nextMonthName}`;
                        } else if (isAdvance) {
                          badgeColor =
                            "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900";
                          statusText = `Advance +৳${slot.advanceAmount.toLocaleString()}`;
                          detailSubtext = `Paid through ${slot.paidUpTo}. Next due for ${slot.nextMonthName}`;
                        }

                        return (
                          <div
                            key={slot.id}
                            className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              isKicked ? "opacity-50" : ""
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-xs text-zinc-900 dark:text-zinc-100">
                                  {slot.userName}
                                </span>
                                <span className="text-[11px] text-zinc-400">
                                  ({slot.slotsCount}{" "}
                                  {slot.slotsCount === 1 ? "slot" : "slots"})
                                </span>
                                {slot.userContact && (
                                  <span className="text-[11px] text-zinc-400 ">
                                    · {slot.userContact}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-zinc-500">
                                <span>
                                  Started: {getStartMonthStr(slot.startDate)}
                                </span>
                                <span className="mx-2">·</span>
                                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                                  Paid Upto: {slot.paidUpTo}
                                </span>
                              </div>
                              <div className="text-[11px] text-zinc-400">
                                {detailSubtext}
                              </div>
                            </div>

                            <div className="flex items-center gap-6 sm:text-right">
                              <div>
                                <span className="block text-xs  text-zinc-900 dark:text-zinc-100">
                                  ৳{slot.costPerMonth.toLocaleString()} / mo
                                </span>
                              </div>

                              <div className="min-w-[120px] text-right">
                                <span
                                  className={`inline-block px-2 py-0.5 text-xs font-medium border ${badgeColor}`}
                                >
                                  {statusText}
                                </span>
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
                              <span className="text-[11px] text-zinc-400 block">
                                {planName}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-zinc-500 dark:text-zinc-400 ">
                              {
                                new Date(p.payment_date)
                                  .toISOString()
                                  .split("T")[0]
                              }
                            </td>
                            <td className="py-2.5 px-4 text-zinc-600 dark:text-zinc-400">
                              {p.notes || "Payment logged"}
                            </td>
                            <td className="py-2.5 px-4 text-right font-medium ">
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
