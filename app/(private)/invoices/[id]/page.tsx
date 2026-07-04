'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  saveInvoice,
  createInvoiceShareToken,
  revokeInvoiceToken,
  listInvoiceTokens
} from '@/services/invoices';
import { addInvoicePayment, deleteInvoicePayment } from '@/services/payments';
import { InvoicePreview } from '@/components/invoice-preview';
import { ResponsiveInvoiceWrapper } from '@/components/responsive-invoice-wrapper';
import { Invoice, CompanyProfile, Client, InvoiceItem } from '@/types';
import { useToast } from '@/components/ui/toast';
import { DetailSkeleton } from '@/components/skeleton';

export default function InvoiceDetailsPage() {
  const router = useRouter();
  const { id: invoiceId } = useParams() as { id: string };
  const supabase = createClient();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'manage' | 'edit'>('manage');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Core Data State
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [tokens, setTokens] = useState<any[]>([]);

  // Dependency options for edit form
  const [clients, setClients] = useState<Client[]>([]);
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);

  // Edit Form Fields (Local states that sync with preview)
  const [invoiceForm, setInvoiceForm] = useState<Partial<Invoice> | null>(null);
  const [itemsForm, setItemsForm] = useState<Partial<InvoiceItem>[]>([]);

  // Payment Form State
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'cash' | 'bank_transfer' | 'mobile_banking' | 'card' | 'other'>('bank_transfer');
  const [payNotes, setPayNotes] = useState('');
  const [isLoggingPayment, setIsLoggingPayment] = useState(false);

  // Share Token Generation State
  const [tokenLabel, setTokenLabel] = useState('');
  const [tokenExpiry, setTokenExpiry] = useState<'30' | '90' | 'never'>('30');
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      // 1. Fetch invoice details with items, client and company details
      const { data: invData, error: invError } = await supabase
        .from('invoices')
        .select('*, items:invoice_items(*), client:clients(*), company:companies(*)')
        .eq('id', invoiceId)
        .single();
      
      if (invError) throw invError;
      setInvoice(invData);
      
      // Initialize edit form values with fetched data
      if (invData) {
        const { items: loadedItems, ...loadedInvoice } = invData;
        setInvoiceForm(loadedInvoice);
        setItemsForm(loadedItems || []);
      }

      // 2. Fetch payments for this invoice
      const { data: payData, error: payError } = await supabase
        .from('invoice_payments')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('payment_date', { ascending: false });

      if (payError) throw payError;
      setPayments(payData || []);

      // 3. Fetch all sharing tokens
      const activeTokens = await listInvoiceTokens(invoiceId);
      setTokens(activeTokens || []);

      // 4. Fetch clients and companies lists for edit dependencies
      const [cls, comps] = await Promise.all([
        supabase.from('clients').select('*').order('name'),
        supabase.from('companies').select('*').order('name')
      ]);
      setClients(cls.data || []);
      setCompanies(comps.data || []);
    } catch (err) {
      console.error('Error fetching invoice details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (invoiceId) {
      fetchData();
    }
  }, [invoiceId]);

  // Hook tab query param from window search safely without Next.js compile Suspense requirements
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') === 'edit') {
        setActiveTab('edit');
      }
    }
  }, []);

  const handlePrint = () => {
    window.open(`/invoices/${invoiceId}/print`, '_blank');
  };

  const handleLogPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payAmount || Number(payAmount) <= 0) return;
    setIsLoggingPayment(true);
    try {
      await addInvoicePayment(invoiceId, Number(payAmount), payMethod, payNotes);
      toast.success('Collection logged successfully.');
      setPayAmount('');
      setPayNotes('');
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Error logging payment');
    } finally {
      setIsLoggingPayment(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm('Delete this payment record?')) return;
    try {
      await deleteInvoicePayment(paymentId, invoiceId);
      toast.success('Payment record deleted.');
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Error deleting payment');
    }
  };

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGeneratingToken(true);
    try {
      const neverExpires = tokenExpiry === 'never';
      const daysExpiry = neverExpires ? 30 : Number(tokenExpiry);
      
      await createInvoiceShareToken(invoiceId, {
        label: tokenLabel.trim() || undefined,
        neverExpires,
        daysExpiry,
      });

      toast.success('Sharing token generated successfully.');
      setTokenLabel('');
      // Reload token list
      const activeTokens = await listInvoiceTokens(invoiceId);
      setTokens(activeTokens || []);
    } catch (err: any) {
      toast.error(err.message || 'Error generating token');
    } finally {
      setIsGeneratingToken(false);
    }
  };

  const handleCopyLink = (tokenValue: string) => {
    const shareUrl = `${window.location.origin}/invoices/token/${tokenValue}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Sharing URL copied to clipboard.');
    setCopiedToken(tokenValue);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleRevokeToken = async (tokenId: string) => {
    if (!confirm('Revoke this share token? The link will no longer be accessible.')) return;
    try {
      await revokeInvoiceToken(tokenId);
      toast.success('Sharing token revoked.');
      // Reload token list
      const activeTokens = await listInvoiceTokens(invoiceId);
      setTokens(activeTokens || []);
    } catch (err: any) {
      toast.error(err.message || 'Error revoking token');
    }
  };

  const handleStopRecurring = async () => {
    if (!confirm('Stop automated recurring billing for this invoice?')) return;
    try {
      const { id, items: _i, client: _c, company: _comp, created_at: _cr, ...rest } = invoice!;
      await saveInvoice({
        ...rest,
        id: invoice!.id,
        is_recurring: false,
      }, invoice!.items || []);
      toast.success('Recurring billing stopped.');
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Error stopping recurring billing');
    }
  };

  const handleSaveInvoiceEdits = async () => {
    if (!invoiceForm?.company_id) {
      toast.error('Please select an entity profile (company).');
      return;
    }
    if (!invoiceForm?.client_id) {
      toast.error('Please select a recipient (client).');
      return;
    }
    if (itemsForm.length === 0) {
      toast.error('Please add at least one work item.');
      return;
    }

    setIsSaving(true);
    try {
      await saveInvoice(invoiceForm, itemsForm);
      toast.success('Invoice details updated successfully.');
      await fetchData();
      setActiveTab('manage');
    } catch (err: any) {
      toast.error(err.message || 'Error saving invoice details');
    } finally {
      setIsSaving(false);
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

  if (!invoice || !invoiceForm) {
    return (
      <div className="p-8 text-center text-slate-500 italic">
        Invoice not found.
      </div>
    );
  }

  // Pre-calculate live values for preview from editor form states
  const subtotal = itemsForm.reduce((sum, item) => sum + ((item.quantity || 0) * (item.rate || 0)), 0);
  const taxAmount = subtotal * ((invoiceForm.tax_rate || 0) / 100);
  const totalAmount = subtotal + taxAmount;
  const totalPaid = payments.reduce((sum, pay) => sum + pay.amount, 0);
  const totalDue = totalAmount - totalPaid;

  const previewData = {
    invoiceNumber: invoiceForm.invoice_number || '---',
    date: invoiceForm.date || new Date().toISOString(),
    companyId: invoiceForm.company_id || '',
    client: clients.find((c) => c.id === invoiceForm.client_id) || invoice.client || { name: 'Recipient', email: '', address: '' },
    items: itemsForm as InvoiceItem[],
    notes: invoiceForm.notes || '',
    currency: invoiceForm.currency || '৳ ',
    taxRate: invoiceForm.tax_rate || 0,
    isRecurring: invoiceForm.is_recurring || false,
    recurringFrequency: invoiceForm.recurring_frequency,
    paid_amount: totalPaid,
    status: totalPaid >= totalAmount ? 'paid' : totalPaid > 0 ? 'partially_paid' : invoiceForm.status || 'draft',
  };

  const selectedCompany = companies.find((c) => c.id === invoiceForm.company_id) || invoice.company || ({
    name: 'Select Entity',
    logo_url: '',
    email: '',
    website: '',
    address: '',
    phone: '',
    color: '#6366f1',
  } as CompanyProfile);

  return (
    <div className="flex xl:flex-row flex-col-reverse bg-slate-100 dark:bg-[#020617] h-full min-h-screen">
      {/* Left: Live Invoice Preview Card */}
      <div className="flex-1 flex justify-center items-start p-6 lg:p-12 xl:overflow-y-auto xl:custom-scrollbar print:p-0 print:overflow-visible">
        <ResponsiveInvoiceWrapper>
          <div className="shadow-2xl rounded-lg overflow-hidden print:shadow-none print:rounded-none">
            <InvoicePreview
              data={previewData}
              company={selectedCompany}
            />
          </div>
        </ResponsiveInvoiceWrapper>
      </div>

      {/* Right Sidebar: Tabs with Editor + Control Panel */}
      <div className="w-full xl:w-[480px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col xl:h-screen xl:overflow-hidden no-print">
        {/* Tab Headers */}
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('manage')}
            className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-colors ${
              activeTab === 'manage'
                ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400 font-black'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <i className="fa-solid fa-gears mr-1.5"></i> Manage
          </button>
          <button
            onClick={() => setActiveTab('edit')}
            className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-colors ${
              activeTab === 'edit'
                ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400 font-black'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <i className="fa-solid fa-pen mr-1.5"></i> Edit Details
          </button>
        </div>

        {/* Scrollable Tab Contents */}
        <div className="flex-1 p-6 lg:p-8 overflow-y-auto custom-scrollbar space-y-8">
          <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="font-black text-slate-900 dark:text-white text-xl uppercase tracking-tighter">
                {activeTab === 'manage' ? 'Control Panel' : 'Invoice Editor'}
              </h2>
              <span className="font-bold text-slate-400 text-xs">
                {activeTab === 'manage' ? 'Manage billing flow state' : 'Real-time invoice constructor'}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 p-3 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                title="Print Invoice"
              >
                <i className="fa-solid fa-print text-base"></i>
              </button>
              <button
                onClick={() => router.push('/invoices')}
                className="bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white p-3 rounded-lg transition-colors"
                title="Back to Invoices"
              >
                <i className="fa-solid fa-xmark text-base"></i>
              </button>
            </div>
          </div>

          {activeTab === 'manage' ? (
            /* CONTROL PANEL CONTENT */
            <div className="space-y-8 animate-fade-in">
              {/* Financial Summary card */}
              <div className="bg-slate-50 dark:bg-slate-950/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800/80">
                <h3 className="font-black text-[10px] text-slate-400 uppercase tracking-widest mb-4">
                  Outstanding Ledger
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-bold">Total Invoiced</span>
                    <span className="font-black text-slate-900 dark:text-white">
                      {invoiceForm.currency}
                      {totalAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-emerald-500 font-bold">Total Paid</span>
                    <span className="font-black text-emerald-500">
                      {invoiceForm.currency}
                      {totalPaid.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-slate-800 text-sm">
                    <span className="text-slate-700 dark:text-slate-300 font-black uppercase tracking-wider">
                      Due Balance
                    </span>
                    <span className={`font-black text-base ${totalDue <= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {invoiceForm.currency}
                      {totalDue.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Client Secure Sharing */}
              <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                <h3 className="font-black text-[10px] text-slate-400 uppercase tracking-widest">
                  Client Secure Sharing Links
                </h3>
                
                {/* Generate Token Form */}
                <form onSubmit={handleCreateToken} className="space-y-3 p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg">
                  <div className="font-black text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                    Generate Labeled Sharing Link
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Label (e.g. Email to Client, Accounting)"
                      value={tokenLabel}
                      onChange={(e) => setTokenLabel(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
                    />
                  </div>
                  <div className="flex gap-2 items-center">
                    <select
                      value={tokenExpiry}
                      onChange={(e) => setTokenExpiry(e.target.value as any)}
                      className="flex-1 bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none text-slate-800 dark:text-white font-bold"
                    >
                      <option value="30">Expires in 30 Days</option>
                      <option value="90">Expires in 90 Days</option>
                      <option value="never">Never Expires</option>
                    </select>
                    <button
                      type="submit"
                      disabled={isGeneratingToken}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 text-white font-black uppercase tracking-wider px-4 py-3 rounded-lg text-xs transition-all whitespace-nowrap"
                    >
                      {isGeneratingToken ? 'Creating...' : 'Create Link'}
                    </button>
                  </div>
                </form>

                {/* Tokens List */}
                <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                  {tokens.map((t) => {
                    const isExpired = !t.never_expires && t.expires_at && new Date(t.expires_at) < new Date();
                    const isRevoked = !!t.revoked_at;
                    let statusText = 'Active';
                    let statusColor = 'text-emerald-500 bg-emerald-500/10';
                    if (isRevoked) {
                      statusText = 'Revoked';
                      statusColor = 'text-rose-500 bg-rose-500/10';
                    } else if (isExpired) {
                      statusText = 'Expired';
                      statusColor = 'text-amber-500 bg-amber-500/10';
                    }

                    return (
                      <div key={t.id} className="p-3 bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col gap-2 relative group animate-slide-in">
                        <div className="flex justify-between items-start">
                          <div className="min-w-0 flex-1 pr-2">
                            <div className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
                              {t.label || 'Default Sharing Link'}
                            </div>
                            <div className="text-[9px] text-slate-400 mt-1">
                              Views: <span className="font-bold text-slate-600 dark:text-slate-300">{t.view_count}</span>
                              {t.expires_at && ` • Expiry: ${new Date(t.expires_at).toLocaleDateString()}`}
                              {t.never_expires && ` • Never expires`}
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${statusColor} whitespace-nowrap`}>
                            {statusText}
                          </span>
                        </div>

                        <div className="flex gap-2 mt-1">
                          <button
                            onClick={() => handleCopyLink(t.token)}
                            disabled={isRevoked || isExpired}
                            className="flex-1 py-2 bg-indigo-50 dark:bg-indigo-950/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 disabled:opacity-50 disabled:cursor-not-allowed text-indigo-600 dark:text-indigo-400 font-bold rounded text-[10px] transition-colors flex items-center justify-center gap-1.5"
                          >
                            <i className="fa-solid fa-copy"></i>
                            {copiedToken === t.token ? 'Copied!' : 'Copy Link'}
                          </button>
                          {!isRevoked && (
                            <button
                              onClick={() => handleRevokeToken(t.id)}
                              className="px-3 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 font-bold rounded text-[10px] border border-transparent hover:border-rose-200 dark:hover:border-rose-900/50 transition-all"
                              title="Revoke Link"
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {tokens.length === 0 && (
                    <p className="text-slate-400 dark:text-slate-500 text-xs italic text-center py-4">
                      No sharing links created yet.
                    </p>
                  )}
                </div>
              </div>

              {invoiceForm.is_recurring && (
                <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800 animate-slide-in">
                  <h3 className="font-black text-[10px] text-slate-400 uppercase tracking-widest">
                    Automated Subscription
                  </h3>
                  <button
                    onClick={handleStopRecurring}
                    className="w-full bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 py-3.5 rounded-lg font-black text-xs uppercase tracking-widest transition-all"
                  >
                    <i className="fa-solid fa-ban mr-2"></i> Stop Recurring Billing
                  </button>
                  <p className="text-[10px] text-slate-400 italic">
                    Halts automated invoices from being compiled for this item, retaining past entries.
                  </p>
                </div>
              )}

              {/* Payment Logger Form */}
              {totalDue > 0 && (
                <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <h3 className="font-black text-[10px] text-slate-400 uppercase tracking-widest">
                    Log Collection Record
                  </h3>
                  <form onSubmit={handleLogPayment} className="space-y-4">
                    <div className="gap-4 grid grid-cols-2">
                      <div>
                        <label className="block mb-1 ml-1 font-black text-[9px] text-slate-400 uppercase">
                          Amount Received
                        </label>
                        <input
                          type="number"
                          required
                          max={totalDue}
                          className="bg-slate-50 dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full dark:text-white text-sm"
                          placeholder="৳ Amount"
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block mb-1 ml-1 font-black text-[9px] text-slate-400 uppercase">
                          Method
                        </label>
                        <select
                          className="bg-slate-50 dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full dark:text-white text-sm"
                          value={payMethod}
                          onChange={(e) => setPayMethod(e.target.value as any)}
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
                      <label className="block mb-1 ml-1 font-black text-[9px] text-slate-400 uppercase">
                        Reference Note
                      </label>
                      <input
                        type="text"
                        className="bg-slate-50 dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full dark:text-white text-sm"
                        placeholder="TXN ID / Check details..."
                        value={payNotes}
                        onChange={(e) => setPayNotes(e.target.value)}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLoggingPayment}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 py-3.5 rounded-lg font-black text-white text-xs uppercase tracking-widest transition-all"
                    >
                      {isLoggingPayment ? 'Processing...' : 'Register Payment'}
                    </button>
                  </form>
                </div>
              )}

              {/* Payments Timeline History */}
              <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                <h3 className="font-black text-[10px] text-slate-400 uppercase tracking-widest">
                  Payment History Timeline
                </h3>
                <div className="space-y-4">
                  {payments.map((pay) => (
                    <div
                      key={pay.id}
                      className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-950/40 rounded-lg relative group border border-slate-100 dark:border-slate-800/40 animate-slide-in"
                    >
                      <div className="flex justify-center items-center bg-indigo-100 dark:bg-indigo-900/30 rounded-full w-8 h-8 text-indigo-600 dark:text-indigo-400 mt-1">
                        <i className="fa-solid fa-money-bill-transfer text-xs"></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <p className="font-black text-slate-900 dark:text-white text-sm">
                            {invoiceForm.currency}
                            {pay.amount.toLocaleString()}
                          </p>
                          <span className="text-[9px] text-slate-400">
                            {new Date(pay.payment_date).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                        <span className="block font-black text-[8px] text-indigo-500 uppercase tracking-wider mt-0.5">
                          {pay.payment_method.replace('_', ' ')}
                        </span>
                        {pay.notes && (
                          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 leading-relaxed truncate">
                            {pay.notes}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeletePayment(pay.id)}
                        className="absolute right-4 top-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                        title="Remove payment record"
                      >
                        <i className="fa-solid fa-trash-can text-xs"></i>
                      </button>
                    </div>
                  ))}
                  {payments.length === 0 && (
                    <p className="text-slate-400 dark:text-slate-500 text-xs italic text-center py-4">
                      No collections logged yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* EDITOR FORM CONTENT */
            <div className="space-y-6 animate-fade-in pb-12">
              {/* Billing Entities */}
              <div className="space-y-4">
                <label className="block ml-1 font-black text-[9px] text-slate-400 uppercase tracking-widest">
                  Billing Entities
                </label>
                <div>
                  <label className="block mb-1 ml-1 text-[10px] font-bold text-slate-500">Issuer Entity</label>
                  <select
                    className="bg-slate-50 dark:bg-slate-950/50 p-4 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full dark:text-white text-sm"
                    value={invoiceForm.company_id || ''}
                    onChange={(e) => setInvoiceForm((p) => ({ ...p!, company_id: e.target.value }))}
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
                    value={invoiceForm.client_id || ''}
                    onChange={(e) => setInvoiceForm((p) => ({ ...p!, client_id: e.target.value }))}
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

              {/* Invoice Number & Status */}
              <div className="gap-4 grid grid-cols-2">
                <div>
                  <label className="block mb-1 ml-1 font-black text-[9px] text-slate-400 uppercase tracking-widest">
                    Invoice ID
                  </label>
                  <input
                    className="dark:bg-slate-950/50 p-4 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full dark:text-white text-sm"
                    placeholder="Invoice #"
                    value={invoiceForm.invoice_number || ''}
                    onChange={(e) => setInvoiceForm((p) => ({ ...p!, invoice_number: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block mb-1 ml-1 font-black text-[9px] text-slate-400 uppercase tracking-widest">
                    Status
                  </label>
                  <select
                    className="bg-slate-50 dark:bg-slate-950/50 p-4 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full dark:text-white text-sm"
                    value={invoiceForm.status || 'draft'}
                    onChange={(e) => setInvoiceForm((p) => ({ ...p!, status: e.target.value as any }))}
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
              </div>

              {/* Issue Date */}
              <div>
                <label className="block mb-1 ml-1 font-black text-[9px] text-slate-400 uppercase tracking-widest">
                  Issue Date
                </label>
                <input
                  type="date"
                  className="dark:bg-slate-950/50 p-4 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full dark:text-white text-sm"
                  value={invoiceForm.date || ''}
                  onChange={(e) => setInvoiceForm((p) => ({ ...p!, date: e.target.value }))}
                />
              </div>

              {/* Work Items List */}
              <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                  <label className="block font-black text-[9px] text-slate-400 uppercase tracking-widest">
                    Work Items
                  </label>
                  <span className="font-black text-[9px] text-indigo-500 uppercase">
                    Total: {invoiceForm.currency}
                    {totalAmount.toLocaleString()}
                  </span>
                </div>

                {itemsForm.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="group relative bg-slate-50 dark:bg-slate-950/50 p-4 border border-slate-200 dark:border-slate-800/80 rounded-lg animate-slide-in"
                  >
                    <input
                      className="bg-transparent mb-3 outline-none w-full font-bold dark:text-white text-sm border-b border-transparent focus:border-slate-300 dark:focus:border-slate-700 pb-1"
                      placeholder="Item description..."
                      value={item.description || ''}
                      onChange={(e) => {
                        const next = [...itemsForm];
                        next[idx].description = e.target.value;
                        setItemsForm(next);
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
                            const next = [...itemsForm];
                            next[idx].quantity = Number(e.target.value);
                            setItemsForm(next);
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
                            const next = [...itemsForm];
                            next[idx].rate = Number(e.target.value);
                            setItemsForm(next);
                          }}
                        />
                      </div>
                      <button
                        onClick={() => setItemsForm(itemsForm.filter((_, i) => i !== idx))}
                        className="mt-4 p-2 text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  onClick={() =>
                    setItemsForm([
                      ...itemsForm,
                      { id: crypto.randomUUID(), description: '', quantity: 1, rate: 0 },
                    ])
                  }
                  className="py-3 border-2 border-slate-200 dark:border-slate-800 border-dashed rounded-lg w-full font-black text-[9px] text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 uppercase tracking-widest transition-all"
                >
                  + Add Work Entry
                </button>
              </div>

              {/* Currency & Tax Rate */}
              <div className="gap-4 grid grid-cols-2">
                <div>
                  <label className="block mb-1 ml-1 font-black text-[9px] text-slate-400 uppercase tracking-widest">
                    Currency Symbol
                  </label>
                  <input
                    className="dark:bg-slate-950/50 p-4 border border-slate-200 dark:border-slate-800 rounded-lg outline-none w-full dark:text-white text-sm"
                    placeholder="৳"
                    value={invoiceForm.currency || ''}
                    onChange={(e) => setInvoiceForm((p) => ({ ...p!, currency: e.target.value }))}
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
                    value={invoiceForm.tax_rate || 0}
                    onChange={(e) => setInvoiceForm((p) => ({ ...p!, tax_rate: Number(e.target.value) }))}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block mb-1 ml-1 font-black text-[9px] text-slate-400 uppercase tracking-widest">
                  Notes
                </label>
                <textarea
                  className="dark:bg-slate-950/50 p-4 border border-slate-200 dark:border-slate-800 rounded-lg outline-none w-full h-24 dark:text-white text-sm resize-none"
                  placeholder="Official Notes"
                  value={invoiceForm.notes || ''}
                  onChange={(e) => setInvoiceForm((p) => ({ ...p!, notes: e.target.value }))}
                />
              </div>

              {/* Subscription Options */}
              <div className="bg-slate-50 dark:bg-slate-950/50 p-5 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
                <label className="inline-flex relative items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={invoiceForm.is_recurring || false}
                    onChange={(e) => setInvoiceForm((p) => ({ ...p!, is_recurring: e.target.checked }))}
                  />
                  <div className="peer after:top-1/2 after:left-[2px] after:absolute bg-slate-300 after:bg-white dark:bg-slate-700 peer-checked:bg-indigo-600 after:border after:border-gray-300 peer-checked:after:border-white rounded-full after:rounded-full peer-focus:outline-none w-11 after:w-5 h-6 after:h-5 after:content-[''] after:transition-all after:translate-y-[-50%] peer-checked:after:translate-x-[calc(100%-6px)]"></div>
                  <span className="ml-3 font-bold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider">
                    Recurring Invoice
                  </span>
                </label>

                {invoiceForm.is_recurring && (
                  <div className="space-y-4 animate-slide-in">
                    <div>
                      <label className="block mb-1 ml-1 font-black text-[8px] text-slate-400 uppercase">
                        Frequency
                      </label>
                      <select
                        className="bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full dark:text-white text-xs font-bold"
                        value={invoiceForm.recurring_frequency || 'monthly'}
                        onChange={(e) =>
                          setInvoiceForm((p) => ({ ...p!, recurring_frequency: e.target.value as any }))
                        }
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
                        value={invoiceForm.next_generation_date || ''}
                        onChange={(e) =>
                          setInvoiceForm((p) => ({ ...p!, next_generation_date: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Save Button */}
              <button
                onClick={handleSaveInvoiceEdits}
                disabled={isSaving}
                className="w-full bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 py-4 rounded-lg font-black text-white text-xs uppercase tracking-widest transition-all mt-6 shadow-2xl"
              >
                {isSaving ? 'Synching Editor State...' : 'Commit Invoice Record'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
