'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { saveCompany } from '@/services/companies';
import { LogoUpload } from '@/components/logo-upload';
import { CompanyProfile, Invoice } from '@/types';
import { useToast } from '@/components/ui/toast';
import { ClientGridSkeleton } from '@/components/skeleton';

export default function CompaniesPage() {
  const supabase = createClient();
  const toast = useToast();
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [editingCompany, setEditingCompany] = useState<Partial<CompanyProfile> | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userId, setUserId] = useState<string>('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [comps, invs, { data: { session } }] = await Promise.all([
        supabase.from('companies').select('*').order('name'),
        supabase.from('invoices').select('*, items:invoice_items(*)'),
        supabase.auth.getSession()
      ]);
      setCompanies(comps.data || []);
      setInvoices(invs.data || []);
      if (session?.user) {
        setUserId(session.user.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (companyData: Partial<CompanyProfile>) => {
    setIsSaving(true);
    try {
      await saveCompany(companyData);
      toast.success('Entity profile saved.');
      await fetchData();
      setEditingCompany(null);
    } catch (err: any) {
      toast.error(err.message || 'Error saving entity');
    } finally {
      setIsSaving(false);
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
        <ClientGridSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-8 mx-auto p-4 lg:p-12 max-w-7xl h-full">
      <div className="flex justify-between items-center mb-8 no-print">
        <h1 className="font-black text-slate-800 dark:text-white text-xl lg:text-2xl uppercase tracking-tighter">
          Entities Management
        </h1>
      </div>

      <div className="gap-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <button
          onClick={() =>
            setEditingCompany({
              name: '',
              email: '',
              website: '',
              address: '',
              phone: '',
              color: '#6366f1',
              logo_url: '',
            })
          }
          className="group flex flex-col justify-center items-center gap-4 bg-white/50 dark:bg-white/5 border-2 border-slate-200 hover:border-indigo-600 dark:border-white/10 dark:hover:border-indigo-400 border-dashed rounded-lg h-full min-h-[300px] hover:text-indigo-600 dark:hover:text-indigo-400 transition-all"
        >
          <div className="flex justify-center items-center bg-white dark:bg-slate-900 shadow-sm rounded-lg w-16 h-16 group-hover:scale-110 transition-transform">
            <i className="text-2xl fa-solid fa-building-shield"></i>
          </div>
          <span className="font-black text-xs uppercase tracking-widest">Register Entity</span>
        </button>

        {companies.map(company => {
          const companyInvoices = invoices.filter(inv => inv.company_id === company.id);

          const totalBilled = companyInvoices.reduce((sum, inv) => {
            const subtotal = (inv.items || []).reduce((s, i) => s + (i.quantity * i.rate), 0);
            const tax = subtotal * ((inv.tax_rate || 0) / 100);
            return sum + subtotal + tax;
          }, 0);

          const totalPaid = companyInvoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);
          const totalDue = totalBilled - totalPaid;

          return (
            <div
              key={company.id}
              className="group relative bg-white dark:bg-slate-900 shadow-xl hover:shadow-2xl border border-slate-100 dark:border-slate-800/50 rounded-lg overflow-hidden transition-all animate-slide-in"
            >
              <div className="w-full h-3" style={{ backgroundColor: company.color }}></div>
              <div className="p-8">
                <div className="flex justify-center items-center bg-white shadow-inner mb-6 border border-slate-100 dark:border-slate-800/50 rounded-lg w-48 h-24 overflow-hidden mx-auto">
                  {company.logo_url ? (
                    <img src={company.logo_url} className="p-2 w-full h-full object-contain" alt="Logo" />
                  ) : (
                    <i className="text-slate-200 text-3xl fa-solid fa-briefcase"></i>
                  )}
                </div>

                <h3 className="mb-1 font-black text-slate-900 dark:text-white text-xl text-center">
                  {company.name}
                </h3>
                <p className="mb-6 font-black text-[9px] text-indigo-500 dark:text-indigo-400 uppercase tracking-widest text-center">
                  {company.website}
                </p>

                <div className="gap-2 grid grid-cols-3 mb-6 py-4 border-slate-50 border-y dark:border-slate-800/50">
                  <div className="text-center">
                    <p className="mb-1 font-black text-[8px] text-slate-400 uppercase tracking-wider">Total</p>
                    <p className="font-black text-slate-700 dark:text-slate-300 text-xs">৳{totalBilled.toLocaleString()}</p>
                  </div>
                  <div className="border-slate-100 dark:border-slate-800/50 border-l text-center">
                    <p className="mb-1 font-black text-[8px] text-slate-400 uppercase tracking-wider">Paid</p>
                    <p className="font-black text-emerald-500 text-xs">৳{totalPaid.toLocaleString()}</p>
                  </div>
                  <div className="border-slate-100 dark:border-slate-800/50 border-l text-center">
                    <p className="mb-1 font-black text-[8px] text-slate-400 uppercase tracking-wider">Due</p>
                    <p className="font-black text-rose-500 text-xs">৳{totalDue.toLocaleString()}</p>
                  </div>
                </div>

                <div className="space-y-3 font-bold text-[11px] text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-3">
                    <i className="text-indigo-400 fa-solid fa-envelope-open"></i> {company.email}
                  </div>
                  <div className="flex items-center gap-3">
                    <i className="text-indigo-400 fa-solid fa-phone"></i> {company.phone}
                  </div>
                </div>
              </div>
              <div className="top-10 right-8 absolute flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                <button
                  onClick={() => setEditingCompany(company)}
                  className="flex justify-center items-center bg-slate-50 dark:bg-slate-800 shadow-sm rounded-full w-10 h-10 text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  <i className="text-xs fa-solid fa-pen"></i>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {editingCompany && (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-slate-950/60 backdrop-blur-md p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-slate-900 shadow-2xl my-8 p-10 border border-slate-200 dark:border-slate-800 rounded-lg w-full max-w-xl animate-slide-in">
            <h2 className="mb-8 font-black text-slate-900 dark:text-white text-2xl uppercase tracking-tighter">
              Corporate Identity
            </h2>
            <div className="space-y-8">
              <LogoUpload
                userId={userId}
                currentUrl={editingCompany.logo_url}
                onUploadSuccess={(url) => setEditingCompany({ ...editingCompany, logo_url: url })}
              />
              <div className="gap-6 grid grid-cols-2">
                <div className="col-span-2">
                  <label className="block mb-2 ml-1 font-black text-[8px] text-slate-400 uppercase">Legal Name</label>
                  <input
                    className="bg-slate-50 dark:bg-slate-950/50 p-5 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full dark:text-white text-sm"
                    value={editingCompany.name}
                    onChange={(e) => setEditingCompany({ ...editingCompany, name: e.target.value })}
                  />
                </div>
                <div className="col-span-1">
                  <label className="block mb-2 ml-1 font-black text-[8px] text-slate-400 uppercase">Brand Color</label>
                  <input
                    type="color"
                    className="bg-slate-50 dark:bg-slate-950/50 p-2 border border-slate-200 dark:border-slate-800 rounded-lg outline-none w-full h-16"
                    value={editingCompany.color}
                    onChange={(e) => setEditingCompany({ ...editingCompany, color: e.target.value })}
                  />
                </div>
                <div className="col-span-1">
                  <label className="block mb-2 ml-1 font-black text-[8px] text-slate-400 uppercase">Billing Email</label>
                  <input
                    className="bg-slate-50 dark:bg-slate-950/50 p-5 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full h-16 dark:text-white text-sm"
                    value={editingCompany.email}
                    onChange={(e) => setEditingCompany({ ...editingCompany, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block mb-1 ml-1 font-black text-[10px] text-slate-400 uppercase tracking-widest">
                    Domain / Website
                  </label>
                  <input
                    className="bg-slate-50 dark:bg-slate-950/50 p-5 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full dark:text-white text-sm"
                    placeholder="Domain / Website"
                    value={editingCompany.website}
                    onChange={(e) => setEditingCompany({ ...editingCompany, website: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block mb-1 ml-1 font-black text-[10px] text-slate-400 uppercase tracking-widest">
                    Contact Phone
                  </label>
                  <input
                    className="bg-slate-50 dark:bg-slate-950/50 p-5 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full dark:text-white text-sm"
                    placeholder="Contact Phone"
                    value={editingCompany.phone}
                    onChange={(e) => setEditingCompany({ ...editingCompany, phone: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block mb-1 ml-1 font-black text-[10px] text-slate-400 uppercase tracking-widest">
                    Headquarters Address
                  </label>
                  <textarea
                    className="bg-slate-50 dark:bg-slate-950/50 p-5 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full h-24 dark:text-white text-sm resize-none"
                    placeholder="Headquarters Address"
                    value={editingCompany.address}
                    onChange={(e) => setEditingCompany({ ...editingCompany, address: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-4 mt-12">
              <button
                onClick={() => setEditingCompany(null)}
                className="flex-1 py-5 font-black text-[10px] text-slate-400 uppercase tracking-widest"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSave(editingCompany)}
                disabled={isSaving}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20 shadow-xl py-5 rounded-lg font-black text-[10px] text-white uppercase tracking-widest transition-all"
              >
                {isSaving ? 'Synching...' : 'Commit Profile'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
