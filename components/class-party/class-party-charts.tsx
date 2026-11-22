"use client";

import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Utensils,
  CreditCard,
  Users,
  PieChart as PieChartIcon,
  BarChart3,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { getClassPartyFinancials } from "@/lib/class-party-calc";

interface RegistrationItem {
  id: string;
  full_name: string;
  selected_option_title: string;
  selected_option_category: string;
  payment_method: "cash" | "bkash";
  payment_status: "pending" | "verified" | "rejected";
  subtotal_with_vat?: number;
  total_payable?: number;
  paid_amount?: number;
  due_amount?: number;
  cash_paid_to?: string | null;
}

interface ClassPartyChartsProps {
  registrations: RegistrationItem[];
  showFinancials?: boolean;
}

const MENU_PALETTE = [
  "#8b5cf6",
  "#3b82f6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#6366f1",
  "#14b8a6",
];

const STATUS_PALETTE: Record<string, string> = {
  verified: "#10b981",
  pending: "#f59e0b",
  rejected: "#ef4444",
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  valueSuffix?: string;
}

function CustomBarTooltip({
  active,
  payload,
  label,
  valueSuffix = "",
}: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-3 text-xs space-y-1">
      <p className="font-bold text-zinc-900 dark:text-zinc-100">{label}</p>
      {payload.map((item: any, index: number) => (
        <div
          key={index}
          className="flex items-center justify-between gap-4 text-[11px]"
        >
          <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: item.color || item.fill }}
            />
            {item.name}:
          </span>
          <span className="font-bold text-zinc-900 dark:text-zinc-100">
            {typeof item.value === "number"
              ? item.value.toLocaleString()
              : item.value}{" "}
            {valueSuffix}
          </span>
        </div>
      ))}
    </div>
  );
}

function CustomPieTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-3 text-xs space-y-1">
      <p className="font-bold text-zinc-900 dark:text-zinc-100">{item.name}</p>
      <div className="flex items-center justify-between gap-4 text-[11px]">
        <span className="text-zinc-500">Total:</span>
        <span
          className="font-bold"
          style={{ color: item.payload.fill || item.color }}
        >
          {Number(item.value).toLocaleString()}{" "}
          {item.payload.percent !== undefined
            ? `(${item.payload.percent}%)`
            : ""}
        </span>
      </div>
    </div>
  );
}

export function ClassPartyCharts({
  registrations,
  showFinancials = true,
}: ClassPartyChartsProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<"menu" | "methods" | "coordinators">(
    "menu",
  );

  const menuBreakdownData = useMemo(() => {
    const counts: Record<string, { count: number; totalAmount: number }> = {};
    registrations.forEach((record) => {
      const title = record.selected_option_title || "Unspecified";
      if (!counts[title]) {
        counts[title] = { count: 0, totalAmount: 0 };
      }
      const fin = getClassPartyFinancials(record as any);
      counts[title].count += 1;
      counts[title].totalAmount += fin.subtotal;
    });

    const total = registrations.length || 1;
    return Object.entries(counts)
      .map(([name, data]) => ({
        name,
        count: data.count,
        percent: Math.round((data.count / total) * 100),
        amount: data.totalAmount,
      }))
      .sort((a, b) => b.count - a.count);
  }, [registrations]);

  const methodStatusData = useMemo(() => {
    const dataMap = {
      bkash: {
        name: "bKash (Ayon)",
        verified: 0,
        pending: 0,
        rejected: 0,
        totalCount: 0,
        totalAmount: 0,
      },
      cash: {
        name: "Cash",
        verified: 0,
        pending: 0,
        rejected: 0,
        totalCount: 0,
        totalAmount: 0,
      },
    };

    registrations.forEach((r) => {
      const method = r.payment_method === "bkash" ? "bkash" : "cash";
      dataMap[method].totalCount += 1;
      dataMap[method].totalAmount += Number(r.total_payable) || 0;

      if (r.payment_status === "verified") {
        dataMap[method].verified += 1;
      } else if (r.payment_status === "rejected") {
        dataMap[method].rejected += 1;
      } else {
        dataMap[method].pending += 1;
      }
    });

    return [dataMap.bkash, dataMap.cash];
  }, [registrations]);

  const paymentMethodPieData = useMemo(() => {
    const bkashCount = registrations.filter(
      (r) => r.payment_method === "bkash",
    ).length;
    const cashCount = registrations.filter(
      (r) => r.payment_method === "cash",
    ).length;
    const total = registrations.length || 1;

    return [
      {
        name: "bKash",
        value: bkashCount,
        percent: Math.round((bkashCount / total) * 100),
        color: "#ec4899",
      },
      {
        name: "Cash",
        value: cashCount,
        percent: Math.round((cashCount / total) * 100),
        color: "#10b981",
      },
    ];
  }, [registrations]);

  const coordinatorData = useMemo(() => {
    const collectors: Record<
      string,
      { coordinator: string; cashCount: number; cashTotal: number }
    > = {};

    registrations.forEach((r) => {
      if (r.payment_method === "cash" && r.cash_paid_to) {
        const person = String(r.cash_paid_to).trim();
        const fin = getClassPartyFinancials(r as any);
        if (!collectors[person]) {
          collectors[person] = {
            coordinator: person,
            cashCount: 0,
            cashTotal: 0,
          };
        }
        collectors[person].cashCount += 1;
        collectors[person].cashTotal += fin.paidAmount;
      }
    });

    return Object.values(collectors).sort((a, b) => b.cashTotal - a.cashTotal);
  }, [registrations]);

  if (registrations.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden">
      <div className="p-4 sm:p-5 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-500/10 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              Visual Analytics & Distribution
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Interactive breakdowns of menu choices, payment channels, and
              collections
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isExpanded && (
            <div className="hidden sm:flex items-center p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab("menu")}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "menu"
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                    : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                <Utensils className="w-3.5 h-3.5" />
                Menu Choices
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("methods")}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "methods"
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                    : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                Payment Methods
              </button>
              {showFinancials && coordinatorData.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab("coordinators")}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                    activeTab === "coordinators"
                      ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  Coordinators
                </button>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition cursor-pointer"
            title={isExpanded ? "Collapse Analytics" : "Expand Analytics"}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 sm:p-6 space-y-6">
          <div className="flex sm:hidden items-center justify-around p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab("menu")}
              className={`flex-1 py-1.5 rounded-lg text-center transition cursor-pointer ${
                activeTab === "menu"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                  : "text-zinc-500"
              }`}
            >
              Menu
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("methods")}
              className={`flex-1 py-1.5 rounded-lg text-center transition cursor-pointer ${
                activeTab === "methods"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                  : "text-zinc-500"
              }`}
            >
              Methods
            </button>
            {showFinancials && coordinatorData.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab("coordinators")}
                className={`flex-1 py-1.5 rounded-lg text-center transition cursor-pointer ${
                  activeTab === "coordinators"
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                    : "text-zinc-500"
                }`}
              >
                Coordinators
              </button>
            )}
          </div>

          {activeTab === "menu" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
              <div className="lg:col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                    Menu Selection Order Count
                  </h3>
                  <span className="text-xs text-zinc-500">
                    Total: {registrations.length} attendees
                  </span>
                </div>
                <div className="h-64 sm:h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={menuBreakdownData}
                      layout="vertical"
                      margin={{ top: 10, right: 20, left: 20, bottom: 10 }}
                    >
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11, fill: "#71717a" }}
                        allowDecimals={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 11, fill: "#71717a" }}
                        width={140}
                      />
                      <Tooltip
                        content={<CustomBarTooltip valueSuffix="attendees" />}
                      />
                      <Bar
                        dataKey="count"
                        name="Attendees"
                        radius={[0, 8, 8, 0]}
                      >
                        {menuBreakdownData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={MENU_PALETTE[index % MENU_PALETTE.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                  <PieChartIcon className="w-3.5 h-3.5 text-violet-500" />
                  Menu Share Proportion
                </h4>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={menuBreakdownData}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={36}
                        outerRadius={64}
                        paddingAngle={3}
                      >
                        {menuBreakdownData.map((_, index) => (
                          <Cell
                            key={`pie-cell-${index}`}
                            fill={MENU_PALETTE[index % MENU_PALETTE.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto pt-1">
                  {menuBreakdownData.map((item, index) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 truncate max-w-[170px]">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{
                            backgroundColor:
                              MENU_PALETTE[index % MENU_PALETTE.length],
                          }}
                        />
                        <span className="truncate">{item.name}</span>
                      </span>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100 shrink-0">
                        {item.count} ({item.percent}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "methods" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
              <div className="lg:col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                    Payment Status Breakdown by Method
                  </h3>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      Verified
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      Pending
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                      Rejected
                    </span>
                  </div>
                </div>

                <div className="h-64 sm:h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={methodStatusData}
                      margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
                    >
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12, fill: "#71717a" }}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#71717a" }}
                        allowDecimals={false}
                      />
                      <Tooltip
                        content={<CustomBarTooltip valueSuffix="attendees" />}
                      />
                      <Bar
                        dataKey="verified"
                        name="Verified"
                        fill={STATUS_PALETTE.verified}
                        stackId="a"
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="pending"
                        name="Pending"
                        fill={STATUS_PALETTE.pending}
                        stackId="a"
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="rejected"
                        name="Rejected"
                        fill={STATUS_PALETTE.rejected}
                        stackId="a"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-pink-500" />
                  Channel Preference
                </h4>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentMethodPieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={36}
                        outerRadius={64}
                        paddingAngle={4}
                      >
                        {paymentMethodPieData.map((entry, index) => (
                          <Cell key={`channel-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2 pt-1 border-t border-zinc-200/60 dark:border-zinc-800/60">
                  {paymentMethodPieData.map((channel) => (
                    <div
                      key={channel.name}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="flex items-center gap-1.5 font-semibold text-zinc-700 dark:text-zinc-300">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: channel.color }}
                        />
                        {channel.name}
                      </span>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        {channel.value} ({channel.percent}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "coordinators" && showFinancials && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                  Cash Collections by Coordinator
                </h3>
                <span className="text-xs text-zinc-500">
                  Total Active Cash Collectors: {coordinatorData.length}
                </span>
              </div>

              <div className="h-64 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={coordinatorData}
                    margin={{ top: 10, right: 20, left: 10, bottom: 25 }}
                  >
                    <XAxis
                      dataKey="coordinator"
                      tick={{ fontSize: 11, fill: "#71717a" }}
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#71717a" }}
                      tickFormatter={(val) => `৳${val}`}
                    />
                    <Tooltip
                      content={
                        <CustomBarTooltip
                          label="Coordinator"
                          valueSuffix="BDT"
                        />
                      }
                    />
                    <Bar
                      dataKey="cashTotal"
                      name="Collected Amount"
                      fill="#10b981"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
