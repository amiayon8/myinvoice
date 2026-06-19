'use client';

import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Invoice } from '@/types';

interface RevenueChartsProps {
  invoices: Invoice[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function getInvoiceTotal(invoice: Invoice) {
  const subtotal = invoice.items?.reduce((s, i) => s + i.quantity * i.rate, 0) || 0;
  const tax = subtotal * ((invoice.tax_rate || 0) / 100);
  return subtotal + tax;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  currency?: string;
}

function CustomBarTooltip({ active, payload, label, currency = '৳' }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-3 text-xs">
      <p className="font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-bold">
          {p.name}: {currency}{Number(p.value).toLocaleString()}
        </p>
      ))}
    </div>
  );
}

function CustomPieTooltip({ active, payload, currency = '৳' }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-3 text-xs">
      <p className="font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{item.name}</p>
      <p style={{ color: item.payload.fill }} className="font-bold">
        {currency}{Number(item.value).toLocaleString()} ({item.payload.percent}%)
      </p>
    </div>
  );
}

export function RevenueCharts({ invoices }: RevenueChartsProps) {
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly');
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');

  const currentYear = new Date().getFullYear();

  // Monthly data (current year)
  const monthlyData = useMemo(() => {
    return MONTHS.map((month, idx) => {
      const monthInvoices = invoices.filter((inv) => {
        if (!inv.date) return false;
        const d = new Date(inv.date);
        return d.getFullYear() === currentYear && d.getMonth() === idx;
      });
      const revenue = monthInvoices.reduce((s, inv) => s + getInvoiceTotal(inv), 0);
      const paid = monthInvoices.reduce((s, inv) => s + (inv.paid_amount || 0), 0);
      const due = revenue - paid;
      return { name: month, Revenue: Math.round(revenue), Paid: Math.round(paid), Due: Math.round(due) };
    });
  }, [invoices, currentYear]);

  // Yearly data (last 5 years)
  const yearlyData = useMemo(() => {
    const years = Array.from({ length: 5 }, (_, i) => currentYear - 4 + i);
    return years.map((year) => {
      const yearInvoices = invoices.filter((inv) => {
        if (!inv.date) return false;
        return new Date(inv.date).getFullYear() === year;
      });
      const revenue = yearInvoices.reduce((s, inv) => s + getInvoiceTotal(inv), 0);
      const paid = yearInvoices.reduce((s, inv) => s + (inv.paid_amount || 0), 0);
      const due = revenue - paid;
      return { name: String(year), Revenue: Math.round(revenue), Paid: Math.round(paid), Due: Math.round(due) };
    });
  }, [invoices, currentYear]);

  // Pie data — status breakdown
  const statusData = useMemo(() => {
    const map: Record<string, number> = {};
    invoices.forEach((inv) => {
      const status = inv.status || 'draft';
      const total = getInvoiceTotal(inv);
      map[status] = (map[status] || 0) + total;
    });
    const total = Object.values(map).reduce((s, v) => s + v, 0);
    return Object.entries(map)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value: Math.round(value),
        percent: total > 0 ? Math.round((value / total) * 100) : 0,
      }));
  }, [invoices]);

  const barData = viewMode === 'monthly' ? monthlyData : yearlyData;
  const currency = invoices[0]?.currency || '৳';

  const formatYAxis = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
    return String(value);
  };

  return (
    <div className="bg-white dark:bg-slate-900 shadow-xl border border-slate-100 dark:border-slate-800/50 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-widest">
            Revenue Analytics
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">Invoice totals, payments and outstanding amounts</p>
        </div>
        <div className="flex gap-2">
          {/* Chart type toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 gap-1">
            <button
              onClick={() => setChartType('bar')}
              className={`px-3 py-1.5 rounded-md font-bold text-xs transition-all ${
                chartType === 'bar'
                  ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <i className="fa-solid fa-chart-bar mr-1.5"></i>Bar
            </button>
            <button
              onClick={() => setChartType('pie')}
              className={`px-3 py-1.5 rounded-md font-bold text-xs transition-all ${
                chartType === 'pie'
                  ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <i className="fa-solid fa-chart-pie mr-1.5"></i>Pie
            </button>
          </div>
          {/* Period toggle (only for bar) */}
          {chartType === 'bar' && (
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 gap-1">
              <button
                onClick={() => setViewMode('monthly')}
                className={`px-3 py-1.5 rounded-md font-bold text-xs transition-all ${
                  viewMode === 'monthly'
                    ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setViewMode('yearly')}
                className={`px-3 py-1.5 rounded-md font-bold text-xs transition-all ${
                  viewMode === 'yearly'
                    ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                Yearly
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chart body */}
      <div className="p-5">
        {chartType === 'bar' && (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8', letterSpacing: '0.05em' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={formatYAxis}
                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <Tooltip content={<CustomBarTooltip currency={currency} />} cursor={{ fill: 'rgba(99,102,241,0.05)' }} />
              <Bar dataKey="Revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Paid" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Due" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {chartType === 'pie' && (
          <div className="flex flex-col md:flex-row items-center gap-6">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {statusData.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip currency={currency} />} />
                <Legend
                  formatter={(value) => (
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em' }}>
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Breakdown list */}
            <div className="w-full md:w-56 shrink-0 space-y-2">
              {statusData.map((entry, i) => (
                <div key={entry.name} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                    ></span>
                    <span className="font-bold text-slate-600 dark:text-slate-400 text-xs">{entry.name}</span>
                  </div>
                  <span className="font-black text-slate-800 dark:text-white text-xs">
                    {currency}{entry.value.toLocaleString()}
                    <span className="text-slate-400 font-bold ml-1">({entry.percent}%)</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Legend for bar */}
        {chartType === 'bar' && (
          <div className="flex gap-4 mt-4 justify-center">
            {[
              { label: 'Revenue', color: '#6366f1' },
              { label: 'Paid', color: '#10b981' },
              { label: 'Due', color: '#f43f5e' },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: color }}></span>
                <span className="font-bold text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider">
                  {label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
