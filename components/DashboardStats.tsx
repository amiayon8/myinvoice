
import React from 'react';
import { Invoice } from '../types';

interface DashboardStatsProps {
  invoices: Invoice[];
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ invoices }) => {
  const totalInvoiced = invoices.reduce((sum, inv) => {
    const invTotal = inv.items?.reduce((s, item) => s + (item.quantity * item.rate), 0) || 0;
    return sum + invTotal;
  }, 0);

  const paidAmount = invoices
    .reduce((sum, inv) => {
      const invTotal = inv?.paid_amount || 0;
      return sum + invTotal;
    }, 0);

  const pendingAmount = totalInvoiced - paidAmount;

  const stats = [
    {
      label: 'Gross Volume',
      value: `৳ ${totalInvoiced.toLocaleString()}`,
      icon: 'fa-vault',
      color: 'bg-indigo-500/10 text-indigo-500',
    },
    {
      label: 'Total Collected',
      value: `৳ ${paidAmount.toLocaleString()}`,
      icon: 'fa-money-bill',
      color: 'bg-emerald-500/10 text-emerald-500',
    },
    {
      label: 'Outstanding',
      value: `৳ ${pendingAmount.toLocaleString()}`,
      icon: 'fa-fire-flame-curved',
      color: 'bg-orange-500/10 text-orange-500',
    }
  ];

  return (
    <div className="gap-8 grid grid-cols-1 md:grid-cols-3 mb-8 animate-slide-in no-print">
      {stats.map((stat, i) => (
        <div key={i} className="bg-white dark:bg-dark-card shadow-xl p-8 border border-slate-100 dark:border-white/5 rounded-lg transition-all hover:-translate-y-1">
          <div className="flex items-center gap-6">
            <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${stat.color} shadow-inner`}>
              <i className={`fa-solid ${stat.icon} text-2xl`}></i>
            </div>
            <div>
              <h3 className="mb-1 font-black text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{stat.label}</h3>
              <p className="font-black text-slate-900 dark:text-white text-3xl tracking-tighter">{stat.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
