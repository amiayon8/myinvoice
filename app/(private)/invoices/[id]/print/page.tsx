import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { PrintPageContent } from '@/components/print-page-content';
import { CompanyProfile } from '@/types';

interface PrintInvoicePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PrintInvoicePageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: invoice } = await supabase
    .from('invoices')
    .select('invoice_number')
    .eq('id', id)
    .single();

  return {
    title: invoice ? invoice.invoice_number : `Invoice ${id}`,
  };
}

export default async function PrintInvoicePage({ params }: PrintInvoicePageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch invoice details with items, client and company
  const { data: invoice, error: invError } = await supabase
    .from('invoices')
    .select('*, items:invoice_items(*), client:clients(*), company:companies(*)')
    .eq('id', id)
    .single();

  if (invError || !invoice) {
    return notFound();
  }

  // Fetch payments to compute totals
  const { data: payments } = await supabase
    .from('invoice_payments')
    .select('amount')
    .eq('invoice_id', id);

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
    <PrintPageContent previewData={previewData} company={invoice.company as CompanyProfile} />
  );
}
