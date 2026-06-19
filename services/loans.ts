'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface DisburseLoanData {
  type: 'given' | 'taken';
  client_id?: string;
  provider_name?: string;
  source_id?: string;
  principal_amount: number;
  interest_rate: number;
  disbursement_date: string;
  due_date?: string;
  repayment_schedule?: 'weekly' | 'monthly' | 'quarterly' | 'annually' | 'one_off';
  notes?: string;
}

export async function disburseLoan(loanData: DisburseLoanData) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('loans')
    .insert({
      type: loanData.type,
      client_id: loanData.type === 'given' ? loanData.client_id : null,
      provider_name: loanData.type === 'taken' ? loanData.provider_name : null,
      source_id: loanData.type === 'taken' ? loanData.source_id : null,
      principal_amount: loanData.principal_amount,
      interest_rate: loanData.interest_rate,
      disbursement_date: loanData.disbursement_date,
      due_date: loanData.due_date || null,
      repayment_schedule: loanData.repayment_schedule || null,
      status: 'active',
      notes: loanData.notes || '',
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath('/loans');
  revalidatePath('/dashboard');
  return data;
}

export async function recordLoanRepayment(
  loanId: string,
  amount: number,
  paymentMethod: 'cash' | 'bank_transfer' | 'mobile_banking' | 'card' | 'other',
  referenceNotes?: string
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('loan_payments')
    .insert({
      loan_id: loanId,
      amount,
      payment_method: paymentMethod,
      reference_notes: referenceNotes,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath(`/loans/${loanId}`);
  revalidatePath('/loans');
  revalidatePath('/dashboard');
  return data;
}

export async function deleteLoanPayment(id: string, loanId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('loan_payments').delete().eq('id', id);
  if (error) throw new Error(error.message);

  revalidatePath(`/loans/${loanId}`);
  revalidatePath('/loans');
  revalidatePath('/dashboard');
}

export async function deleteLoan(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('loans').delete().eq('id', id);
  if (error) throw new Error(error.message);

  revalidatePath('/loans');
  revalidatePath('/dashboard');
}

export async function getLoanSources() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('loan_sources')
    .select('*')
    .order('name');
  if (error) throw new Error(error.message);
  return data;
}

export async function saveLoanSource(sourceData: any) {
  const supabase = await createClient();
  const { id, created_at, ...baseData } = sourceData;

  if (id) {
    const { data, error } = await supabase
      .from('loan_sources')
      .update(baseData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  } else {
    const { data, error } = await supabase
      .from('loan_sources')
      .insert(baseData)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }
}

export async function deleteLoanSource(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('loan_sources')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}
