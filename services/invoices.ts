'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { Invoice, InvoiceItem } from '@/types';

export async function saveInvoice(invoiceData: Partial<Invoice>, items: Partial<InvoiceItem>[]) {
  const supabase = await createClient();
  const { id, items: _items, client: _c, company: _comp, created_at, ...baseData } = invoiceData;

  let savedInvoice;
  if (id) {
    const { data, error } = await supabase
      .from('invoices')
      .update(baseData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    savedInvoice = data;
  } else {
    const { data, error } = await supabase
      .from('invoices')
      .insert(baseData)
      .select()
      .single();
    if (error) throw new Error(error.message);
    savedInvoice = data;
  }

  if (savedInvoice && items) {
    // Delete old items
    const { error: delError } = await supabase
      .from('invoice_items')
      .delete()
      .eq('invoice_id', savedInvoice.id);
    if (delError) throw new Error(delError.message);

    // Insert new items
    if (items.length > 0) {
      const itemsToInsert = items.map(({ id: _id, invoice_id, ...item }) => ({
        ...item,
        invoice_id: savedInvoice.id,
      }));
      const { error: insError } = await supabase
        .from('invoice_items')
        .insert(itemsToInsert);
      if (insError) throw new Error(insError.message);
    }
  }

  revalidatePath('/invoices');
  revalidatePath('/dashboard');
  return savedInvoice;
}

export async function deleteInvoice(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('invoices').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/invoices');
  revalidatePath('/dashboard');
}


export async function createInvoiceShareToken(
  invoiceId: string,
  options: {
    label?: string;
    neverExpires?: boolean;
    daysExpiry?: number;
  } = {}
) {
  const supabase = await createClient();
  const { label, neverExpires = false, daysExpiry = 30 } = options;

  const expiresAt = neverExpires
    ? null
    : (() => {
        const d = new Date();
        d.setDate(d.getDate() + daysExpiry);
        return d.toISOString();
      })();

  const { data, error } = await supabase
    .from('invoice_access_tokens')
    .insert({
      invoice_id: invoiceId,
      expires_at: expiresAt,
      never_expires: neverExpires,
      label: label || null,
      is_public: true,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath('/invoices');
  return data;
}

export async function revokeInvoiceToken(tokenId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('invoice_access_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', tokenId);
  if (error) throw new Error(error.message);
  revalidatePath('/invoices');
}

export async function listInvoiceTokens(invoiceId: string) {
  const supabase = await createClient();

  const { data: tokens, error } = await supabase
    .from('invoice_access_tokens')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  // Fetch view counts for each token
  const tokenIds = (tokens || []).map((t: any) => t.id);
  const { data: logCounts } = await supabase
    .from('invoice_view_logs')
    .select('token_id')
    .in('token_id', tokenIds);

  const countMap: Record<string, number> = {};
  (logCounts || []).forEach((l: any) => {
    countMap[l.token_id] = (countMap[l.token_id] || 0) + 1;
  });

  return (tokens || []).map((t: any) => ({
    ...t,
    view_count: countMap[t.id] || 0,
  }));
}

export async function listInvoiceViewLogs(invoiceId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('invoice_view_logs')
    .select('*, token:invoice_access_tokens(label, token)')
    .eq('invoice_id', invoiceId)
    .order('viewed_at', { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return data || [];
}

/** @deprecated Use createInvoiceShareToken instead */
export async function generateInvoiceAccessToken(invoiceId: string, daysExpiry: number = 30) {
  return createInvoiceShareToken(invoiceId, { daysExpiry });
}



export async function generateRecurringInstanceAction(templateId: string, count: number = 1) {
  const supabase = await createClient();

  // 1. Fetch template invoice with items
  const { data: template, error: fetchError } = await supabase
    .from('invoices')
    .select('*, items:invoice_items(*)')
    .eq('id', templateId)
    .single();

  if (fetchError) throw new Error(fetchError.message);
  if (!template) throw new Error('Template invoice not found');
  if (!template.is_recurring) throw new Error('This invoice is not marked as recurring');
  if (!template.next_generation_date) throw new Error('No next generation date defined on template');

  let currentNextGenDateStr = template.next_generation_date;
  const generated = [];

  for (let run = 0; run < count; run++) {
    // Extract month and year from currentNextGenDateStr (expected YYYY-MM-DD)
    const parts = currentNextGenDateStr.split('-');
    if (parts.length !== 3) {
      throw new Error(`Invalid next generation date format: ${currentNextGenDateStr}`);
    }

    const yearFull = parts[0];
    const monthStr = parts[1];
    const yearStr = yearFull.slice(-2);

    const generatedNumber = `${template.invoice_number}-${monthStr}-${yearStr}`;

    // Check uq_parent_month_year constraint
    const { data: existingLog } = await supabase
      .from('recurring_invoices')
      .select('id')
      .eq('parent_invoice_id', template.id)
      .eq('month', monthStr)
      .eq('year', yearStr)
      .maybeSingle();

    if (existingLog) {
      if (count === 1) {
        throw new Error(`An invoice for ${monthStr}/${yearStr} has already been generated for this template.`);
      }
      currentNextGenDateStr = advanceFrequency(currentNextGenDateStr, template.recurring_frequency);
      continue;
    }

    // Check invoices table for safety
    const { data: existingInvoice } = await supabase
      .from('invoices')
      .select('id')
      .eq('invoice_number', generatedNumber)
      .maybeSingle();

    if (existingInvoice) {
      if (count === 1) {
        throw new Error(`Invoice number ${generatedNumber} already exists.`);
      }
      currentNextGenDateStr = advanceFrequency(currentNextGenDateStr, template.recurring_frequency);
      continue;
    }

    // Insert new invoice
    const { data: newInvoice, error: insertError } = await supabase
      .from('invoices')
      .insert({
        invoice_number: generatedNumber,
        date: currentNextGenDateStr,
        company_id: template.company_id,
        client_id: template.client_id,
        notes: template.notes,
        currency: template.currency,
        tax_rate: template.tax_rate,
        status: 'draft',
        is_recurring: false,
        paid_amount: 0,
      })
      .select()
      .single();

    if (insertError) throw new Error(insertError.message);

    // Log the generation
    const { error: logError } = await supabase
      .from('recurring_invoices')
      .insert({
        parent_invoice_id: template.id,
        child_invoice_id: newInvoice.id,
        month: monthStr,
        year: yearStr,
      });

    if (logError) throw new Error(logError.message);

    // Duplicate items
    if (template.items && template.items.length > 0) {
      const itemsToInsert = template.items.map((item: any) => ({
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        invoice_id: newInvoice.id,
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsToInsert);

      if (itemsError) throw new Error(itemsError.message);
    }

    generated.push({
      id: newInvoice.id,
      invoice_number: generatedNumber,
      date: currentNextGenDateStr,
    });

    // Advance date
    currentNextGenDateStr = advanceFrequency(currentNextGenDateStr, template.recurring_frequency);
  }

  // Update the template's next scheduled generation date in the database
  const { error: updateError } = await supabase
    .from('invoices')
    .update({ next_generation_date: currentNextGenDateStr })
    .eq('id', template.id);

  if (updateError) throw new Error(updateError.message);

  revalidatePath('/dashboard');
  revalidatePath('/invoices');

  return {
    success: true,
    generatedCount: generated.length,
    generated,
    nextScheduledDate: currentNextGenDateStr,
  };
}

function advanceFrequency(dateStr: string, frequency: string): string {
  const currentGenDate = new Date(dateStr);
  let nextGenDate = new Date(currentGenDate);

  const freq = (frequency || 'monthly').toLowerCase();
  if (freq === 'weekly') {
    nextGenDate.setDate(currentGenDate.getDate() + 7);
  } else if (freq === 'monthly') {
    nextGenDate.setMonth(currentGenDate.getMonth() + 1);
  } else if (freq === 'quarterly') {
    nextGenDate.setMonth(currentGenDate.getMonth() + 3);
  } else if (freq === 'annually' || freq === 'yearly') {
    nextGenDate.setFullYear(currentGenDate.getFullYear() + 1);
  } else {
    nextGenDate.setMonth(currentGenDate.getMonth() + 1);
  }

  return nextGenDate.toISOString().split('T')[0];
}

export async function listAllInvoiceTokens() {
  const supabase = await createClient();

  const { data: tokens, error } = await supabase
    .from('invoice_access_tokens')
    .select('*, invoice:invoices(id, invoice_number, currency, client:clients(id, name), company:companies(id, name, color))')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const tokenIds = (tokens || []).map((t: any) => t.id);
  
  if (tokenIds.length === 0) return [];

  const { data: logCounts } = await supabase
    .from('invoice_view_logs')
    .select('token_id')
    .in('token_id', tokenIds);

  const countMap: Record<string, number> = {};
  (logCounts || []).forEach((l: any) => {
    countMap[l.token_id] = (countMap[l.token_id] || 0) + 1;
  });

  return (tokens || []).map((t: any) => ({
    ...t,
    view_count: countMap[t.id] || 0,
  }));
}

export async function listAllInvoiceViewLogs() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('invoice_view_logs')
    .select('*, token:invoice_access_tokens(label, token), invoice:invoices(invoice_number, currency, client:clients(name), company:companies(name))')
    .order('viewed_at', { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return data || [];
}

