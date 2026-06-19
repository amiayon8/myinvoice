'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { deleteLoan } from '@/services/loans';
import { useToast } from '@/components/ui/toast';
import { TableSkeleton } from '@/components/skeleton';

export default function LoansDashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const toast = useToast();

  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'all' | 'given' | 'taken'>('all');

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch loans, including client details and payments
      const [loansRes, paymentsRes] = await Promise.all([
        supabase
          .from('loans')
          .select('*, client:clients(name)')
          .order('disbursement_date', { ascending: false }),
        supabase.from('loan_payments').select('*'),
      ]);

      if (loansRes.error) throw loansRes.error;
      
      const loansData = loansRes.data || [];
      const paymentsData = paymentsRes.data || [];

      // Map payments into loans to compute remaining balances
      const enrichedLoans = loansData.map((loan) => {
        const loanPayments = paymentsData.filter((p) => p.loan_id === loan.id);
        const totalPaid = loanPayments.reduce((sum, p) => sum + p.amount, 0);
        const remainingBalance = Math.max(0, loan.principal_amount - totalPaid);

        return {
          ...loan,
          total_paid: totalPaid,
          remaining_balance: remainingBalance,
          payments_count: loanPayments.length,
        };
      });

      setLoans(enrichedLoans);
    } catch (err) {
      console.error('Error fetching loans data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this loan record? All history will be lost.')) return;
    try {
      await deleteLoan(id);
      toast.success('Loan record deleted successfully.');
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Error deleting loan');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'closed':
        return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400';
      case 'partially_paid':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
      case 'overdue':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
      default:
        return 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400';
    }
  };

  // Compute overall summary stats
  const stats = loans.reduce(
    (acc, loan) => {
      if (loan.type === 'given') {
        acc.givenPrincipal += loan.principal_amount;
        acc.givenOutstanding += loan.remaining_balance;
      } else {
        acc.takenPrincipal += loan.principal_amount;
        acc.takenOutstanding += loan.remaining_balance;
      }
      return acc;
    },
    { givenPrincipal: 0, givenOutstanding: 0, takenPrincipal: 0, takenOutstanding: 0 }
  );

  const filteredLoans = loans.filter((l) => {
    if (typeFilter === 'all') return true;
    return l.type === typeFilter;
  });

  if (loading) {
    return (
      <div className="space-y-8 mx-auto p-4 lg:p-12 max-w-7xl h-full font-sans animate-fade-in">
        <div className="flex justify-between items-center mb-8 no-print">
          <div className="space-y-2">
            <div className="h-7 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse"></div>
            <div className="h-3 w-64 bg-slate-100 dark:bg-slate-900 rounded animate-pulse"></div>
          </div>
        </div>
        {/* Skeleton cards */}
        <div className="gap-8 grid grid-cols-1 md:grid-cols-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 shadow-sm p-6 border border-slate-100 dark:border-slate-800/60 rounded-lg space-y-3">
              <div className="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse"></div>
              <div className="h-8 w-36 bg-slate-300 dark:bg-slate-700 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
        <TableSkeleton rows={6} cols={9} />
      </div>
    );
  }

  return (
    <div className="space-y-8 mx-auto p-4 lg:p-12 max-w-7xl h-full font-sans">
      <div className="flex justify-between items-center mb-8 no-print">
        <div>
          <h1 className="font-black text-slate-800 dark:text-white text-xl lg:text-2xl uppercase tracking-tighter">
            Loan Management
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs">
            Disburse loans, monitor interest rates, and track repayments.
          </p>
        </div>
        <button
          onClick={() => router.push('/loans/new')}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-lg font-black text-white text-xs uppercase tracking-widest transition-colors shadow-lg shadow-indigo-600/20"
        >
          <i className="fa-solid fa-plus"></i> Disburse Loan
        </button>
      </div>

      {/* Summary Cards */}
      <div className="gap-8 grid grid-cols-1 md:grid-cols-4 mb-8 animate-slide-in">
        <div className="bg-white dark:bg-slate-900 shadow-xl p-6 border border-slate-100 dark:border-slate-800/60 rounded-lg">
          <h3 className="mb-1 font-black text-[9px] text-slate-400 uppercase tracking-widest">
            Total Lending (Given)
          </h3>
          <p className="font-black text-slate-900 dark:text-white text-2xl tracking-tighter">
            ৳{stats.givenPrincipal.toLocaleString()}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 shadow-xl p-6 border border-slate-100 dark:border-slate-800/60 rounded-lg">
          <h3 className="mb-1 font-black text-[9px] text-slate-400 uppercase tracking-widest">
            Lending Outstanding
          </h3>
          <p className="font-black text-rose-500 text-2xl tracking-tighter">
            ৳{stats.givenOutstanding.toLocaleString()}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 shadow-xl p-6 border border-slate-100 dark:border-slate-800/60 rounded-lg">
          <h3 className="mb-1 font-black text-[9px] text-slate-400 uppercase tracking-widest">
            Total Borrowed (Taken)
          </h3>
          <p className="font-black text-slate-900 dark:text-white text-2xl tracking-tighter">
            ৳{stats.takenPrincipal.toLocaleString()}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 shadow-xl p-6 border border-slate-100 dark:border-slate-800/60 rounded-lg">
          <h3 className="mb-1 font-black text-[9px] text-slate-400 uppercase tracking-widest">
            Borrowing Outstanding
          </h3>
          <p className="font-black text-emerald-500 text-2xl tracking-tighter">
            ৳{stats.takenOutstanding.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Tabs Filter */}
      <div className="flex gap-2 mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">
        {(['all', 'given', 'taken'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setTypeFilter(tab)}
            className={`px-5 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${
              typeFilter === tab
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {tab === 'all' ? 'All Loans' : tab === 'given' ? 'Lending (Given)' : 'Borrowing (Taken)'}
          </button>
        ))}
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-slate-900 shadow-xl border border-slate-100 dark:border-slate-800/50 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-slate-50 dark:bg-slate-950/50 font-black text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Flow Type</th>
                <th className="px-6 py-4">Client / Provider</th>
                <th className="px-6 py-4">Disbursed Date</th>
                <th className="px-6 py-4">Interest Rate</th>
                <th className="px-6 py-4">Principal</th>
                <th className="px-6 py-4">Outstanding</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {filteredLoans.map((loan) => (
                <tr
                  key={loan.id}
                  onClick={() => router.push(`/loans/${loan.id}`)}
                  className="group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-900 dark:text-slate-200 text-xs truncate max-w-[120px] block">
                      {loan.id.substring(0, 8)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                        loan.type === 'given'
                          ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400'
                          : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {loan.type === 'given' ? 'Lending' : 'Borrowing'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-900 dark:text-slate-200 text-sm">
                      {loan.type === 'given' ? loan.client?.name || '---' : loan.provider_name || '---'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs">
                    {new Date(loan.disbursement_date).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-950 dark:text-slate-300 text-sm">
                    {loan.interest_rate}%
                  </td>
                  <td className="px-6 py-4 font-black text-slate-900 dark:text-white text-sm">
                    ৳{loan.principal_amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 font-black text-slate-900 dark:text-white text-sm">
                    ৳{loan.remaining_balance.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${getStatusColor(
                        loan.status
                      )}`}
                    >
                      {loan.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={(e) => handleDelete(loan.id, e)}
                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                        title="Delete record"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredLoans.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-slate-400 dark:text-slate-500 text-sm text-center italic">
                    No loan records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
