'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { disburseLoan } from '@/services/loans';
import { Client } from '@/types';
import { useToast } from '@/components/ui/toast';

export default function NewLoanPage() {
  const router = useRouter();
  const supabase = createClient();
  const toast = useToast();

  const [clients, setClients] = useState<Client[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form Fields
  const [type, setType] = useState<'given' | 'taken'>('given');
  const [clientId, setClientId] = useState('');
  const [providerName, setProviderName] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [principalAmount, setPrincipalAmount] = useState('');
  const [interestRate, setInterestRate] = useState('0');
  const [disbursementDate, setDisbursementDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [repaymentSchedule, setRepaymentSchedule] = useState<'weekly' | 'monthly' | 'quarterly' | 'annually' | 'one_off'>('monthly');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const fetchDependencies = async () => {
      try {
        const [clientsRes, sourcesRes] = await Promise.all([
          supabase.from('clients').select('*').order('name'),
          supabase.from('loan_sources').select('*').order('name'),
        ]);
        setClients(clientsRes.data || []);
        setSources(sourcesRes.data || []);
      } catch (err) {
        console.error('Error fetching dependencies:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDependencies();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (type === 'given' && !clientId) {
      toast.error('Please select a lending client.');
      return;
    }
    if (type === 'taken' && !sourceId) {
      toast.error('Please select a loan source.');
      return;
    }
    if (!principalAmount || Number(principalAmount) <= 0) {
      toast.error('Please enter a valid principal amount.');
      return;
    }

    setIsSaving(true);
    try {
      const selectedSource = sources.find((s) => s.id === sourceId);
      await disburseLoan({
        type,
        client_id: type === 'given' ? clientId : undefined,
        provider_name: type === 'taken' ? (selectedSource?.name || '') : undefined,
        source_id: type === 'taken' ? sourceId : undefined,
        principal_amount: Number(principalAmount),
        interest_rate: Number(interestRate),
        disbursement_date: disbursementDate,
        due_date: dueDate || undefined,
        repayment_schedule: repaymentSchedule,
        notes,
      });

      toast.success('Loan disbursed successfully.');
      router.push('/loans');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Error disbursing loan');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[500px]">
        <div className="text-center">
          <div className="mx-auto mb-4 border-4 border-indigo-600 border-t-transparent rounded-full w-12 h-12 animate-spin"></div>
          <p className="font-black text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            Loading dependencies...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 mx-auto p-4 lg:p-12 max-w-2xl h-full font-sans">
      <div>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-bold uppercase tracking-wider mb-2 transition-colors"
        >
          <i className="fa-solid fa-arrow-left"></i> Cancel
        </button>
        <h1 className="font-black text-slate-800 dark:text-white text-xl lg:text-2xl uppercase tracking-tighter">
          Disburse New Loan
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-xs">
          Log a lending or borrowing principal profile into the audit network.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
        {/* Flow Type Selector */}
        <div>
          <label className="block mb-2 ml-1 font-black text-[9px] text-slate-400 uppercase tracking-widest">
            Flow Type
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setType('given')}
              className={`py-4 rounded-lg font-black text-xs uppercase tracking-widest border transition-all ${
                type === 'given'
                  ? 'bg-rose-50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-800/80 text-rose-600 dark:text-rose-400 shadow-sm ring-1 ring-rose-500'
                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500'
              }`}
            >
              Lending (Loans Given)
            </button>
            <button
              type="button"
              onClick={() => setType('taken')}
              className={`py-4 rounded-lg font-black text-xs uppercase tracking-widest border transition-all ${
                type === 'taken'
                  ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/80 text-emerald-600 dark:text-emerald-400 shadow-sm ring-1 ring-emerald-500'
                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500'
              }`}
            >
              Borrowing (Loans Taken)
            </button>
          </div>
        </div>

        {/* Entity Selector */}
        {type === 'given' ? (
          <div>
            <label className="block mb-1 ml-1 font-black text-[9px] text-slate-400 uppercase tracking-widest">
              Lending Recipient (Client)
            </label>
            <select
              required
              className="bg-slate-50 dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full dark:text-white text-sm"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="">Select recipient client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="block mb-1 ml-1 font-black text-[9px] text-slate-400 uppercase tracking-widest">
              Borrowing Provider Source
            </label>
            <select
              required
              className="bg-slate-50 dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full dark:text-white text-sm"
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
            >
              <option value="">Select loan source</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Principal & Interest */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 ml-1 font-black text-[9px] text-slate-400 uppercase tracking-widest">
              Principal Amount
            </label>
            <input
              type="number"
              required
              min="1"
              className="bg-slate-50 dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full dark:text-white text-sm"
              placeholder="৳ Principal"
              value={principalAmount}
              onChange={(e) => setPrincipalAmount(e.target.value)}
            />
          </div>
          <div>
            <label className="block mb-1 ml-1 font-black text-[9px] text-slate-400 uppercase tracking-widest">
              Interest Rate (% p.a.)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="bg-slate-50 dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full dark:text-white text-sm"
              placeholder="0.00"
              value={interestRate}
              onChange={(e) => setInterestRate(e.target.value)}
            />
          </div>
        </div>

        {/* Disbursement Date & Due Date */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 ml-1 font-black text-[9px] text-slate-400 uppercase tracking-widest">
              Disbursement Date
            </label>
            <input
              type="date"
              required
              className="bg-slate-50 dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-800 rounded-lg outline-none w-full dark:text-white text-sm"
              value={disbursementDate}
              onChange={(e) => setDisbursementDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block mb-1 ml-1 font-black text-[9px] text-slate-400 uppercase tracking-widest">
              Due Date (Optional)
            </label>
            <input
              type="date"
              className="bg-slate-50 dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-800 rounded-lg outline-none w-full dark:text-white text-sm"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        {/* Repayment Cadence */}
        <div>
          <label className="block mb-1 ml-1 font-black text-[9px] text-slate-400 uppercase tracking-widest">
            Repayment Schedule
          </label>
          <select
            className="bg-slate-50 dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full dark:text-white text-sm"
            value={repaymentSchedule}
            onChange={(e) => setRepaymentSchedule(e.target.value as any)}
          >
            <option value="monthly">Monthly Repayments</option>
            <option value="weekly">Weekly Repayments</option>
            <option value="quarterly">Quarterly Repayments</option>
            <option value="annually">Annual Repayments</option>
            <option value="one_off">One-Off Settlement</option>
          </select>
        </div>

        {/* Notes Memo */}
        <div>
          <label className="block mb-1 ml-1 font-black text-[9px] text-slate-400 uppercase tracking-widest">
            Internal Details & Notes
          </label>
          <textarea
            className="bg-slate-50 dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-800 rounded-lg outline-none w-full h-24 dark:text-white text-sm resize-none"
            placeholder="Disbursement details, terms or collateral description..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="w-full bg-indigo-600 hover:bg-indigo-700 py-4 rounded-lg font-black text-white text-xs uppercase tracking-widest transition-all mt-6 shadow-lg shadow-indigo-600/20"
        >
          {isSaving ? 'Synching...' : 'Commit Loan Disbursement'}
        </button>
      </form>
    </div>
  );
}
