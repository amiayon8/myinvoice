'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function addInvoicePayment(
  invoiceId: string,
  amount: number,
  paymentMethod: 'cash' | 'bank_transfer' | 'mobile_banking' | 'card' | 'other',
  notes?: string
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('invoice_payments')
    .insert({
      invoice_id: invoiceId,
      amount,
      payment_method: paymentMethod,
      notes,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath('/invoices');
  revalidatePath('/dashboard');
  return data;
}

export async function deleteInvoicePayment(id: string, invoiceId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('invoice_payments').delete().eq('id', id);
  if (error) throw new Error(error.message);

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath('/invoices');
  revalidatePath('/dashboard');
}
