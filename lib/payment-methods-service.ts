import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { PaymentMethod, PaymentField, PaymentUpdateRequest, PRESET_PAYMENT_SVGS } from '@/types/payment-methods';
export type { PaymentMethod, PaymentField, PaymentUpdateRequest, PaymentMethodVisibility } from '@/types/payment-methods';
export { PRESET_PAYMENT_SVGS, PRESET_PAYMENT_COLORS } from '@/types/payment-methods';
import fs from 'fs';
import path from 'path';
import os from 'os';

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

export async function submitPaymentUpdateRequest(data: Omit<PaymentUpdateRequest, 'id' | 'status' | 'submitted_at'>): Promise<PaymentUpdateRequest> {
  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();
  const targetId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const dbPayload: any = {
    id: targetId,
    type: data.type || 'invoice',
    invoice_id: data.invoice_id || null,
    invoice_number: data.invoice_number || null,
    subscription_id: data.subscription_id || null,
    client_id: data.client_id || null,
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
    // Read request
    const { data: req } = await supabase
      .from('payment_update_requests')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    const currentReq = req || readLocalRequests().find(r => r.id === id);
    if (!currentReq) return { success: false, error: 'Request not found' };

    const isApproved = action === 'approve' || action === 'approved';
    const status: 'approved' | 'rejected' = isApproved ? 'approved' : 'rejected';

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
    if (isApproved) {
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
