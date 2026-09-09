import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { PaymentMethod, PaymentField, PaymentUpdateRequest, PRESET_PAYMENT_SVGS } from '@/types/payment-methods';
export type { PaymentMethod, PaymentField, PaymentUpdateRequest, PaymentMethodVisibility } from '@/types/payment-methods';
export { PRESET_PAYMENT_SVGS, PRESET_PAYMENT_COLORS } from '@/types/payment-methods';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { revalidatePath } from 'next/cache';

const BUNDLED_DATA_DIR = path.join(process.cwd(), 'data');
const WRITABLE_DATA_DIR = path.join(os.tmpdir(), 'myinvoice_data');

function ensureDataDir(): string {
  try {
    if (!fs.existsSync(WRITABLE_DATA_DIR)) {
      fs.mkdirSync(WRITABLE_DATA_DIR, { recursive: true });
    }
    return WRITABLE_DATA_DIR;
  } catch {
    return BUNDLED_DATA_DIR;
  }
}

function getReadFilePath(filename: string): string {
  const writablePath = path.join(WRITABLE_DATA_DIR, filename);
  if (fs.existsSync(writablePath)) {
    return writablePath;
  }
  return path.join(BUNDLED_DATA_DIR, filename);
}

function readLocalMethods(): PaymentMethod[] {
  try {
    const file = getReadFilePath('payment_methods.json');
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return [];
  }
}

function saveLocalMethods(methods: PaymentMethod[]) {
  try {
    const dir = ensureDataDir();
    const targetFile = path.join(dir, 'payment_methods.json');
    fs.writeFileSync(targetFile, JSON.stringify(methods, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Local methods write skipped:', err);
  }
}

function readLocalRequests(): PaymentUpdateRequest[] {
  try {
    const file = getReadFilePath('payment_update_requests.json');
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return [];
  }
}

function saveLocalRequests(reqs: PaymentUpdateRequest[]) {
  try {
    const dir = ensureDataDir();
    const targetFile = path.join(dir, 'payment_update_requests.json');
    fs.writeFileSync(targetFile, JSON.stringify(reqs, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Local requests write skipped:', err);
  }
}

// ----------------------------------------------------
// PAYMENT METHODS CRUD (Supabase DB)
// ----------------------------------------------------
export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  const supabase = createServiceRoleClient();
  try {
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (!error && data && data.length > 0) {
      const mapped: PaymentMethod[] = data.map((m: any) => ({
        id: m.id,
        name: m.name,
        type: m.type,
        badge: m.badge,
        icon_svg: m.icon_svg,
        icon_name: m.icon_name,
        color: m.color,
        bg_gradient: m.bg_gradient,
        is_active: m.is_active,
        sort_order: m.sort_order,
        instructions: m.instructions,
        fields: m.fields || [],
        visibility: m.visibility || { mode: 'all', client_ids: [] },
        created_at: m.created_at,
        updated_at: m.updated_at
      }));
      saveLocalMethods(mapped);
      return mapped;
    }
  } catch (err) {
    console.warn('Supabase payment_methods fallback:', err);
  }

  return readLocalMethods();
}

/**
 * Filter payment methods visible for a specific client
 */
export async function getPaymentMethodsForClient(clientId?: string | null): Promise<PaymentMethod[]> {
  const all = await getPaymentMethods();
  const activeMethods = all.filter(m => m.is_active);

  return activeMethods
    .filter(m => {
      if (!m.visibility || m.visibility.mode === 'all') return true;
      const strClientId = clientId ? String(clientId) : null;
      if (!strClientId) {
        return m.visibility.mode !== 'include';
      }
      if (m.visibility.mode === 'include') {
        return (m.visibility.client_ids || []).map(String).includes(strClientId);
      }
      if (m.visibility.mode === 'exclude') {
        return !(m.visibility.client_ids || []).map(String).includes(strClientId);
      }
      return true;
    })
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
}

/**
 * Save or update payment method in Supabase
 */
export async function savePaymentMethod(method: Partial<PaymentMethod> & { name: string; type: any }): Promise<PaymentMethod> {
  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();
  const targetId = method.id || `pm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const payload: any = {
    id: targetId,
    name: method.name,
    type: method.type,
    badge: method.badge || null,
    icon_svg: method.icon_svg || null,
    icon_name: method.icon_name || 'fa-credit-card',
    color: method.color || '#6366f1',
    bg_gradient: method.bg_gradient || 'from-indigo-600 to-purple-600',
    is_active: method.is_active !== undefined ? method.is_active : true,
    sort_order: method.sort_order ?? 0,
    instructions: method.instructions || null,
    fields: method.fields || [],
    visibility: method.visibility || { mode: 'all', client_ids: [] },
    created_at: method.created_at || now,
    updated_at: now
  };

  let savedId = targetId;

  try {
    const { data, error } = await supabase
      .from('payment_methods')
      .upsert(payload)
      .select()
      .single();

    if (!error && data) {
      savedId = data.id;
    } else if (error) {
      console.warn('Supabase savePaymentMethod upsert error:', error.message);
    }
  } catch (err) {
    console.warn('Supabase savePaymentMethod fallback:', err);
  }

  const finalMethod: PaymentMethod = {
    ...payload,
    id: savedId
  };

  const all = readLocalMethods();
  const idx = all.findIndex(m => m.id === finalMethod.id);
  if (idx >= 0) all[idx] = finalMethod;
  else all.push(finalMethod);
  saveLocalMethods(all);

  return finalMethod;
}

/**
 * Delete payment method from Supabase
 */
export async function deletePaymentMethod(id: string): Promise<boolean> {
  const supabase = createServiceRoleClient();
  try {
    await supabase.from('payment_methods').delete().eq('id', id);
  } catch (err) {
    console.warn('Supabase deletePaymentMethod fallback:', err);
  }

  const all = readLocalMethods().filter(m => m.id !== id);
  saveLocalMethods(all);
  return true;
}

// ----------------------------------------------------
// PAYMENT UPDATE REQUESTS (Supabase DB)
// ----------------------------------------------------
export async function getPaymentUpdateRequests(filter?: { status?: string; type?: string }): Promise<PaymentUpdateRequest[]> {
  const supabase = createServiceRoleClient();
  let supabaseReqs: PaymentUpdateRequest[] = [];

  try {
    let query = supabase
      .from('payment_update_requests')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (filter?.status && filter.status !== 'all') query = query.eq('status', filter.status);
    if (filter?.type && filter.type !== 'all') query = query.eq('type', filter.type);

    const { data, error } = await query;
    if (!error && data) {
      supabaseReqs = data as PaymentUpdateRequest[];
    } else if (error) {
      console.error('Supabase getPaymentUpdateRequests error:', error);
    }
  } catch (err) {
    console.warn('Supabase getPaymentUpdateRequests fallback:', err);
  }

  const localReqs = readLocalRequests();
  const mergedMap = new Map<string, PaymentUpdateRequest>();
  localReqs.forEach(r => mergedMap.set(r.id, r));
  supabaseReqs.forEach(r => mergedMap.set(r.id, r));

  let mergedList = Array.from(mergedMap.values()).sort(
    (a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
  );

  saveLocalRequests(mergedList);

  if (filter?.status && filter.status !== 'all') mergedList = mergedList.filter(r => r.status === filter.status);
  if (filter?.type && filter.type !== 'all') mergedList = mergedList.filter(r => r.type === filter.type);
  return mergedList;
}

function isUuid(value: unknown): boolean {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function mapToInvoicePaymentMethod(methodType?: string, methodName?: string): 'cash' | 'bank_transfer' | 'mobile_banking' | 'card' | 'other' {
  const normalized = `${methodType || ''} ${methodName || ''}`.toLowerCase();
  if (normalized.includes('cash')) return 'cash';
  if (normalized.includes('bank') || normalized.includes('wire') || normalized.includes('transfer')) return 'bank_transfer';
  if (normalized.includes('mobile') || normalized.includes('bkash') || normalized.includes('nagad') || normalized.includes('rocket') || normalized.includes('upay')) return 'mobile_banking';
  if (normalized.includes('card') || normalized.includes('visa') || normalized.includes('master') || normalized.includes('credit') || normalized.includes('debit')) return 'card';
  return 'other';
}

export async function submitPaymentUpdateRequest(data: Omit<PaymentUpdateRequest, 'id' | 'status' | 'submitted_at'>): Promise<PaymentUpdateRequest> {
  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();
  const targetId = crypto.randomUUID();

  let validClientId: string | null = null;
  if (isUuid(data.client_id)) {
    const { data: clientExists } = await supabase
      .from('clients')
      .select('id')
      .eq('id', data.client_id)
      .maybeSingle();
    if (clientExists) {
      validClientId = clientExists.id;
    }
  }

  let validInvoiceId: string | null = null;
  if (isUuid(data.invoice_id)) {
    const { data: invoiceExists } = await supabase
      .from('invoices')
      .select('id')
      .eq('id', data.invoice_id)
      .maybeSingle();
    if (invoiceExists) {
      validInvoiceId = invoiceExists.id;
    }
  }

  const dbPayload: any = {
    id: targetId,
    type: data.type || 'invoice',
    invoice_id: validInvoiceId,
    invoice_number: data.invoice_number || null,
    subscription_id: isUuid(data.subscription_id) ? data.subscription_id : null,
    client_id: validClientId,
    client_name: data.client_name || null,
    client_contact: data.client_contact || null,
    transaction_id: data.transaction_id,
    account_number: data.account_number,
    payment_method_id: data.payment_method_id || null,
    payment_method_name: data.payment_method_name || null,
    amount: data.amount ? Number(data.amount) : null,
    currency: data.currency || '৳',
    notes: data.notes || null,
    screenshot_url: data.screenshot_url || null,
    status: 'pending',
    submitted_at: now
  };

  let savedId = targetId;

  try {
    const { data: inserted, error } = await supabase
      .from('payment_update_requests')
      .upsert(dbPayload)
      .select()
      .single();

    if (error) {
      console.error('Supabase submitPaymentUpdateRequest error:', error);
    }
    if (!error && inserted) savedId = inserted.id;
  } catch (err) {
    console.warn('Supabase submitPaymentUpdateRequest fallback error:', err);
  }

  const newReq: PaymentUpdateRequest = {
    ...data,
    ...dbPayload,
    id: savedId
  };

  const reqs = readLocalRequests();
  const existingIdx = reqs.findIndex(r => r.id === savedId);
  if (existingIdx >= 0) {
    reqs[existingIdx] = newReq;
  } else {
    reqs.unshift(newReq);
  }
  saveLocalRequests(reqs);

  return newReq;
}

export async function reviewPaymentUpdateRequest(
  id: string,
  action: 'approve' | 'approved' | 'reject' | 'rejected',
  adminNotes?: string
): Promise<{ success: boolean; request?: PaymentUpdateRequest; error?: string }> {
  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();

  try {
    const isApproved = action === 'approve' || action === 'approved';
    const status: 'approved' | 'rejected' = isApproved ? 'approved' : 'rejected';

    let currentReq: PaymentUpdateRequest | null = null;

    if (isUuid(id)) {
      const { data: req, error: reqErr } = await supabase
        .from('payment_update_requests')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!reqErr && req) {
        currentReq = req as PaymentUpdateRequest;
      }
    }

    if (!currentReq) {
      currentReq = readLocalRequests().find(r => r.id === id) || null;
    }

    if (!currentReq) {
      return { success: false, error: 'Request not found' };
    }

    if (isApproved) {
      if (currentReq.type === 'subscription' || currentReq.subscription_id) {
        let subscriptionId = currentReq.subscription_id && isUuid(currentReq.subscription_id)
          ? currentReq.subscription_id
          : null;

        if (!subscriptionId && currentReq.client_id && isUuid(currentReq.client_id)) {
          const { data: clientSub } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('user_id', currentReq.client_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (clientSub) subscriptionId = clientSub.id;
        }

        if (!subscriptionId) {
          const { data: latestSub } = await supabase
            .from('subscriptions')
            .select('id')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (latestSub) subscriptionId = latestSub.id;
        }

        if (!subscriptionId) {
          return { success: false, error: 'Subscription not found for this verification request' };
        }

        const { data: sub, error: subErr } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('id', subscriptionId)
          .single();

        if (subErr || !sub) {
          return { success: false, error: 'Target subscription not found' };
        }

        const pricePerSlot = Number(sub.price_per_slot) || 0;
        const slotsCount = Number(sub.slots_count) || 1;
        const monthlyRate = pricePerSlot * slotsCount;
        const amount = Number(currentReq.amount) || monthlyRate;

        let months = 1;
        if (monthlyRate > 0 && amount > 0) {
          months = Math.round((amount / monthlyRate) * 100) / 100;
          if (months <= 0) months = 1;
        }

        const notesParts = [
          currentReq.payment_method_name ? `Method: ${currentReq.payment_method_name}` : null,
          currentReq.transaction_id ? `Trx: ${currentReq.transaction_id}` : null,
          currentReq.account_number ? `Acc: ${currentReq.account_number}` : null,
          currentReq.notes ? `Note: ${currentReq.notes}` : null
        ].filter(Boolean);

        const paymentNotes = notesParts.join(' | ') || 'Verified client payment';

        const { error: subPayErr } = await supabase
          .from('subscription_payments')
          .insert({
            subscription_id: subscriptionId,
            amount,
            months,
            notes: paymentNotes
          });

        if (subPayErr) {
          console.error('Error inserting subscription_payments:', subPayErr);
          return { success: false, error: `Failed to record subscription payment: ${subPayErr.message}` };
        }

        const newMonthsPaid = Math.round(((Number(sub.months_paid) || 0) + months) * 100) / 100;
        const newTotalPaid = (Number(sub.total_amount_paid) || 0) + amount;

        const { error: updateSubErr } = await supabase
          .from('subscriptions')
          .update({
            months_paid: newMonthsPaid,
            total_amount_paid: newTotalPaid
          })
          .eq('id', subscriptionId);

        if (updateSubErr) {
          console.error('Error updating subscription aggregates:', updateSubErr);
          return { success: false, error: `Failed to update subscription aggregates: ${updateSubErr.message}` };
        }
      } else if (currentReq.type === 'invoice' || currentReq.invoice_id || currentReq.invoice_number) {
        let invoiceId = currentReq.invoice_id && isUuid(currentReq.invoice_id)
          ? currentReq.invoice_id
          : null;

        if (!invoiceId && currentReq.invoice_number) {
          const { data: invByNum } = await supabase
            .from('invoices')
            .select('id')
            .eq('invoice_number', currentReq.invoice_number)
            .maybeSingle();
          if (invByNum) invoiceId = invByNum.id;
        }

        if (!invoiceId && currentReq.client_id && isUuid(currentReq.client_id)) {
          const { data: clientInv } = await supabase
            .from('invoices')
            .select('id')
            .eq('client_id', currentReq.client_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (clientInv) invoiceId = clientInv.id;
        }

        if (!invoiceId) {
          return { success: false, error: 'Invoice not found for this verification request' };
        }

        const { data: inv, error: invErr } = await supabase
          .from('invoices')
          .select('id, paid_amount, items:invoice_items(quantity, rate), payments:invoice_payments(amount)')
          .eq('id', invoiceId)
          .single();

        if (invErr || !inv) {
          return { success: false, error: 'Target invoice not found' };
        }

        const amount = Number(currentReq.amount) || 0;
        const validMethod = mapToInvoicePaymentMethod(
          currentReq.payment_method_id,
          currentReq.payment_method_name
        );

        const notesParts = [
          currentReq.payment_method_name ? `Method: ${currentReq.payment_method_name}` : null,
          currentReq.transaction_id ? `Trx: ${currentReq.transaction_id}` : null,
          currentReq.account_number ? `Acc: ${currentReq.account_number}` : null,
          currentReq.notes ? `Note: ${currentReq.notes}` : null
        ].filter(Boolean);

        const paymentNotes = notesParts.join(' | ') || 'Verified client payment';

        const { error: invPayErr } = await supabase
          .from('invoice_payments')
          .insert({
            invoice_id: invoiceId,
            amount,
            payment_date: now,
            payment_method: validMethod,
            notes: paymentNotes
          });

        if (invPayErr) {
          console.error('Error inserting invoice_payments:', invPayErr);
          return { success: false, error: `Failed to record invoice payment: ${invPayErr.message}` };
        }

        const totalInvoiceAmount = (inv.items || []).reduce(
          (sum: number, item: any) => sum + (Number(item.quantity) || 0) * (Number(item.rate) || 0),
          0
        );
        const existingPaid = (inv.payments || []).reduce(
          (sum: number, payment: any) => sum + (Number(payment.amount) || 0),
          0
        );
        const newTotalPaid = existingPaid + amount;
        const nextStatus = totalInvoiceAmount > 0 && newTotalPaid >= totalInvoiceAmount
          ? 'paid'
          : newTotalPaid > 0
          ? 'partially_paid'
          : 'sent';

        await supabase
          .from('invoices')
          .update({
            status: nextStatus,
            paid_amount: newTotalPaid
          })
          .eq('id', invoiceId);
      }
    }

    if (isUuid(id)) {
      await supabase
        .from('payment_update_requests')
        .update({
          status,
          admin_notes: adminNotes || null,
          reviewed_at: now
        })
        .eq('id', id);
    }

    const reqs = readLocalRequests();
    const idx = reqs.findIndex(r => r.id === id);
    if (idx >= 0) {
      reqs[idx] = {
        ...reqs[idx],
        status,
        admin_notes: adminNotes || undefined,
        reviewed_at: now
      };
      saveLocalRequests(reqs);
    }

    try {
      revalidatePath('/subscriptions');
      revalidatePath('/invoices');
      revalidatePath('/dashboard');
      revalidatePath('/payment-methods');
    } catch {
    }

    return {
      success: true,
      request: {
        ...currentReq,
        status,
        admin_notes: adminNotes || undefined,
        reviewed_at: now
      }
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Review failed' };
  }
}
