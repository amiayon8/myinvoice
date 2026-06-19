'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { saveClient } from '@/services/clients';
import { Client, Invoice } from '@/types';
import { useToast } from '@/components/ui/toast';
import { ClientGridSkeleton } from '@/components/skeleton';

export default function ClientsPage() {
  const supabase = createClient();
  const toast = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [editingClient, setEditingClient] = useState<Partial<Client> | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cls, invs] = await Promise.all([
        supabase.from('clients').select('*').order('name'),
        supabase.from('invoices').select('*, items:invoice_items(*)')
      ]);
      setClients(cls.data || []);
      setInvoices(invs.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (clientData: Partial<Client>) => {
    setIsSaving(true);
    try {
      await saveClient(clientData);
      await fetchData();
      setEditingClient(null);
      toast.success('Client saved successfully');
    } catch (err: any) {
      toast.error(err.message || 'Error saving client');
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
          Clients Registry
        </h1>
      </div>

      <div className="gap-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <button
          onClick={() => setEditingClient({ name: '', email: '', address: '', phone: '' })}
          className="group flex flex-col justify-center items-center gap-4 bg-white/50 dark:bg-white/5 border-2 border-slate-200 hover:border-indigo-600 dark:border-white/10 dark:hover:border-indigo-400 border-dashed rounded-lg h-full min-h-[250px] hover:text-indigo-600 dark:hover:text-indigo-400 transition-all"
        >
          <div className="flex justify-center items-center bg-white dark:bg-slate-900 shadow-sm rounded-lg w-16 h-16 group-hover:scale-110 transition-transform">
            <i className="text-2xl fa-solid fa-user-plus"></i>
          </div>
          <span className="font-black text-xs uppercase tracking-widest">Enlist Recipient</span>
        </button>

        {clients.map(client => {
          const clientInvoices = invoices.filter(inv => inv.client_id === client.id);

          const totalBilled = clientInvoices.reduce((sum, inv) => {
            const subtotal = (inv.items || []).reduce((s, i) => s + (i.quantity * i.rate), 0);
            const tax = subtotal * ((inv.tax_rate || 0) / 100);
            return sum + subtotal + tax;
          }, 0);

          const totalPaid = clientInvoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);
          const totalDue = totalBilled - totalPaid;

          return (
            <div
              key={client.id}
              className="group relative bg-white dark:bg-slate-900 shadow-xl hover:shadow-2xl p-8 border border-slate-100 dark:border-slate-800/50 rounded-lg overflow-hidden transition-all animate-slide-in"
            >
              <div className="flex justify-center items-center bg-indigo-500 shadow-indigo-500/20 shadow-lg mb-6 rounded-lg w-14 h-14 font-black text-white text-2xl">
                {client.name.charAt(0)}
              </div>
              <h3 className="mb-2 font-black text-slate-900 dark:text-white text-xl">{client.name}</h3>
              <p className="mb-6 font-black text-[10px] text-slate-400 dark:text-slate-500 truncate uppercase tracking-widest">
                {client.email}
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

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3 font-medium text-slate-500 dark:text-slate-400 text-xs italic leading-relaxed">
                  <i className="mt-1 text-indigo-400 fa-solid fa-location-dot"></i>{' '}
                  {client.address || 'No address registered'}
                </div>
                {client.phone && (
                  <div className="flex items-center gap-3 font-medium text-slate-500 dark:text-slate-400 text-xs italic leading-relaxed">
                    <i className="text-indigo-400 fa-solid fa-phone"></i> {client.phone}
                  </div>
                )}
              </div>

              <div className="top-8 right-8 absolute flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                <button
                  onClick={() => setEditingClient(client)}
                  className="flex justify-center items-center bg-slate-50 dark:bg-slate-800 shadow-sm rounded-full w-10 h-10 text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  <i className="text-xs fa-solid fa-pen"></i>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {editingClient && (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-slate-950/60 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 shadow-2xl p-10 border border-slate-200 dark:border-slate-800 rounded-lg w-full max-w-md animate-slide-in">
            <h2 className="mb-8 font-black text-slate-900 dark:text-white text-2xl uppercase tracking-tighter">
              Recipient Profile
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block mb-1 ml-1 font-black text-[10px] text-slate-400 uppercase tracking-widest">
                  Name / Business Name
                </label>
                <input
                  className="bg-slate-50 dark:bg-slate-950/50 p-5 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full dark:text-white text-sm"
                  placeholder="Business or Name"
                  value={editingClient.name}
                  onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block mb-1 ml-1 font-black text-[10px] text-slate-400 uppercase tracking-widest">
                  Email Contact
                </label>
                <input
                  className="bg-slate-50 dark:bg-slate-950/50 p-5 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full dark:text-white text-sm"
                  placeholder="Email Contact"
                  value={editingClient.email}
                  onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block mb-1 ml-1 font-black text-[10px] text-slate-400 uppercase tracking-widest">
                  Registered Address
                </label>
                <textarea
                  className="bg-slate-50 dark:bg-slate-950/50 p-5 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full h-32 dark:text-white text-sm resize-none"
                  placeholder="Registered Address"
                  value={editingClient.address}
                  onChange={(e) => setEditingClient({ ...editingClient, address: e.target.value })}
                />
              </div>
              <div>
                <label className="block mb-1 ml-1 font-black text-[10px] text-slate-400 uppercase tracking-widest">
                  Phone Number
                </label>
                <input
                  className="bg-slate-50 dark:bg-slate-950/50 p-5 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full dark:text-white text-sm"
                  placeholder="Phone Number"
                  value={editingClient.phone || ''}
                  onChange={(e) => setEditingClient({ ...editingClient, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-4 mt-10">
              <button
                onClick={() => setEditingClient(null)}
                className="flex-1 py-5 font-black text-[10px] text-slate-400 uppercase tracking-widest"
              >
                Abandon
              </button>
              <button
                onClick={() => handleSave(editingClient)}
                disabled={isSaving}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20 shadow-xl py-5 rounded-lg font-black text-[10px] text-white uppercase tracking-widest transition-all"
              >
                {isSaving ? 'Synching...' : 'Commit Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
