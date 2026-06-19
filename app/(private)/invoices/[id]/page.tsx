'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { generateInvoiceAccessToken, saveInvoice } from '@/services/invoices';
import { addInvoicePayment, deleteInvoicePayment } from '@/services/payments';
import { InvoicePreview } from '@/components/invoice-preview';
import { ResponsiveInvoiceWrapper } from '@/components/responsive-invoice-wrapper';
import { Invoice, CompanyProfile, Client } from '@/types';
import { useToast } from '@/components/ui/toast';
import { DetailSkeleton } from '@/components/skeleton';

export default function InvoiceDetailsPage() {
  const router = useRouter();
  const { id: invoiceId } = useParams() as { id: string };
  const supabase = createClient();
  const toast = useToast();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Payment Form State
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'cash' | 'bank_transfer' | 'mobile_banking' | 'card' | 'other'>('bank_transfer');
  const [payNotes, setPayNotes] = useState('');
  const [isLoggingPayment, setIsLoggingPayment] = useState(false);

  // Secure Token State
  const [publicToken, setPublicToken] = useState<string | null>(null);
  const [tokenExpiry, setTokenExpiry] = useState<string | null>(null);
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

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

      // 2. Fetch payments for this invoice
      const { data: payData, error: payError } = await supabase
        .from('invoice_payments')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('payment_date', { ascending: false });

      if (payError) throw payError;
      setPayments(payData || []);

      // 3. Fetch token access if exists
      const { data: tokenData } = await supabase
        .from('invoice_access_tokens')
        .select('*')
        .eq('invoice_id', invoiceId)
        .single();
      
      if (tokenData) {
        setPublicToken(tokenData.token);
        setTokenExpiry(tokenData.expires_at);
      }
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

  const handleGenerateToken = async () => {
    setIsGeneratingToken(true);
    try {
      const token = await generateInvoiceAccessToken(invoiceId);
      toast.success('Sharing token generated successfully.');
      setPublicToken(token);
      
      // Calculate token expiration date (30 days from now)
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 30);
      setTokenExpiry(expiry.toISOString());
    } catch (err: any) {
      toast.error(err.message || 'Error generating token');
    } finally {
      setIsGeneratingToken(false);
    }
  };

  const handleCopyLink = () => {
    if (!publicToken) return;
    const shareUrl = `${window.location.origin}/invoices/token/${publicToken}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Sharing URL copied to clipboard.');
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
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

  if (!invoice) {
    return (
      <div className="p-8 text-center text-slate-500 italic">
        Invoice not found.
      </div>
    );
  }

  // Calculate totals
  const subtotal = invoice.items?.reduce((sum, item) => sum + (item.quantity * item.rate), 0) || 0;
  const taxAmount = subtotal * ((invoice.tax_rate || 0) / 100);
  const totalAmount = subtotal + taxAmount;
  const totalPaid = payments.reduce((sum, pay) => sum + pay.amount, 0);
  const totalDue = totalAmount - totalPaid;

  const previewData = {
    invoiceNumber: invoice.invoice_number,
    date: invoice.date,
    companyId: invoice.company_id,
    client: invoice.client || { name: 'Recipient', email: '', address: '' },
    items: invoice.items || [],
    notes: invoice.notes,
    currency: invoice.currency,
    taxRate: invoice.tax_rate,
    isRecurring: invoice.is_recurring,
    recurringFrequency: invoice.recurring_frequency,
    paid_amount: totalPaid,
    status: totalPaid >= totalAmount ? 'paid' : totalPaid > 0 ? 'partially_paid' : invoice.status,
  };

  return (
    <div className="flex xl:flex-row flex-col bg-slate-100 dark:bg-[#020617] h-full min-h-screen">
      {/* Left: Invoice Preview Card */}
      <div className="flex-1 flex justify-center items-start p-6 lg:p-12 overflow-y-auto custom-scrollbar print:p-0 print:overflow-visible">
        <ResponsiveInvoiceWrapper>
          <div className="shadow-2xl rounded-lg overflow-hidden print:shadow-none print:rounded-none">
            <InvoicePreview
              data={previewData}
              company={invoice.company || ({ name: 'Company Profile', color: '#6366f1' } as CompanyProfile)}
            />
          </div>
        </ResponsiveInvoiceWrapper>
      </div>

      {/* Right Sidebar: Control Panel */}
      <div className="w-full xl:w-[480px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-6 lg:p-8 space-y-8 overflow-y-auto custom-scrollbar no-print">
        <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="font-black text-slate-900 dark:text-white text-xl uppercase tracking-tighter">
              Control Panel
            </h2>
            <span className="font-bold text-slate-400 text-xs">Manage billing flow state</span>
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
              onClick={() => router.push(`/invoices/${invoiceId}/edit`)}
              className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title="Edit Invoice"
            >
              <i className="fa-solid fa-pen text-base"></i>
            </button>
          </div>
        </div>

        {/* Financial Summary card */}
        <div className="bg-slate-50 dark:bg-slate-950/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800/80">
          <h3 className="font-black text-[10px] text-slate-400 uppercase tracking-widest mb-4">
            Outstanding Ledger
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-bold">Total Invoiced</span>
              <span className="font-black text-slate-900 dark:text-white">
                {invoice.currency}
                {totalAmount.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-emerald-500 font-bold">Total Paid</span>
              <span className="font-black text-emerald-500">
                {invoice.currency}
                {totalPaid.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-slate-800 text-sm">
              <span className="text-slate-700 dark:text-slate-300 font-black uppercase tracking-wider">
                Due Balance
              </span>
              <span className={`font-black text-base ${totalDue <= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {invoice.currency}
                {totalDue.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Secure Access Tokens */}
        <div className="space-y-4">
          <h3 className="font-black text-[10px] text-slate-400 uppercase tracking-widest">
            Client Secure Sharing
          </h3>
          {publicToken ? (
            <div className="space-y-3 animate-slide-in">
              <div className="bg-slate-50 dark:bg-slate-950/50 p-4 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between gap-3">
                <span className="font-medium text-xs text-slate-500 dark:text-slate-400 truncate max-w-[280px]">
                  {window.location.origin}/invoices/token/{publicToken}
                </span>
                <button
                  onClick={handleCopyLink}
                  className="bg-indigo-600 text-white px-3 py-1.5 rounded text-xs font-bold whitespace-nowrap hover:bg-indigo-700 transition-colors"
                >
                  {isCopied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 italic">
                Link expires: {new Date(tokenExpiry || '').toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          ) : (
            <button
              onClick={handleGenerateToken}
              disabled={isGeneratingToken}
              className="w-full bg-slate-950 hover:bg-slate-900 dark:bg-white dark:text-slate-950 py-3.5 rounded-lg font-black text-white text-xs uppercase tracking-widest transition-all"
            >
              {isGeneratingToken ? 'Generating...' : 'Generate Sharing Token'}
            </button>
          )}
        </div>

        {invoice.is_recurring && (
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
                      {invoice.currency}
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
    </div>
  );
}
