'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { recordLoanRepayment, deleteLoanPayment } from '@/services/loans';
import { useToast } from '@/components/ui/toast';
import { DetailSkeleton } from '@/components/skeleton';

export default function LoanDetailsPage() {
  const router = useRouter();
  const { id: loanId } = useParams() as { id: string };
  const supabase = createClient();
  const toast = useToast();

  const [loan, setLoan] = useState<any | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'cash' | 'bank_transfer' | 'mobile_banking' | 'card' | 'other'>('bank_transfer');
  const [notes, setNotes] = useState('');
  const [isLoggingPayment, setIsLoggingPayment] = useState(false);

  const fetchData = async () => {
    try {
      const [loanRes, paymentsRes] = await Promise.all([
        supabase
          .from('loans')
          .select('*, client:clients(*)')
          .eq('id', loanId)
          .single(),
        supabase
          .from('loan_payments')
          .select('*')
          .eq('loan_id', loanId)
          .order('payment_date', { ascending: false }),
      ]);

      if (loanRes.error) throw loanRes.error;
      setLoan(loanRes.data);
      setPayments(paymentsRes.data || []);
    } catch (err) {
      console.error('Error fetching loan details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loanId) {
      fetchData();
    }
  }, [loanId]);

  const handleLogPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    setIsLoggingPayment(true);
    try {
      await recordLoanRepayment(loanId, Number(amount), method, notes);
      toast.success('Repayment recorded successfully.');
      setAmount('');
      setNotes('');
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Error recording payment');
    } finally {
      setIsLoggingPayment(false);
    }
  };

  const handleDeletePayment = async (id: string) => {
    if (!confirm('Delete this repayment entry?')) return;
    try {
      await deleteLoanPayment(id, loanId);
      toast.success('Repayment deleted successfully.');
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Error deleting payment');
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 mx-auto p-4 lg:p-12 max-w-7xl h-full font-sans animate-fade-in">
        <div className="flex justify-between items-center pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-2">
            <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse"></div>
            <div className="h-7 w-48 bg-slate-300 dark:bg-slate-700 rounded animate-pulse"></div>
          </div>
        </div>
        <DetailSkeleton />
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="p-8 text-center text-slate-500 italic">
        Loan record not found.
      </div>
    );
  }

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remainingBalance = Math.max(0, loan.principal_amount - totalPaid);

  return (
    <div className="space-y-8 mx-auto p-4 lg:p-12 max-w-7xl h-full font-sans">
      {/* Header Banner */}
      <div className="flex justify-between items-center pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <button
            onClick={() => router.push('/loans')}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-bold uppercase tracking-wider mb-2 transition-colors"
          >
            <i className="fa-solid fa-arrow-left"></i> Back to registry
          </button>
          <div className="flex items-center gap-4">
            <h1 className="font-black text-slate-800 dark:text-white text-xl lg:text-2xl uppercase tracking-tighter">
              Loan #{loan.id.substring(0, 8)}
            </h1>
            <span
              className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                loan.type === 'given'
                  ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400'
                  : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {loan.type === 'given' ? 'Lending (Client)' : 'Borrowing (Provider)'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Metrics & Form */}
        <div className="lg:col-span-2 space-y-8">
          {/* Financial Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-50 dark:bg-slate-900 shadow-sm p-6 rounded-xl border border-slate-200 dark:border-slate-800/80">
              <h4 className="font-black text-[9px] text-slate-400 uppercase tracking-widest mb-1">
                Principal Amount
              </h4>
              <p className="font-black text-slate-900 dark:text-white text-2xl">
                ৳{loan.principal_amount.toLocaleString()}
              </p>
              <span className="text-[10px] text-slate-400 font-bold block mt-1">
                Interest: {loan.interest_rate}%
              </span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900 shadow-sm p-6 rounded-xl border border-slate-200 dark:border-slate-800/80">
              <h4 className="font-black text-[9px] text-slate-400 uppercase tracking-widest mb-1">
                Amount Paid
              </h4>
              <p className="font-black text-emerald-500 text-2xl">
                ৳{totalPaid.toLocaleString()}
              </p>
              <span className="text-[10px] text-slate-400 font-bold block mt-1">
                {payments.length} repayments logged
              </span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900 shadow-sm p-6 rounded-xl border border-slate-200 dark:border-slate-800/80">
              <h4 className="font-black text-[9px] text-slate-400 uppercase tracking-widest mb-1">
                Remaining Due
              </h4>
              <p className="font-black text-rose-500 text-2xl">
                ৳{remainingBalance.toLocaleString()}
              </p>
              <span className="text-[10px] text-slate-400 font-bold block mt-1">
                Status: {loan.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>
          </div>

          {/* Details Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800/60 space-y-4">
            <h3 className="font-black text-[10px] text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">
              Disbursement Particulars
            </h3>
            <div className="grid grid-cols-2 gap-6 text-sm">
              <div>
                <span className="block text-slate-400 font-bold text-xs uppercase tracking-wider">
                  {loan.type === 'given' ? 'Lending Recipient' : 'Borrowing Provider'}
                </span>
                <span className="font-black text-slate-950 dark:text-slate-200 mt-1 block">
                  {loan.type === 'given' ? loan.client?.name : loan.provider_name}
                </span>
              </div>
              <div>
                <span className="block text-slate-400 font-bold text-xs uppercase tracking-wider">
                  Disbursement Date
                </span>
                <span className="font-black text-slate-950 dark:text-slate-200 mt-1 block">
                  {new Date(loan.disbursement_date).toLocaleDateString(undefined, {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
              {loan.due_date && (
                <div>
                  <span className="block text-slate-400 font-bold text-xs uppercase tracking-wider">
                    Due Repayment Date
                  </span>
                  <span className="font-black text-slate-950 dark:text-slate-200 mt-1 block">
                    {new Date(loan.due_date).toLocaleDateString(undefined, {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              )}
              {loan.repayment_schedule && (
                <div>
                  <span className="block text-slate-400 font-bold text-xs uppercase tracking-wider">
                    Schedule Cadence
                  </span>
                  <span className="font-black text-slate-950 dark:text-slate-200 mt-1 block capitalize">
                    {loan.repayment_schedule.replace('_', ' ')}
                  </span>
                </div>
              )}
              {loan.notes && (
                <div className="col-span-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="block text-slate-400 font-bold text-xs uppercase tracking-wider mb-1">
                    Internal Details & Memo
                  </span>
                  <p className="text-slate-600 dark:text-slate-400 text-xs italic leading-relaxed">
                    {loan.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Payment Registration Form */}
          {remainingBalance > 0 && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800/60 space-y-4">
              <h3 className="font-black text-[10px] text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">
                Log Repayment Installment
              </h3>
              <form onSubmit={handleLogPayment} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1 ml-1 font-black text-[8px] text-slate-400 uppercase">
                      Payment Amount
                    </label>
                    <input
                      type="number"
                      required
                      max={remainingBalance}
                      className="bg-slate-50 dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full dark:text-white text-sm"
                      placeholder="৳ Repayment amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block mb-1 ml-1 font-black text-[8px] text-slate-400 uppercase">
                      Payment Method
                    </label>
                    <select
                      className="bg-slate-50 dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full dark:text-white text-sm"
                      value={method}
                      onChange={(e) => setMethod(e.target.value as any)}
                    >
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="cash">Cash Payment</option>
                      <option value="mobile_banking">Mobile Banking</option>
                      <option value="card">Card Reader</option>
                      <option value="other">Other Method</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block mb-1 ml-1 font-black text-[8px] text-slate-400 uppercase">
                    Transaction ID / Reference Note
                  </label>
                  <input
                    type="text"
                    className="bg-slate-50 dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full dark:text-white text-sm"
                    placeholder="Reference notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoggingPayment}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 py-4 rounded-lg font-black text-white text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20"
                >
                  {isLoggingPayment ? 'Processing...' : 'Record Repayment Transaction'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right Column: Timeline Log */}
        <div className="space-y-4">
          <h3 className="font-black text-[10px] text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800 pb-2">
            Audit Repayments Log
          </h3>
          <div className="space-y-4">
            {payments.map((p) => (
              <div
                key={p.id}
                className="flex items-start gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl relative group animate-slide-in"
              >
                <div className="flex justify-center items-center bg-emerald-100 dark:bg-emerald-900/30 rounded-full w-8 h-8 text-emerald-600 dark:text-emerald-400 mt-1">
                  <i className="fa-solid fa-file-invoice-dollar text-xs"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <p className="font-black text-slate-950 dark:text-white text-sm">
                      ৳{p.amount.toLocaleString()}
                    </p>
                    <span className="text-[9px] text-slate-400">
                      {new Date(p.payment_date).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <span className="block font-black text-[8px] text-indigo-500 uppercase tracking-wider mt-0.5">
                    {p.payment_method.replace('_', ' ')}
                  </span>
                  {p.reference_notes && (
                    <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 leading-relaxed truncate">
                      {p.reference_notes}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDeletePayment(p.id)}
                  className="absolute right-4 top-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                  title="Remove repayment entry"
                >
                  <i className="fa-solid fa-trash-can text-xs"></i>
                </button>
              </div>
            ))}
            {payments.length === 0 && (
              <p className="text-slate-400 dark:text-slate-500 text-xs italic text-center py-6">
                No repayments audited yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
