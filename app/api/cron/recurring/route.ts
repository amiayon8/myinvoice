import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { NextResponse } from 'next/server';
import { parseBillingTiming, getPeriodDate } from '@/lib/date-utils';

async function processRecurring(targetDate: string) {
  const supabase = createServiceRoleClient();

  // 1. Fetch recurring invoices where next_generation_date <= targetDate
  const { data: templates, error: fetchError } = await supabase
    .from('invoices')
    .select('*, items:invoice_items(*)')
    .eq('is_recurring', true)
    .lte('next_generation_date', targetDate);

  if (fetchError) throw fetchError;

  const generated = [];

  for (const template of templates || []) {
    // Compute the actual period date based on billing timing (advanced or after_period)
    const timing = parseBillingTiming(template.notes);
    const periodDate = getPeriodDate(template.next_generation_date, template.recurring_frequency || 'monthly', timing);
    const parts = periodDate.split('-');
    if (parts.length !== 3) continue;

    const yearFull = parts[0];
    const monthStr = parts[1];
    const yearStr = yearFull.slice(-2); // last 2 digits of the year (e.g. 2026 -> 26)

    // Format: Main Invoice-Month(06)-Year(26)
    const generatedNumber = `${template.invoice_number}-${monthStr}-${yearStr}`;

    // 2. Check uq_parent_month_year constraint in recurring_invoices table
    const { data: existingLog } = await supabase
      .from('recurring_invoices')
      .select('id')
      .eq('parent_invoice_id', template.id)
      .eq('month', monthStr)
      .eq('year', yearStr)
      .maybeSingle();

    if (existingLog) {
      continue;
    }

    // Double check on invoices table as backup fallback
    const { data: existingInvoice } = await supabase
      .from('invoices')
      .select('id')
      .eq('invoice_number', generatedNumber)
      .maybeSingle();

    if (existingInvoice) {
      continue;
    }

    // 3. Insert new invoice (child instance is not recurring itself)
    const { data: newInvoice, error: insertError } = await supabase
      .from('invoices')
      .insert({
        invoice_number: generatedNumber,
        date: template.next_generation_date,
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

    if (insertError) throw insertError;

    // 4. Log the generation in recurring_invoices table
    const { error: logError } = await supabase
      .from('recurring_invoices')
      .insert({
        parent_invoice_id: template.id,
        child_invoice_id: newInvoice.id,
        month: monthStr,
        year: yearStr,
      });

    if (logError) throw logError;

    // 5. Duplicate invoice items
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

      if (itemsError) throw itemsError;
    }

    // 6. Advance the next generation date for the template invoice
    const currentGenDate = new Date(template.next_generation_date);
    let nextGenDate = new Date(currentGenDate);

    const freq = (template.recurring_frequency || 'monthly').toLowerCase();
    if (freq === 'weekly') {
      nextGenDate.setDate(currentGenDate.getDate() + 7);
    } else if (freq === 'monthly') {
      nextGenDate.setMonth(currentGenDate.getMonth() + 1);
    } else if (freq === 'quarterly') {
      nextGenDate.setMonth(currentGenDate.getMonth() + 3);
    } else if (freq === 'annually' || freq === 'yearly') {
      nextGenDate.setFullYear(currentGenDate.getFullYear() + 1);
    } else {
      // Fallback default is monthly
      nextGenDate.setMonth(currentGenDate.getMonth() + 1);
    }

    const nextGenStr = nextGenDate.toISOString().split('T')[0];

    const { error: updateError } = await supabase
      .from('invoices')
      .update({ next_generation_date: nextGenStr })
      .eq('id', template.id);

    if (updateError) throw updateError;

    generated.push({
      templateId: template.id,
      templateNumber: template.invoice_number,
      newInvoiceId: newInvoice.id,
      newInvoiceNumber: generatedNumber,
      newInvoiceDate: template.next_generation_date,
      nextScheduledDate: nextGenStr,
    });
  }

  return {
    processed: templates?.length || 0,
    generatedCount: generated.length,
    generated,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date');
  
  // Default to today's date if not passed in query params
  const targetDate = dateParam || new Date().toISOString().split('T')[0];

  try {
    const result = await processRecurring(targetDate);

    return NextResponse.json({
      success: true,
      date: targetDate,
      ...result,
    });
  } catch (err: any) {
    console.error('Error generating recurring invoices (GET):', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  let targetDate = new Date().toISOString().split('T')[0];
  try {
    const body = await request.json().catch(() => ({}));
    if (body.date) {
      targetDate = body.date;
    }
  } catch (e) {
    // Ignore and use default targetDate
  }

  try {
    const result = await processRecurring(targetDate);

    return NextResponse.json({
      success: true,
      date: targetDate,
      ...result,
    });
  } catch (err: any) {
    console.error('Error generating recurring invoices (POST):', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Server error' },
      { status: 500 }
    );
  }
}
