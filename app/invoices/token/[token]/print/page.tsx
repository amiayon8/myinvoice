import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { notFound } from 'next/navigation';
import { PrintPageContent } from '@/components/print-page-content';
import { CompanyProfile } from '@/types';

interface TokenPrintInvoicePageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: TokenPrintInvoicePageProps) {
  const { token } = await params;
  const supabase = createServiceRoleClient();

  const { data: tokenRecord } = await supabase
    .from('invoice_access_tokens')
    .select('invoice_id')
    .eq('token', token)
    .single();

  if (!tokenRecord) return { title: 'Invoice' };

  const { data: invoice } = await supabase
    .from('invoices')
    .select('invoice_number')
    .eq('id', tokenRecord.invoice_id)
    .single();

  return {
    title: invoice ? invoice.invoice_number : 'Invoice',
  };
}

export default async function TokenPrintInvoicePage({ params }: TokenPrintInvoicePageProps) {
  const { token } = await params;
  const supabase = createServiceRoleClient();

  // Validate token using service-role (no RLS issues on Vercel)
  const { data: tokenRecord, error: tokenError } = await supabase
    .from('invoice_access_tokens')
    .select('*')
    .eq('token', token)
    .single();

  if (tokenError || !tokenRecord) return notFound();

  // Check revoked
  if (tokenRecord.revoked_at || !tokenRecord.is_public) {
    return <InvalidPage />;
  }

  // Check expiry — respect never_expires flag
  if (!tokenRecord.never_expires && tokenRecord.expires_at) {
    if (new Date(tokenRecord.expires_at) < new Date()) {
      return <InvalidPage />;
    }
  }

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
    <PrintPageContent previewData={previewData} company={invoice.company as CompanyProfile} />
  );
}

function InvalidPage() {
  return (
    <div className="flex flex-col justify-center items-center bg-slate-50 dark:bg-[#020617] min-h-screen text-center p-6 font-sans">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-xl shadow-md border border-slate-200 dark:border-slate-800 max-w-md w-full">
        <div className="text-red-500 mb-4">
          <i className="fa-solid fa-circle-exclamation text-5xl"></i>
        </div>
        <h1 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight mb-2">
          Access Expired
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
          This invoice sharing link has expired, been revoked, or is no longer public.
          Please contact the issuer to request a new link.
        </p>
      </div>
    </div>
  );
}
