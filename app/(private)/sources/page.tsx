'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { saveLoanSource, deleteLoanSource } from '@/services/loans';
import { LoanSource } from '@/types';
import { useToast } from '@/components/ui/toast';
import { TableSkeleton } from '@/components/skeleton';

export default function LoanSourcesPage() {
  const supabase = createClient();
  const toast = useToast();

  const [sources, setSources] = useState<LoanSource[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  
  const [editingSource, setEditingSource] = useState<Partial<LoanSource> | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sourcesRes, loansRes, paymentsRes] = await Promise.all([
        supabase.from('loan_sources').select('*').order('name'),
        supabase.from('loans').select('*').eq('type', 'taken'),
        supabase.from('loan_payments').select('*'),
      ]);

      setSources(sourcesRes.data || []);
      setLoans(loansRes.data || []);
      setPayments(paymentsRes.data || []);
    } catch (err) {
      console.error('Error fetching loan sources details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (sourceData: Partial<LoanSource>) => {
    if (!sourceData.name) {
      toast.error('Source name is required.');
      return;
    }
    setIsSaving(true);
    try {
      await saveLoanSource(sourceData);
      toast.success('Loan source saved successfully.');
      setEditingSource(null);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Error saving loan source');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this loan source?')) return;
    try {
      await deleteLoanSource(id);
      toast.success('Loan source deleted successfully.');
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Error deleting loan source');
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 mx-auto p-4 lg:p-12 max-w-7xl h-full font-sans animate-fade-in">
        <div className="flex justify-between items-center mb-8 no-print">
          <div className="space-y-2">
            <div className="h-7 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse"></div>
            <div className="h-3 w-64 bg-slate-100 dark:bg-slate-900 rounded animate-pulse"></div>
          </div>
        </div>
        <TableSkeleton rows={6} cols={6} />
      </div>
    );
  }

  return (
    <div className="space-y-8 mx-auto p-4 lg:p-12 max-w-7xl h-full font-sans animate-fade-in">
      <div className="flex justify-between items-center mb-8 no-print">
        <div>
          <h1 className="font-black text-slate-800 dark:text-white text-xl lg:text-2xl uppercase tracking-tighter">
            Loan Sources Registry
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs">
            Manage your loan providers, banks, and lending entities.
          </p>
        </div>
        <button
          onClick={() => setEditingSource({ name: '', email: '', phone: '' })}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-lg font-black text-white text-xs uppercase tracking-widest transition-colors shadow-lg shadow-indigo-600/20"
        >
          <i className="fa-solid fa-plus"></i> Add Loan Source
        </button>
      </div>

      {/* Basic Table */}
      <div className="bg-white dark:bg-slate-900 shadow-xl border border-slate-100 dark:border-slate-800/50 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left">
            <thead className="bg-slate-50 dark:bg-slate-950/50 font-black text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Total Borrowed</th>
                <th className="px-6 py-4">Total Repaid</th>
                <th className="px-6 py-4">Outstanding</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {sources.map((source) => {
                // Filter loans taken from this source
                const sourceLoans = loans.filter((l) => l.source_id === source.id);
                const totalBorrowed = sourceLoans.reduce((sum, l) => sum + l.principal_amount, 0);
                
                // Sum repayments for these loans
                const sourceLoanIds = sourceLoans.map((l) => l.id);
                const totalRepaid = payments
                  .filter((p) => sourceLoanIds.includes(p.loan_id))
                  .reduce((sum, p) => sum + p.amount, 0);

                const outstanding = Math.max(0, totalBorrowed - totalRepaid);

                return (
                  <tr
                    key={source.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-900 dark:text-slate-200 text-sm">
                        {source.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-xs">
                      {source.phone || <span className="text-slate-300 dark:text-slate-700 italic">None</span>}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-xs">
                      {source.email || <span className="text-slate-300 dark:text-slate-700 italic">None</span>}
                    </td>
                    <td className="px-6 py-4 font-black text-slate-700 dark:text-slate-300 text-sm">
                      ৳{totalBorrowed.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-black text-emerald-500 text-sm">
                      ৳{totalRepaid.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-black text-rose-500 text-sm">
                      ৳{outstanding.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => setEditingSource(source)}
                          className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                          title="Edit"
                        >
                          <i className="fa-solid fa-pen text-xs"></i>
                        </button>
                        <button
                          onClick={(e) => handleDelete(source.id, e)}
                          className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          <i className="fa-solid fa-trash text-xs"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {sources.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-slate-400 dark:text-slate-500 text-sm text-center italic">
                    No loan sources registered yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Editor Modal */}
      {editingSource && (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-slate-950/60 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 shadow-2xl p-10 border border-slate-200 dark:border-slate-800 rounded-lg w-full max-w-md animate-slide-in">
            <h2 className="mb-8 font-black text-slate-900 dark:text-white text-2xl uppercase tracking-tighter">
              {editingSource.id ? 'Edit Loan Source' : 'New Loan Source'}
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block mb-1 ml-1 font-black text-[10px] text-slate-400 uppercase tracking-widest">
                  Lending Source Name
                </label>
                <input
                  required
                  className="bg-slate-50 dark:bg-slate-950/50 p-5 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full dark:text-white text-sm"
                  placeholder="e.g. Acme Bank, Loan Provider Inc."
                  value={editingSource.name || ''}
                  onChange={(e) => setEditingSource({ ...editingSource, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block mb-1 ml-1 font-black text-[10px] text-slate-400 uppercase tracking-widest">
                  Email Contact
                </label>
                <input
                  type="email"
                  className="bg-slate-50 dark:bg-slate-950/50 p-5 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full dark:text-white text-sm"
                  placeholder="contact@lender.com"
                  value={editingSource.email || ''}
                  onChange={(e) => setEditingSource({ ...editingSource, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block mb-1 ml-1 font-black text-[10px] text-slate-400 uppercase tracking-widest">
                  Phone Number
                </label>
                <input
                  className="bg-slate-50 dark:bg-slate-950/50 p-5 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full dark:text-white text-sm"
                  placeholder="Phone"
                  value={editingSource.phone || ''}
                  onChange={(e) => setEditingSource({ ...editingSource, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-4 mt-10">
              <button
                onClick={() => setEditingSource(null)}
                className="flex-1 py-5 font-black text-[10px] text-slate-400 uppercase tracking-widest"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSave(editingSource)}
                disabled={isSaving}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20 shadow-xl py-5 rounded-lg font-black text-[10px] text-white uppercase tracking-widest transition-all"
              >
                {isSaving ? 'Saving...' : 'Commit Source'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
