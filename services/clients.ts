'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { Client } from '@/types';

export async function saveClient(clientData: Partial<Client>) {
  const supabase = await createClient();
  const { id, created_at, ...dataToSave } = clientData;

  let result;
  if (id) {
    result = await supabase
      .from('clients')
      .update(dataToSave)
      .eq('id', id)
      .select()
      .single();
  } else {
    result = await supabase
      .from('clients')
      .insert(dataToSave)
      .select()
      .single();
  }

  if (result.error) {
    throw new Error(result.error.message);
  }

  revalidatePath('/clients');
  revalidatePath('/dashboard');
  revalidatePath('/invoices');
  return result.data;
}
