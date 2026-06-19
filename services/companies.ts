'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { CompanyProfile } from '@/types';

export async function saveCompany(companyData: Partial<CompanyProfile>) {
  const supabase = await createClient();
  const { id, created_at, ...dataToSave } = companyData;

  let result;
  if (id) {
    result = await supabase
      .from('companies')
      .update(dataToSave)
      .eq('id', id)
      .select()
      .single();
  } else {
    result = await supabase
      .from('companies')
      .insert(dataToSave)
      .select()
      .single();
  }

  if (result.error) {
    throw new Error(result.error.message);
  }

  revalidatePath('/companies');
  revalidatePath('/dashboard');
  revalidatePath('/invoices');
  return result.data;
}
