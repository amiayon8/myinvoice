import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { InvoicePreview } from '@/components/invoice-preview';
import { ResponsiveInvoiceWrapper } from '@/components/responsive-invoice-wrapper';
import { PublicHeader } from '@/components/public-header';
import { CompanyProfile } from '@/types';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

interface PublicInvoicePageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ bill?: string }>;
}

function parseUserAgent(ua: string) {
  const browser =
    /Edg\//.test(ua) ? 'Edge' :
      /OPR\/|Opera\//.test(ua) ? 'Opera' :
        /Chrome\//.test(ua) && !/Chromium\//.test(ua) ? 'Chrome' :
          /Chromium\//.test(ua) ? 'Chromium' :
            /Firefox\//.test(ua) ? 'Firefox' :
              /Safari\//.test(ua) && !/Chrome\//.test(ua) ? 'Safari' :
                /MSIE |Trident\//.test(ua) ? 'IE' : 'Unknown';

  const os =
    /Windows NT 10/.test(ua) ? 'Windows 10/11' :
      /Windows NT 6\.3/.test(ua) ? 'Windows 8.1' :
        /Windows NT 6\.1/.test(ua) ? 'Windows 7' :
          /Windows/.test(ua) ? 'Windows' :
            /Mac OS X/.test(ua) ? 'macOS' :
              /Android/.test(ua) ? 'Android' :
                /iPhone|iPad/.test(ua) ? 'iOS' :
                  /Linux/.test(ua) ? 'Linux' : 'Unknown';

  const device =
    /Mobile|Android|iPhone/.test(ua) ? 'Mobile' :
      /iPad|Tablet/.test(ua) ? 'Tablet' : 'Desktop';

  return { browser, os, device };
}

export default async function PublicInvoicePage({ params, searchParams }: PublicInvoicePageProps) {
  const { token } = await params;
  const { bill: selectedBillId } = await searchParams;

  const reqHeaders = await headers();
  const supabase = createServiceRoleClient();

  // Validate token directly (no internal HTTP call — works reliably on Vercel serverless)
  const { data: tokenRecord, error: tokenError } = await supabase
    .from('invoice_access_tokens')
    .select('id, invoice_id, expires_at, never_expires, is_public, revoked_at')
    .eq('token', token)
    .single();

  if (tokenError || !tokenRecord) return notFound();

  // Check revoked
  if (tokenRecord.revoked_at) {
    return <InvalidPage reason="revoked" />;
  }

  // Check public flag
  if (!tokenRecord.is_public) {
    return <InvalidPage reason="expired" />;
  }

  // Check expiry (skip if never_expires)
  if (!tokenRecord.never_expires && tokenRecord.expires_at) {
    if (new Date(tokenRecord.expires_at) < new Date()) {
      return <InvalidPage reason="expired" />;
    }
  }

  // Log the view asynchronously (don't await — don't block render)
  const userAgent = reqHeaders.get('user-agent') || '';
  const ip =
    reqHeaders.get('x-forwarded-for')?.split(',')[0].trim() ||
    reqHeaders.get('x-real-ip') ||
    reqHeaders.get('cf-connecting-ip') ||
    'unknown';
  const referrer = reqHeaders.get('referer') || null;
  const { browser, os, device } = parseUserAgent(userAgent);

  // Fire-and-forget view log insertion
  supabase.from('invoice_view_logs').insert({
    token_id: tokenRecord.id,
    invoice_id: tokenRecord.invoice_id,
    ip_address: ip,
    user_agent: userAgent,
    browser,
    os,
    device,
    referrer,
  }).then(() => { });

  // Fetch parent template invoice
  const { data: parentInvoice, error: invError } = await supabase
    .from('invoices')
    .select('*, items:invoice_items(*), client:clients(*), company:companies(*)')
    .eq('id', tokenRecord.invoice_id)
    .single();

  if (invError || !parentInvoice) return notFound();

  // If template is recurring, fetch generated instances
  let childBills: any[] = [];
  if (parentInvoice.is_recurring) {
    const { data: mappingLogs } = await supabase
      .from('recurring_invoices')
      .select('child_invoice_id')
      .eq('parent_invoice_id', parentInvoice.id);

    if (mappingLogs && mappingLogs.length > 0) {
      const childIds = mappingLogs.map((m: any) => m.child_invoice_id);
      const { data: childInvoices } = await supabase
        .from('invoices')
        .select('*, items:invoice_items(*)')
        .in('id', childIds)
        .order('date', { ascending: false });

      childBills = childInvoices || [];
    }
  }

  // Resolve active invoice to show (parent or specific child bill)
  let activeInvoice = parentInvoice;
  if (selectedBillId && parentInvoice.is_recurring) {
    const matchedBill = childBills.find((b: any) => b.id === selectedBillId);
    if (matchedBill) {
      activeInvoice = {
        ...matchedBill,
        client: parentInvoice.client,
        company: parentInvoice.company,
      };
    }
  }

  // Fetch payments for active invoice
  const { data: payments } = await supabase
    .from('invoice_payments')
    .select('id, amount, payment_date, payment_method, notes')
    .eq('invoice_id', activeInvoice.id)
    .order('payment_date', { ascending: false });

  const totalPaid = (payments || []).reduce((sum: number, p: any) => sum + p.amount, 0);
  const subtotal = activeInvoice.items?.reduce((sum: number, item: any) => sum + item.quantity * item.rate, 0) || 0;
  const taxAmount = subtotal * ((activeInvoice.tax_rate || 0) / 100);
  const totalAmount = subtotal + taxAmount;

  const previewData = {
    invoiceNumber: activeInvoice.invoice_number,
    date: activeInvoice.date,
    companyId: activeInvoice.company_id,
    client: activeInvoice.client || { name: 'Recipient', email: '', address: '' },
    items: activeInvoice.items || [],
    notes: activeInvoice.notes,
    currency: activeInvoice.currency,
    taxRate: activeInvoice.tax_rate,
    isRecurring: activeInvoice.is_recurring,
    recurringFrequency: activeInvoice.recurring_frequency,
    paid_amount: totalPaid,
    status: totalPaid >= totalAmount ? 'paid' : totalPaid > 0 ? 'partially_paid' : activeInvoice.status,
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#020617] flex flex-col items-center py-12 p-4 print:p-0 print:bg-white">
      <PublicHeader token={token} />
      {/* Generated child bills section */}
      {parentInvoice.is_recurring && childBills.length > 0 && (
        <div className="mt-12 w-full max-w-[800px] bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-md no-print">
          <h2 className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
            <i className="fa-solid fa-clock-rotate-left text-indigo-500"></i> Generated Invoices
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-500 dark:text-slate-400">
              <thead className="bg-slate-50 dark:bg-slate-950/50 font-black text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Invoice Number</th>
                  <th className="px-4 py-3">Billing Date</th>
                  <th className="px-4 py-3 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                {childBills.map((bill) => {
                  const billSubtotal = bill.items?.reduce((sum: number, item: any) => sum + item.quantity * item.rate, 0) || 0;
                  const billTax = billSubtotal * ((bill.tax_rate || 0) / 100);
                  const billTotal = billSubtotal + billTax;
                  const isCurrent = activeInvoice.id === bill.id;

                  return (
                    <tr
                      key={bill.id}
                      className={`transition-colors ${isCurrent
                        ? 'bg-indigo-50/50 dark:bg-indigo-950/15 font-bold text-slate-900 dark:text-white'
                        : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/20'
                        }`}
                    >
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-300">
                        #{bill.invoice_number}
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={`/invoices/token/${token}?bill=${bill.id}`}
                          className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 underline font-bold"
                        >
                          {new Date(bill.date).toLocaleDateString(undefined, {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-right font-black text-slate-900 dark:text-white">
                        {bill.currency}
                        {billTotal.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info Banner when viewing child bill */}
      {activeInvoice.id !== parentInvoice.id && (
        <div className="mb-6 w-full max-w-[800px] bg-indigo-50 border border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/50 rounded-xl p-4 flex justify-between items-center text-xs font-semibold text-indigo-700 dark:text-indigo-400 no-print animate-slide-in">
          <span>
            <i className="fa-solid fa-circle-info mr-2"></i> Viewing recurring invoice #{activeInvoice.invoice_number}
          </span>
          <a
            href={`/invoices/token/${token}`}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            View Parent Invoice
          </a>
        </div>
      )}

      {/* Payment History section */}
      {payments && payments.length > 0 && (
        <div className="mb-6 w-full max-w-[800px] bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-md no-print animate-slide-in">
          <h2 className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
            <i className="fa-solid fa-receipt text-emerald-500"></i> Payment History
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-500 dark:text-slate-400">
              <thead className="bg-slate-50 dark:bg-slate-950/50 font-black text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Reference/Notes</th>
                  <th className="px-4 py-3 text-right">Amount Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                {payments.map((pay: any) => (
                  <tr key={pay.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="px-4 py-3 text-slate-900 dark:text-slate-300 font-semibold">
                      {new Date(pay.payment_date).toLocaleDateString(undefined, {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
                        {pay.payment_method ? pay.payment_method.replace('_', ' ') : 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 max-w-[200px] truncate" title={pay.notes || undefined}>
                      {pay.notes || <span className="italic text-slate-400">No notes</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-slate-900 dark:text-white">
                      {activeInvoice.currency}
                      {pay.amount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ResponsiveInvoiceWrapper>
        <div className="shadow-2xl rounded-lg overflow-hidden print:shadow-none print:rounded-none">
          <InvoicePreview data={previewData} company={parentInvoice.company as CompanyProfile} />
        </div>
      </ResponsiveInvoiceWrapper>


    </div>
  );
}

function InvalidPage({ reason }: { reason: 'revoked' | 'expired' }) {
  const isRevoked = reason === 'revoked';
  return (
    <div className="flex flex-col justify-center items-center bg-slate-50 dark:bg-[#020617] min-h-screen text-center p-6 font-sans">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-xl shadow-md border border-slate-200 dark:border-slate-800 max-w-md w-full space-y-4">
        <div className={isRevoked ? 'text-orange-500' : 'text-red-500'}>
          <i className={`fa-solid ${isRevoked ? 'fa-ban' : 'fa-circle-exclamation'} text-5xl`}></i>
        </div>
        <h1 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">
          {isRevoked ? 'Link Revoked' : 'Access Expired'}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
          {isRevoked
            ? 'This invoice sharing link has been revoked by the issuer.'
            : 'This invoice sharing link has expired or is no longer active. Please contact the issuer to request a new link.'}
        </p>
      </div>
    </div>
  );
}
