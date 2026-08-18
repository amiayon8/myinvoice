import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { PaymentMethod, PaymentField, PaymentUpdateRequest, PRESET_PAYMENT_SVGS } from '@/types/payment-methods';
export type { PaymentMethod, PaymentField, PaymentUpdateRequest, PaymentMethodVisibility } from '@/types/payment-methods';
export { PRESET_PAYMENT_SVGS } from '@/types/payment-methods';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const METHODS_FILE = path.join(DATA_DIR, 'payment_methods.json');
const REQUESTS_FILE = path.join(DATA_DIR, 'payment_update_requests.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readLocalMethods(): PaymentMethod[] {
  ensureDataDir();
  try {
    if (!fs.existsSync(METHODS_FILE)) return [];
    return JSON.parse(fs.readFileSync(METHODS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function saveLocalMethods(methods: PaymentMethod[]) {
  ensureDataDir();
  fs.writeFileSync(METHODS_FILE, JSON.stringify(methods, null, 2), 'utf-8');
}

function readLocalRequests(): PaymentUpdateRequest[] {
  ensureDataDir();
  try {
    if (!fs.existsSync(REQUESTS_FILE)) return [];
    return JSON.parse(fs.readFileSync(REQUESTS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function saveLocalRequests(reqs: PaymentUpdateRequest[]) {
  ensureDataDir();
  fs.writeFileSync(REQUESTS_FILE, JSON.stringify(reqs, null, 2), 'utf-8');
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

    if (!error && data) {
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
  return all
    .filter(m => m.is_active)
    .filter(m => {
      if (!m.visibility || m.visibility.mode === 'all') return true;
      if (!clientId) {
        return m.visibility.mode !== 'include';
      }
      if (m.visibility.mode === 'include') {
        return m.visibility.client_ids.includes(clientId);
      }
      if (m.visibility.mode === 'exclude') {
        return !m.visibility.client_ids.includes(clientId);
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

  const payload: any = {
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
    updated_at: now
  };

  let savedId = method.id;

  try {
    if (method.id) {
      const { data, error } = await supabase
        .from('payment_methods')
        .update(payload)
        .eq('id', method.id)
        .select()
        .single();
      if (!error && data) savedId = data.id;
    } else {
      payload.created_at = now;
      const { data, error } = await supabase
        .from('payment_methods')
        .insert(payload)
        .select()
        .single();
      if (!error && data) savedId = data.id;
    }
  } catch (err) {
    console.warn('Supabase savePaymentMethod fallback:', err);
  }

  const finalMethod: PaymentMethod = {
    id: savedId || method.id || `pm-${Date.now()}`,
    ...payload,
    created_at: method.created_at || now,
    updated_at: now
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
  try {
    let query = supabase
      .from('payment_update_requests')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (filter?.status && filter.status !== 'all') query = query.eq('status', filter.status);
    if (filter?.type && filter.type !== 'all') query = query.eq('type', filter.type);

    const { data, error } = await query;
    if (!error && data) {
      saveLocalRequests(data as PaymentUpdateRequest[]);
      return data as PaymentUpdateRequest[];
    }
  } catch (err) {
    console.warn('Supabase getPaymentUpdateRequests fallback:', err);
  }

  let reqs = readLocalRequests();
  if (filter?.status && filter.status !== 'all') reqs = reqs.filter(r => r.status === filter.status);
  if (filter?.type && filter.type !== 'all') reqs = reqs.filter(r => r.type === filter.type);
  return reqs;
}

export async function submitPaymentUpdateRequest(data: Omit<PaymentUpdateRequest, 'id' | 'status' | 'submitted_at'>): Promise<PaymentUpdateRequest> {
  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();

  const payload: any = {
    ...data,
    status: 'pending',
    submitted_at: now
  };

  let savedId: string | undefined;

  try {
    const { data: inserted, error } = await supabase
      .from('payment_update_requests')
      .insert(payload)
      .select()
      .single();

    if (!error && inserted) savedId = inserted.id;
  } catch (err) {
    console.warn('Supabase submitPaymentUpdateRequest fallback:', err);
  }

  const newReq: PaymentUpdateRequest = {
    id: savedId || `req-${Date.now()}`,
    ...payload
  };

  const reqs = readLocalRequests();
  reqs.unshift(newReq);
  saveLocalRequests(reqs);

  return newReq;
}

export async function reviewPaymentUpdateRequest(
  id: string,
  action: 'approve' | 'reject',
  adminNotes?: string
): Promise<{ success: boolean; request?: PaymentUpdateRequest; error?: string }> {
  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();

  try {
    // Read request
    const { data: req } = await supabase
      .from('payment_update_requests')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    const currentReq = req || readLocalRequests().find(r => r.id === id);
    if (!currentReq) return { success: false, error: 'Request not found' };

    const status = action === 'approve' ? 'approved' : 'rejected';

    // Update status in Supabase
    await supabase
      .from('payment_update_requests')
      .update({
        status,
        admin_notes: adminNotes || null,
        reviewed_at: now
      })
      .eq('id', id);

    // If approved, automatically record the payment in Supabase
    if (action === 'approve') {
      if (currentReq.type === 'invoice' && currentReq.invoice_id) {
        await supabase.from('invoice_payments').insert({
          invoice_id: currentReq.invoice_id,
          amount: currentReq.amount || 0,
          payment_date: now.split('T')[0],
          payment_method: currentReq.payment_method_name || 'Client Direct',
          notes: `Verified Trx ID: ${currentReq.transaction_id} (Acc: ${currentReq.account_number})`
        });

        // Update invoice status to paid
        await supabase
          .from('invoices')
          .update({ status: 'paid' })
          .eq('id', currentReq.invoice_id);
      } else if (currentReq.type === 'subscription' && currentReq.subscription_id) {
        await supabase.from('subscription_payments').insert({
          subscription_id: currentReq.subscription_id,
          amount: currentReq.amount || 0,
          payment_date: now.split('T')[0],
          payment_method: currentReq.payment_method_name || 'Client Direct',
          notes: `Verified Trx ID: ${currentReq.transaction_id} (Acc: ${currentReq.account_number})`
        });
      }
    }

    // Update local JSON cache
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
