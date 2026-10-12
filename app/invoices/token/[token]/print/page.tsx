import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { notFound } from 'next/navigation';
import { PrintPageContent } from '@/components/print-page-content';
import { CompanyProfile } from '@/types';

interface TokenPrintInvoicePageProps {
  params: Promise<{ token: string }>;
  searchParams?: Promise<{ bill?: string }>;
}

export async function generateMetadata({ params, searchParams }: TokenPrintInvoicePageProps) {
  const { token } = await params;
  const { bill: selectedBillId } = (await searchParams) || {};
  const supabase = createServiceRoleClient();

  const { data: tokenRecord } = await supabase
    .from('invoice_access_tokens')
    .select('invoice_id')
    .eq('token', token)
    .single();

  if (!tokenRecord) return { title: 'Invoice' };

  const { data: parentInvoice } = await supabase
    .from('invoices')
    .select('id, invoice_number, is_recurring')
    .eq('id', tokenRecord.invoice_id)
    .single();

  if (!parentInvoice) return { title: 'Invoice' };

  if (parentInvoice.is_recurring) {
    const { data: mappingLogs } = await supabase
      .from('recurring_invoices')
      .select('child_invoice_id')
      .eq('parent_invoice_id', parentInvoice.id);

    if (mappingLogs && mappingLogs.length > 0) {
      const childIds = mappingLogs.map((m: any) => m.child_invoice_id);
      const { data: childInvoices } = await supabase
        .from('invoices')
        .select('id, invoice_number, date, created_at')
        .in('id', childIds)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      const sortedChildren = (childInvoices || []).sort((a: any, b: any) => {
        const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });

      if (
        selectedBillId &&
        selectedBillId !== parentInvoice.id &&
        selectedBillId !== 'main' &&
        selectedBillId !== 'parent'
      ) {
        const matched = sortedChildren.find((b: any) => b.id === selectedBillId);
        if (matched) return { title: matched.invoice_number };
      } else if (!selectedBillId && sortedChildren.length > 0) {
        return { title: sortedChildren[0].invoice_number };
      }
    }
  }

  return {
    title: parentInvoice.invoice_number || 'Invoice',
  };
}

export default async function TokenPrintInvoicePage({ params, searchParams }: TokenPrintInvoicePageProps) {
  const { token } = await params;
  const { bill: selectedBillId } = (await searchParams) || {};
  const supabase = createServiceRoleClient();

  const { data: tokenRecord, error: tokenError } = await supabase
    .from('invoice_access_tokens')
    .select('*')
    .eq('token', token)
    .single();

  if (tokenError || !tokenRecord) return notFound();

  if (tokenRecord.revoked_at || !tokenRecord.is_public) {
    return <InvalidPage />;
  }

  if (!tokenRecord.never_expires && tokenRecord.expires_at) {
    if (new Date(tokenRecord.expires_at) < new Date()) {
      return <InvalidPage />;
    }
  }

  const { data: parentInvoice, error: invError } = await supabase
    .from('invoices')
    .select('*, items:invoice_items(*), client:clients(*), company:companies(*)')
    .eq('id', tokenRecord.invoice_id)
    .single();

  if (invError || !parentInvoice) return notFound();

  let activeInvoice = parentInvoice;

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
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      const sortedChildren = (childInvoices || []).sort((a: any, b: any) => {
        const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });

      if (
        selectedBillId &&
        selectedBillId !== parentInvoice.id &&
        selectedBillId !== 'main' &&
        selectedBillId !== 'parent'
      ) {
        const matched = sortedChildren.find((b: any) => b.id === selectedBillId);
        if (matched) {
          activeInvoice = {
            ...matched,
            client: parentInvoice.client,
            company: parentInvoice.company,
          };
        }
      } else if (!selectedBillId && sortedChildren.length > 0) {
        activeInvoice = {
          ...sortedChildren[0],
          client: parentInvoice.client,
          company: parentInvoice.company,
        };
      }
    }
  }

  const { data: payments } = await supabase
    .from('invoice_payments')
    .select('amount')
    .eq('invoice_id', activeInvoice.id);

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
    <PrintPageContent previewData={previewData} company={activeInvoice.company as CompanyProfile} />
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
