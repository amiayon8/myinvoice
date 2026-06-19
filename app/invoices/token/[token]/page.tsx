import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { InvoicePreview } from '@/components/invoice-preview';
import { ResponsiveInvoiceWrapper } from '@/components/responsive-invoice-wrapper';
import { PublicHeader } from '@/components/public-header';
import { CompanyProfile } from '@/types';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

interface PublicInvoicePageProps {
  params: Promise<{ token: string }>;
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

export default async function PublicInvoicePage({ params }: PublicInvoicePageProps) {
  const { token } = await params;
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
  }).then(() => {});


  // Fetch invoice
  const { data: invoice, error: invError } = await supabase
    .from('invoices')
    .select('*, items:invoice_items(*), client:clients(*), company:companies(*)')
    .eq('id', tokenRecord.invoice_id)
    .single();

  if (invError || !invoice) return notFound();

  // Fetch payments
  const { data: payments } = await supabase
    .from('invoice_payments')
    .select('amount')
    .eq('invoice_id', invoice.id);

  const totalPaid = (payments || []).reduce((sum: number, p: any) => sum + p.amount, 0);
  const subtotal = invoice.items?.reduce((sum: number, item: any) => sum + item.quantity * item.rate, 0) || 0;
  const taxAmount = subtotal * ((invoice.tax_rate || 0) / 100);
  const totalAmount = subtotal + taxAmount;

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
    <div className="min-h-screen bg-slate-100 dark:bg-[#020617] flex flex-col items-center py-12 p-4 print:p-0 print:bg-white transition-colors duration-500">
      <PublicHeader token={token} />
      <ResponsiveInvoiceWrapper>
        <div className="shadow-2xl rounded-lg overflow-hidden print:shadow-none print:rounded-none">
          <InvoicePreview data={previewData} company={invoice.company as CompanyProfile} />
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
