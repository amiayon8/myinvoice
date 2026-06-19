import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { InvoicePreview } from '@/components/invoice-preview';
import { ResponsiveInvoiceWrapper } from '@/components/responsive-invoice-wrapper';
import { PublicHeader } from '@/components/public-header';
import { CompanyProfile } from '@/types';

interface PublicInvoicePageProps {
  params: Promise<{ token: string }>;
}

export default async function PublicInvoicePage({ params }: PublicInvoicePageProps) {
  const { token } = await params;
  const supabase = await createClient();

  // Query token details
  const { data: tokenRecord, error: tokenError } = await supabase
    .from('invoice_access_tokens')
    .select('*')
    .eq('token', token)
    .single();

  if (tokenError || !tokenRecord) {
    return notFound();
  }

  // Check if token has expired
  const now = new Date();
  const expiry = new Date(tokenRecord.expires_at);
  if (expiry < now || !tokenRecord.is_public) {
    return (
      <div className="flex flex-col justify-center items-center bg-slate-50 dark:bg-[#020617] min-h-screen text-center p-6 font-sans">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-xl shadow-md border border-slate-200 dark:border-slate-800 max-w-md w-full">
          <div className="text-red-500 mb-4">
            <i className="fa-solid fa-circle-exclamation text-5xl"></i>
          </div>
          <h1 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight mb-2">
            Access Expired
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-6">
            This invoice sharing link has expired or is no longer public. Please contact the issuer to request a new link.
          </p>
        </div>
      </div>
    );
  }

  // Fetch invoice details
  const { data: invoice, error: invError } = await supabase
    .from('invoices')
    .select('*, items:invoice_items(*), client:clients(*), company:companies(*)')
    .eq('id', tokenRecord.invoice_id)
    .single();

  if (invError || !invoice) {
    return notFound();
  }

  // Fetch payments to compute totals
  const { data: payments } = await supabase
    .from('invoice_payments')
    .select('amount')
    .eq('invoice_id', invoice.id);

  const totalPaid = (payments || []).reduce((sum, p) => sum + p.amount, 0);
  const subtotal = invoice.items?.reduce((sum, item) => sum + (item.quantity * item.rate), 0) || 0;
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
