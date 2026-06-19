'use client';

import { InvoiceEditor } from '@/components/invoice-editor';
import { useParams } from 'next/navigation';

export default function EditInvoicePage() {
  const { id } = useParams() as { id: string };
  return <InvoiceEditor invoiceId={id} />;
}
