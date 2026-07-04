'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { saveInvoice } from '@/services/invoices';
import { Invoice, Client, CompanyProfile, InvoiceItem } from '@/types';
import { InvoicePreview } from '@/components/invoice-preview';
import { ResponsiveInvoiceWrapper } from '@/components/responsive-invoice-wrapper';

import { calculateNextGenDate, parseBillingTiming, appendBillingTiming } from '@/lib/date-utils';
import { useToast } from '@/components/ui/toast';

interface InvoiceEditorProps {
  invoiceId?: string; // Optional: If provided, we're editing an existing invoice
}

const INITIAL_INVOICE_DATA = (): Partial<Invoice> => ({
  invoice_number: `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
  date: new Date().toISOString().split('T')[0],
  status: 'draft',
  currency: '৳ ',
  tax_rate: 0,
  notes: 'Thank you for your business.',
  is_recurring: false,
  recurring_frequency: 'monthly',
});

export const InvoiceEditor: React.FC<InvoiceEditorProps> = ({ invoiceId }) => {
  const router = useRouter();
  const supabase = createClient();
  const toast = useToast();

  const [invoice, setInvoice] = useState<Partial<Invoice> | null>(null);
  const [items, setItems] = useState<Partial<InvoiceItem>[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadFormDependencies = async () => {
      try {
        const [cls, comps] = await Promise.all([
          supabase.from('clients').select('*').order('name'),
          supabase.from('companies').select('*').order('name')
        ]);
        setClients(cls.data || []);
        setCompanies(comps.data || []);

        if (invoiceId) {
          // Load existing invoice
          const { data: invData, error } = await supabase
            .from('invoices')
            .select('*, items:invoice_items(*)')
            .eq('id', invoiceId)
            .single();
          if (error) throw error;
          
          const { items: loadedItems, ...loadedInvoice } = invData;
          setInvoice(loadedInvoice);
          setItems(loadedItems || []);
        } else {
          // Setup new invoice
          setInvoice(INITIAL_INVOICE_DATA());
          setItems([]);
        }
      } catch (err) {
        console.error('Error loading editor dependencies:', err);
      } finally {
        setLoading(false);
      }
    };

    loadFormDependencies();
  }, [invoiceId]);

  const handleSave = async () => {
    if (!invoice?.company_id) {
      toast.error('Please select an entity profile (company).');
      return;
    }
    if (!invoice?.client_id) {
      toast.error('Please select a recipient (client).');
      return;
    }
    if (items.length === 0) {
      toast.error('Please add at least one work item.');
      return;
    }

    setIsSaving(true);
    try {
      const saved = await saveInvoice(invoice, items);
      toast.success('Invoice saved successfully.');
      router.push(`/invoices/${saved.id}`);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Error saving invoice');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    if (invoiceId) {
      window.open(`/invoices/${invoiceId}/print`, '_blank');
    } else {
      toast.error('Please commit the invoice record first before printing.');
    }
  };

  if (loading || !invoice) {
    return (
      <div className="flex justify-center items-center h-full min-h-[500px]">
        <div className="text-center">
          <div className="mx-auto mb-4 border-4 border-indigo-600 border-t-transparent rounded-full w-12 h-12 animate-spin"></div>
          <p className="font-black text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            Synching editor state...
          </p>
        </div>
      </div>
    );
  }

  // Pre-calculate live values for preview
  const liveSubtotal = items.reduce((s, i) => s + ((i.quantity || 0) * (i.rate || 0)), 0);
  const liveTax = liveSubtotal * ((invoice.tax_rate || 0) / 100);
  const liveTotal = liveSubtotal + liveTax;

  const previewData = {
    invoiceNumber: invoice.invoice_number || '---',
    date: invoice.date || new Date().toISOString(),
    companyId: invoice.company_id || '',
    client: clients.find((c) => c.id === invoice.client_id) || { name: 'Recipient', email: '', address: '' },
    items: items as InvoiceItem[],
    notes: invoice.notes || '',
    currency: invoice.currency || '৳ ',
    taxRate: invoice.tax_rate || 0,
    isRecurring: invoice.is_recurring || false,
    recurringFrequency: invoice.recurring_frequency,
    paid_amount: invoice.paid_amount || 0,
    status: invoice.status || 'draft',
  };

  const selectedCompany = companies.find((c) => c.id === invoice.company_id) || {
    name: 'Select Entity',
    logo_url: '',
    email: '',
    website: '',
    address: '',
    phone: '',
    color: '#6366f1',
  } as CompanyProfile;

  return (
    <div className="flex lg:flex-row flex-col bg-slate-100 dark:bg-[#020617] h-full min-h-screen">
      {/* Sidebar Editor Panel */}
      <div className="z-10 relative space-y-10 bg-white dark:bg-slate-900 shadow-2xl p-6 lg:p-8 border-r border-slate-200 dark:border-slate-800 w-full lg:w-[480px] h-auto lg:h-screen overflow-y-auto custom-scrollbar no-print">
        <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="font-black text-slate-900 dark:text-white text-xl uppercase tracking-tighter">
            {invoiceId ? 'Edit Invoice' : 'New Invoice'}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="hover:bg-indigo-50 dark:hover:bg-indigo-950/30 p-2.5 rounded-lg text-indigo-600 dark:text-indigo-400 transition-all"
              title="Print/Export"
            >
              <i className="text-lg fa-solid fa-print"></i>
            </button>
            <button
              onClick={() => router.back()}
              className="p-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
            >
              <i className="text-lg fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Company and Client Selection */}
          <div className="space-y-4">
            <label className="block ml-1 font-black text-[9px] text-slate-400 uppercase tracking-widest">
              Billing Entities
            </label>
            <div>
              <label className="block mb-1 ml-1 text-[10px] font-bold text-slate-500">Issuer Entity</label>
              <select
                className="bg-slate-50 dark:bg-slate-950/50 p-4 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full dark:text-white text-sm"
                value={invoice.company_id || ''}
                onChange={(e) => setInvoice((p) => ({ ...p!, company_id: e.target.value }))}
              >
                <option value="">Select Company Profile</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-1 ml-1 text-[10px] font-bold text-slate-500">Recipient Client</label>
              <select
                className="bg-slate-50 dark:bg-slate-950/50 p-4 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full dark:text-white text-sm"
                value={invoice.client_id || ''}
                onChange={(e) => setInvoice((p) => ({ ...p!, client_id: e.target.value }))}
              >
                <option value="">Select Recipient Client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Invoice ID & Status */}
          <div className={invoice.is_recurring ? "w-full" : "gap-4 grid grid-cols-2"}>
            <div>
              <label className="block mb-1 ml-1 font-black text-[9px] text-slate-400 uppercase tracking-widest">
                Invoice ID
              </label>
              <input
                className="dark:bg-slate-950/50 p-4 border border-slate-200 dark:border-slate-800 rounded-lg outline-none w-full dark:text-white text-sm"
                placeholder="Invoice #"
                value={invoice.invoice_number || ''}
                onChange={(e) => setInvoice((p) => ({ ...p!, invoice_number: e.target.value }))}
              />
            </div>
            {!invoice.is_recurring && (
              <div>
                <label className="block mb-1 ml-1 font-black text-[9px] text-slate-400 uppercase tracking-widest">
                  Status
                </label>
                <select
                  className="bg-slate-50 dark:bg-slate-950/50 p-4 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full dark:text-white text-sm"
                  value={invoice.status || 'draft'}
                  onChange={(e) => setInvoice((p) => ({ ...p!, status: e.target.value as any }))}
                >
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            )}
          </div>

          {/* Date Created */}
          {!invoice.is_recurring && (
            <div>
              <label className="block mb-1 ml-1 font-black text-[9px] text-slate-400 uppercase tracking-widest">
                Issue Date
              </label>
              <input
                type="date"
                className="dark:bg-slate-950/50 p-4 border border-slate-200 dark:border-slate-800 rounded-lg outline-none w-full dark:text-white text-sm"
                value={invoice.date || ''}
                onChange={(e) => {
                  const newDate = e.target.value;
                  setInvoice((p) => {
                    const updated = { ...p!, date: newDate };
                    if (updated.is_recurring) {
                      updated.next_generation_date = calculateNextGenDate(newDate, updated.recurring_frequency || 'monthly');
                    }
                    return updated;
                  });
                }}
              />
            </div>
          )}

          {/* Items List */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <label className="block font-black text-[9px] text-slate-400 uppercase tracking-widest">
                Work Items
              </label>
              <span className="font-black text-[9px] text-indigo-500 uppercase">
                Total: {invoice.currency}
                {liveTotal.toLocaleString()}
              </span>
            </div>

            {items.map((item, idx) => (
              <div
                key={item.id || idx}
                className="group relative bg-slate-50 dark:bg-slate-950/50 p-4 border border-slate-200 dark:border-slate-800/80 rounded-lg animate-slide-in"
              >
                <input
                  className="bg-transparent mb-3 outline-none w-full font-bold dark:text-white text-sm border-b border-transparent focus:border-slate-300 dark:focus:border-slate-700 pb-1"
                  placeholder="Item description..."
                  value={item.description || ''}
                  onChange={(e) => {
                    const next = [...items];
                    next[idx].description = e.target.value;
                    setItems(next);
                  }}
                />
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block mb-1 font-black text-[8px] text-slate-400 uppercase">Qty</label>
                    <input
                      type="number"
                      className="bg-white dark:bg-slate-900 p-2.5 border border-slate-200 dark:border-slate-800 rounded-lg outline-none w-full font-bold dark:text-white text-xs"
                      value={item.quantity || ''}
                      onChange={(e) => {
                        const next = [...items];
                        next[idx].quantity = Number(e.target.value);
                        setItems(next);
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block mb-1 font-black text-[8px] text-slate-400 uppercase">Rate</label>
                    <input
                      type="number"
                      className="bg-white dark:bg-slate-900 p-2.5 border border-slate-200 dark:border-slate-800 rounded-lg outline-none w-full font-bold dark:text-white text-xs"
                      value={item.rate || ''}
                      onChange={(e) => {
                        const next = [...items];
                        next[idx].rate = Number(e.target.value);
                        setItems(next);
                      }}
                    />
                  </div>
                  <button
                    onClick={() => setItems(items.filter((_, i) => i !== idx))}
                    className="mt-4 p-2 text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <i className="fa-solid fa-trash-can"></i>
                  </button>
                </div>
              </div>
            ))}

            <button
              onClick={() =>
                setItems([
                  ...items,
                  { id: crypto.randomUUID(), description: '', quantity: 1, rate: 0 },
                ])
              }
              className="py-3 border-2 border-slate-200 dark:border-slate-800 border-dashed rounded-lg w-full font-black text-[9px] text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 uppercase tracking-widest transition-all"
            >
              + Add Work Entry
            </button>
          </div>

          {/* Tax and Currency */}
          {!invoice.is_recurring && (
            <div className="gap-4 grid grid-cols-2">
              <div>
                <label className="block mb-1 ml-1 font-black text-[9px] text-slate-400 uppercase tracking-widest">
                  Currency Symbol
                </label>
                <input
                  className="dark:bg-slate-950/50 p-4 border border-slate-200 dark:border-slate-800 rounded-lg outline-none w-full dark:text-white text-sm"
                  placeholder="৳"
                  value={invoice.currency || ''}
                  onChange={(e) => setInvoice((p) => ({ ...p!, currency: e.target.value }))}
                />
              </div>
              <div>
                <label className="block mb-1 ml-1 font-black text-[9px] text-slate-400 uppercase tracking-widest">
                  Tax Rate (%)
                </label>
                <input
                  type="number"
                  className="dark:bg-slate-950/50 p-4 border border-slate-200 dark:border-slate-800 rounded-lg outline-none w-full dark:text-white text-sm"
                  placeholder="0"
                  value={invoice.tax_rate || 0}
                  onChange={(e) => setInvoice((p) => ({ ...p!, tax_rate: Number(e.target.value) }))}
                />
              </div>
            </div>
          )}

          {/* Notes */}
          {!invoice.is_recurring && (
            <div>
              <label className="block mb-1 ml-1 font-black text-[9px] text-slate-400 uppercase tracking-widest">
                Notes
              </label>
              <textarea
                className="dark:bg-slate-950/50 p-4 border border-slate-200 dark:border-slate-800 rounded-lg outline-none w-full h-24 dark:text-white text-sm resize-none"
                placeholder="Official Notes"
                value={invoice.notes || ''}
                onChange={(e) => setInvoice((p) => ({ ...p!, notes: e.target.value }))}
              />
            </div>
          )}

          {/* Recurring Option */}
          <div className="bg-slate-50 dark:bg-slate-950/50 p-5 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
            <label className="inline-flex relative items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={invoice.is_recurring || false}
                onChange={(e) => {
                  const isChecked = e.target.checked;
                  setInvoice((p) => {
                    const updated = { ...p!, is_recurring: isChecked };
                    if (isChecked && updated.date) {
                      updated.next_generation_date = calculateNextGenDate(updated.date, updated.recurring_frequency || 'monthly');
                    }
                    return updated;
                  });
                }}
              />
              <div className="peer after:top-1/2 after:left-[2px] after:absolute bg-slate-300 after:bg-white dark:bg-slate-700 peer-checked:bg-indigo-600 after:border after:border-gray-300 peer-checked:after:border-white rounded-full after:rounded-full peer-focus:outline-none w-11 after:w-5 h-6 after:h-5 after:content-[''] after:transition-all after:translate-y-[-50%] peer-checked:after:translate-x-[calc(100%-6px)]"></div>
              <span className="ml-3 font-bold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider">
                Recurring Invoice
              </span>
            </label>

            {invoice.is_recurring && (
              <div className="space-y-4 animate-slide-in">
                <div>
                  <label className="block mb-1 ml-1 font-black text-[8px] text-slate-400 uppercase">
                    Frequency
                  </label>
                  <select
                    className="bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full dark:text-white text-xs font-bold"
                    value={invoice.recurring_frequency || 'monthly'}
                    onChange={(e) => {
                      const newFreq = e.target.value as any;
                      setInvoice((p) => {
                        const updated = { ...p!, recurring_frequency: newFreq };
                        if (updated.is_recurring && updated.date) {
                          updated.next_generation_date = calculateNextGenDate(updated.date, newFreq);
                        }
                        return updated;
                      });
                    }}
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 ml-1 font-black text-[8px] text-slate-400 uppercase">
                    Next Generation Date
                  </label>
                  <input
                    type="date"
                    className="bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full dark:text-white text-xs font-bold"
                    value={invoice.next_generation_date || ''}
                    onChange={(e) =>
                      setInvoice((p) => ({ ...p!, next_generation_date: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="block mb-1 ml-1 font-black text-[8px] text-slate-400 uppercase">
                    Billing Timing
                  </label>
                  <select
                    className="bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full dark:text-white text-xs font-bold"
                    value={parseBillingTiming(invoice.notes)}
                    onChange={(e) => {
                      const timingVal = e.target.value as 'advanced' | 'after_period';
                      setInvoice((p) => {
                        const updatedNotes = appendBillingTiming(p?.notes, timingVal);
                        return { ...p!, notes: updatedNotes };
                      });
                    }}
                  >
                    <option value="advanced">In Advance (Default)</option>
                    <option value="after_period">After Period (Arrears)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 py-4 rounded-lg font-black text-white text-xs uppercase tracking-widest transition-all mt-6 shadow-2xl"
          >
            {isSaving ? 'Synching...' : 'Commit Invoice Record'}
          </button>
        </div>
      </div>

      {/* Right: Live Preview Pane */}
      <div className="flex-1 flex justify-center items-start p-6 lg:p-12 overflow-y-auto custom-scrollbar">
        <ResponsiveInvoiceWrapper>
          <div className="shadow-[0_40px_100px_rgba(0,0,0,0.15)] dark:shadow-[0_40px_100px_rgba(0,0,0,0.4)] rounded-lg overflow-hidden">
            <InvoicePreview data={previewData} company={selectedCompany} />
          </div>
        </ResponsiveInvoiceWrapper>
      </div>
    </div>
  );
};
export default InvoiceEditor;
