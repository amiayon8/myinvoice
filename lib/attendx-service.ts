import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { AttendxOrganization, HardwareItem, AttendxSubscriptionStatus } from '@/types/attendx';
export type { AttendxOrganization, HardwareItem, AttendxSubscriptionStatus } from '@/types/attendx';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const ATTENDX_FILE = path.join(DATA_DIR, 'attendx_organizations.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readLocalOrgs(): AttendxOrganization[] {
  ensureDataDir();
  try {
    if (!fs.existsSync(ATTENDX_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(ATTENDX_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function saveLocalOrgs(orgs: AttendxOrganization[]) {
  ensureDataDir();
  fs.writeFileSync(ATTENDX_FILE, JSON.stringify(orgs, null, 2), 'utf-8');
}

/**
 * Get all AttendX Organizations from Supabase (with fallback to local sync)
 */
export async function getAttendxOrganizations(): Promise<AttendxOrganization[]> {
  const supabase = createServiceRoleClient();
  try {
    const { data: dbOrgs, error } = await supabase
      .from('attendx_organizations')
      .select(`
        *,
        hardware_sales:attendx_hardware_sales(*)
      `)
      .order('created_at', { ascending: false });

    if (!error && dbOrgs && dbOrgs.length >= 0) {
      const mapped: AttendxOrganization[] = dbOrgs.map((o: any) => ({
        id: o.id,
        org_id: o.org_id,
        org_name: o.org_name,
        client_id: o.client_id,
        client_web_base: o.client_web_base,
        contact_person: o.contact_person,
        contact_email: o.contact_email,
        contact_phone: o.contact_phone,
        status: o.status,
        warning_start: o.warning_start,
        subscription_ends: o.subscription_ends,
        billing_cycle: o.billing_cycle,
        plan_price: Number(o.plan_price) || 0,
        currency: o.currency || '৳',
        hardware_sales: (o.hardware_sales || []).map((h: any) => ({
          id: h.id,
          name: h.name,
          serial_numbers: h.serial_numbers || [],
          quantity: h.quantity || 1,
          unit_price: Number(h.unit_price) || 0,
          warranty_months: h.warranty_months || 12,
          sold_date: h.sold_date,
          notes: h.notes
        })),
        linked_client_id: o.linked_client_id,
        last_webhook_status: o.last_webhook_status,
        notes: o.notes,
        created_at: o.created_at,
        updated_at: o.updated_at
      }));
      // Keep local JSON in sync as secondary cache
      saveLocalOrgs(mapped);
      return mapped;
    }
  } catch (err) {
    console.warn('Supabase attendx_organizations read failed, using local storage cache:', err);
  }

  return readLocalOrgs();
}

/**
 * Get organization by org_id (for client checkSubscription API)
 */
export async function getAttendxOrganizationByOrgId(orgId: string): Promise<AttendxOrganization | null> {
  const supabase = createServiceRoleClient();
  try {
    const { data: org, error } = await supabase
      .from('attendx_organizations')
      .select(`
        *,
        hardware_sales:attendx_hardware_sales(*)
      `)
      .eq('org_id', orgId)
      .maybeSingle();

    if (!error && org) {
      return {
        id: org.id,
        org_id: org.org_id,
        org_name: org.org_name,
        client_id: org.client_id,
        client_web_base: org.client_web_base,
        contact_person: org.contact_person,
        contact_email: org.contact_email,
        contact_phone: org.contact_phone,
        status: org.status,
        warning_start: org.warning_start,
        subscription_ends: org.subscription_ends,
        billing_cycle: org.billing_cycle,
        plan_price: Number(org.plan_price) || 0,
        currency: org.currency || '৳',
        hardware_sales: (org.hardware_sales || []).map((h: any) => ({
          id: h.id,
          name: h.name,
          serial_numbers: h.serial_numbers || [],
          quantity: h.quantity || 1,
          unit_price: Number(h.unit_price) || 0,
          warranty_months: h.warranty_months || 12,
          sold_date: h.sold_date,
          notes: h.notes
        })),
        linked_client_id: org.linked_client_id,
        last_webhook_status: org.last_webhook_status,
        notes: org.notes,
        created_at: org.created_at,
        updated_at: org.updated_at
      };
    }
  } catch (e) {
    console.warn('Supabase org_id query failed:', e);
  }

  const all = readLocalOrgs();
  return all.find(o => o.org_id === orgId) || null;
}

/**
 * Save or update AttendX Organization with full Supabase DB persistence
 */
export async function saveAttendxOrganization(orgData: Partial<AttendxOrganization> & { org_id: string; org_name: string }): Promise<AttendxOrganization> {
  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();

  const payload: any = {
    org_id: orgData.org_id,
    org_name: orgData.org_name,
    client_id: orgData.client_id || orgData.org_id,
    client_web_base: orgData.client_web_base || 'https://managementsite.academix.xyz',
    contact_person: orgData.contact_person || null,
    contact_email: orgData.contact_email || null,
    contact_phone: orgData.contact_phone || null,
    status: orgData.status || 'active',
    warning_start: orgData.warning_start || new Date(Date.now() + 25 * 86400000).toISOString(),
    subscription_ends: orgData.subscription_ends || new Date(Date.now() + 30 * 86400000).toISOString(),
    billing_cycle: orgData.billing_cycle || 'monthly',
    plan_price: orgData.plan_price ?? 0,
    currency: orgData.currency || '৳',
    linked_client_id: orgData.linked_client_id || null,
    last_webhook_status: orgData.last_webhook_status || null,
    notes: orgData.notes || null,
    updated_at: now
  };

  let savedId = orgData.id;

  try {
    if (orgData.id) {
      const { data, error } = await supabase
        .from('attendx_organizations')
        .update(payload)
        .eq('id', orgData.id)
        .select()
        .single();
      if (!error && data) savedId = data.id;
    } else {
      payload.created_at = now;
      const { data, error } = await supabase
        .from('attendx_organizations')
        .upsert(payload, { onConflict: 'org_id' })
        .select()
        .single();
      if (!error && data) savedId = data.id;
    }

    // Persist hardware sales if provided
    if (savedId && orgData.hardware_sales && orgData.hardware_sales.length >= 0) {
      // Upsert hardware sales
      for (const h of orgData.hardware_sales) {
        const hPayload: any = {
          organization_id: savedId,
          name: h.name,
          serial_numbers: h.serial_numbers || [],
          quantity: h.quantity || 1,
          unit_price: h.unit_price || 0,
          warranty_months: h.warranty_months || 12,
          sold_date: h.sold_date || new Date().toISOString().split('T')[0],
          notes: h.notes || null
        };
        if (h.id && !h.id.startsWith('hw-temp')) {
          await supabase.from('attendx_hardware_sales').update(hPayload).eq('id', h.id);
        } else {
          await supabase.from('attendx_hardware_sales').insert(hPayload);
        }
      }
    }
  } catch (e) {
    console.warn('Supabase saveAttendxOrganization write fallback:', e);
  }

  // Also update local JSON backup
  const all = readLocalOrgs();
  const existingIdx = all.findIndex(o => o.id === (savedId || orgData.id) || o.org_id === orgData.org_id);
  const fullOrg: AttendxOrganization = {
    id: savedId || orgData.id || `org_${Date.now()}`,
    ...payload,
    hardware_sales: orgData.hardware_sales || [],
    created_at: orgData.created_at || now,
    updated_at: now
  };

  if (existingIdx >= 0) {
    all[existingIdx] = fullOrg;
  } else {
    all.unshift(fullOrg);
  }
  saveLocalOrgs(all);

  return fullOrg;
}

/**
 * Add Hardware sale record to organization in Supabase
 */
export async function addHardwareSale(orgId: string, item: Omit<HardwareItem, 'id'>): Promise<HardwareItem> {
  const supabase = createServiceRoleClient();
  let createdItem: HardwareItem = {
    id: `hw-${Date.now()}`,
    ...item
  };

  try {
    // Find organization uuid
    const { data: org } = await supabase
      .from('attendx_organizations')
      .select('id')
      .or(`id.eq.${orgId},org_id.eq.${orgId}`)
      .maybeSingle();

    if (org) {
      const { data: hw, error } = await supabase
        .from('attendx_hardware_sales')
        .insert({
          organization_id: org.id,
          name: item.name,
          serial_numbers: item.serial_numbers || [],
          quantity: item.quantity || 1,
          unit_price: item.unit_price || 0,
          warranty_months: item.warranty_months || 12,
          sold_date: item.sold_date || new Date().toISOString().split('T')[0],
          notes: item.notes || null
        })
        .select()
        .single();

      if (!error && hw) {
        createdItem = {
          id: hw.id,
          name: hw.name,
          serial_numbers: hw.serial_numbers || [],
          quantity: hw.quantity,
          unit_price: Number(hw.unit_price),
          warranty_months: hw.warranty_months,
          sold_date: hw.sold_date,
          notes: hw.notes
        };
      }
    }
  } catch (e) {
    console.warn('Supabase addHardwareSale error:', e);
  }

  // Update local file backup
  const all = readLocalOrgs();
  const orgObj = all.find(o => o.id === orgId || o.org_id === orgId);
  if (orgObj) {
    orgObj.hardware_sales = [...(orgObj.hardware_sales || []), createdItem];
    orgObj.updated_at = new Date().toISOString();
    saveLocalOrgs(all);
  }

  return createdItem;
}

/**
 * Delete AttendX organization from Supabase
 */
export async function deleteAttendxOrganization(id: string): Promise<boolean> {
  const supabase = createServiceRoleClient();
  try {
    await supabase.from('attendx_organizations').delete().or(`id.eq.${id},org_id.eq.${id}`);
  } catch (e) {
    console.warn('Supabase delete organization error:', e);
  }

  const all = readLocalOrgs();
  const filtered = all.filter(o => o.id !== id && o.org_id !== id);
  saveLocalOrgs(filtered);
  return true;
}

/**
 * Trigger client webhook to invalidate/refresh cached subscription on client server
 * Target endpoint: POST {client_web_base}/api/refreshSubscription
 * Header: Authorization: Bearer {client_id}
 */
export async function purgeClientCache(orgId: string): Promise<{ success: boolean; status?: number; message: string; response?: any }> {
  const org = await getAttendxOrganizationByOrgId(orgId);
  if (!org) {
    return { success: false, message: `Organization ${orgId} not found` };
  }

  const baseUrl = (org.client_web_base || '').replace(/\/+$/, '');
  if (!baseUrl) {
    return { success: false, message: 'No client_web_base configured for this organization' };
  }

  const webhookUrl = `${baseUrl}/api/refreshSubscription`;
  const bearerToken = org.client_id;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bearerToken}`
      },
      body: JSON.stringify({
        org_id: org.org_id,
        timestamp: new Date().toISOString(),
        action: 'refreshSubscription'
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    let resData: any = {};
    try {
      resData = await response.json();
    } catch {
      resData = { raw: await response.text().catch(() => '') };
    }

    const isSuccess = response.ok;
    const webhookStatus = {
      success: isSuccess,
      status_code: response.status,
      message: isSuccess ? 'Cache purged successfully on client site' : `Client returned HTTP ${response.status}`,
      timestamp: new Date().toISOString()
    };

    // Update webhook status in Supabase
    await saveAttendxOrganization({
      ...org,
      last_webhook_status: webhookStatus
    });

    return {
      success: isSuccess,
      status: response.status,
      message: webhookStatus.message,
      response: resData
    };
  } catch (error: any) {
    const errorMsg = error.name === 'AbortError' ? 'Webhook request timed out (8s)' : (error.message || 'Connection failed');
    const webhookStatus = {
      success: false,
      message: `Failed to contact ${webhookUrl}: ${errorMsg}`,
      timestamp: new Date().toISOString()
    };

    await saveAttendxOrganization({
      ...org,
      last_webhook_status: webhookStatus
    });

    return {
      success: false,
      message: webhookStatus.message
    };
  }
}

export interface GenerateBillOptions {
  plan_tier?: 'bronze' | 'silver' | 'gold' | 'diamond' | 'platinum' | 'custom';
  billing_cycle?: 'monthly' | 'yearly' | 'custom';
  duration_months?: number;
  custom_rate?: number;
  students?: number;
  discount_type?: 'percentage' | 'fixed' | 'none';
  discount_value?: number;
  includeHardware?: boolean;
  selected_hardware?: { id?: string; name: string; quantity: number; unit_price: number; serial_numbers?: string[] }[];
  custom_notes?: string;
  dueDays?: number;
}

/**
 * Auto-generate official Supabase Invoice for AttendX billing with plan selection, duration, and discounts
 */
export async function generateAttendxBill(orgId: string, options?: GenerateBillOptions) {
  const supabase = createServiceRoleClient();
  const org = await getAttendxOrganizationByOrgId(orgId);
  if (!org) throw new Error('Organization not found');

  const now = new Date();
  const dueDate = new Date(now.getTime() + (options?.dueDays || 14) * 86400000);
  const invNumber = `INV-ATX-${Date.now().toString().slice(-6)}`;

  let clientId = org.linked_client_id;
  if (!clientId) {
    const { data: clients } = await supabase.from('clients').select('id').limit(1);
    if (clients && clients.length > 0) {
      clientId = clients[0].id;
    }
  }

  if (!clientId) {
    throw new Error('Please create at least one Client in your CRM to associate with this invoice.');
  }

  const cycle = options?.billing_cycle || org.billing_cycle || 'monthly';
  const duration = options?.duration_months || (cycle === 'yearly' ? 12 : 1);
  const planName = (options?.plan_tier ? options.plan_tier.charAt(0).toUpperCase() + options.plan_tier.slice(1) : '') || 'Standard';

  // Determine rate
  let baseRate = options?.custom_rate !== undefined ? options.custom_rate : (org.plan_price || 0);
  const studentInfo = options?.students ? ` (${options.students} Students)` : '';

  const { data: invoice, error: invErr } = await supabase
    .from('invoices')
    .insert({
      client_id: clientId,
      invoice_number: invNumber,
      date: now.toISOString().split('T')[0],
      due_date: dueDate.toISOString().split('T')[0],
      currency: org.currency || '৳',
      status: 'unpaid',
      notes: options?.custom_notes || `Subscription billing for ${org.org_name} - ${planName} Plan${studentInfo} (${cycle}, ${duration} ${duration === 1 ? 'Month' : 'Months'}).`
    })
    .select()
    .single();

  if (invErr || !invoice) {
    throw new Error(`Failed to create invoice: ${invErr?.message}`);
  }

  const items: any[] = [];

  // Main subscription item
  items.push({
    invoice_id: invoice.id,
    description: `Academix ERP / AttendX Cloud Platform - ${planName} Plan${studentInfo} (${duration} ${duration === 1 ? 'month' : 'months'})`,
    quantity: duration,
    rate: baseRate
  });

  // Discount line item if applicable
  const subtotalBeforeDiscount = baseRate * duration;
  if (options?.discount_type && options.discount_type !== 'none' && options.discount_value && options.discount_value > 0) {
    let discountAmount = 0;
    let discountLabel = '';
    if (options.discount_type === 'percentage') {
      discountAmount = Math.round((subtotalBeforeDiscount * options.discount_value) / 100);
      discountLabel = `Special Promotional Discount (${options.discount_value}%)`;
    } else {
      discountAmount = options.discount_value;
      discountLabel = `Special Promotional Discount (Fixed)`;
    }

    if (discountAmount > 0) {
      items.push({
        invoice_id: invoice.id,
        description: discountLabel,
        quantity: 1,
        rate: -discountAmount
      });
    }
  }

  // Hardware items
  const hardwareList = options?.selected_hardware || (options?.includeHardware ? org.hardware_sales : []);
  if (hardwareList && hardwareList.length > 0) {
    for (const hw of hardwareList) {
      items.push({
        invoice_id: invoice.id,
        description: `Hardware Terminal: ${hw.name} (Qty: ${hw.quantity})${hw.serial_numbers?.length ? ` S/N: ${hw.serial_numbers.join(', ')}` : ''}`,
        quantity: hw.quantity,
        rate: hw.unit_price
      });
    }
  }

  await supabase.from('invoice_items').insert(items);

  const token = `inv_tok_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  await supabase.from('invoice_access_tokens').insert({
    invoice_id: invoice.id,
    token: token
  });

  const totalAmount = items.reduce((sum, it) => sum + (it.quantity * it.rate), 0);

  return {
    invoice,
    invoice_number: invNumber,
    token,
    share_url: `/invoices/token/${token}`,
    total_amount: totalAmount > 0 ? totalAmount : 0
  };
}

/**
 * Record a direct payment for an AttendX Organization
 */
export async function recordAttendxPayment(data: {
  organization_id: string;
  invoice_id?: string;
  amount: number;
  payment_date?: string;
  payment_method?: string;
  transaction_id?: string;
  notes?: string;
}) {
  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();
  const paymentDate = data.payment_date || now.split('T')[0];

  const payload = {
    organization_id: data.organization_id,
    invoice_id: data.invoice_id || null,
    amount: Number(data.amount) || 0,
    payment_date: paymentDate,
    payment_method: data.payment_method || 'Bank Transfer',
    transaction_id: data.transaction_id || null,
    notes: data.notes || null,
    created_at: now
  };

  try {
    const { data: pmt, error } = await supabase
      .from('attendx_payments')
      .insert(payload)
      .select()
      .single();

    // If linked to invoice, also record in invoice_payments & update invoice status
    if (data.invoice_id) {
      await supabase.from('invoice_payments').insert({
        invoice_id: data.invoice_id,
        amount: data.amount,
        payment_date: paymentDate,
        payment_method: data.payment_method || 'Bank Transfer',
        notes: `AttendX Payment: ${data.notes || ''} (Trx: ${data.transaction_id || 'N/A'})`
      });

      // Check if invoice is fully paid
      const { data: inv } = await supabase
        .from('invoices')
        .select(`
          id,
          items:invoice_items(quantity, rate),
          payments:invoice_payments(amount)
        `)
        .eq('id', data.invoice_id)
        .maybeSingle();

      if (inv) {
        const totalAmount = (inv.items || []).reduce((sum: number, it: any) => sum + (it.quantity * it.rate), 0);
        const totalPaid = (inv.payments || []).reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
        if (totalPaid >= totalAmount) {
          await supabase.from('invoices').update({ status: 'paid' }).eq('id', data.invoice_id);
        }
      }
    }

    return { success: true, payment: pmt || payload };
  } catch (e: any) {
    console.warn('Supabase recordAttendxPayment error:', e);
    return { success: true, payment: payload };
  }
}

/**
 * Get all invoices, payments, and financial analytics for an organization
 */
export async function getAttendxOrganizationDetails(orgId: string) {
  const supabase = createServiceRoleClient();
  const org = await getAttendxOrganizationByOrgId(orgId);
  if (!org) return null;

  let invoices: any[] = [];
  let payments: any[] = [];

  try {
    // 1. Fetch Invoices for this organization / client
    let invQuery = supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        date,
        due_date,
        currency,
        status,
        notes,
        client:clients(id, name, email),
        items:invoice_items(*),
        payments:invoice_payments(*),
        token:invoice_access_tokens(token)
      `)
      .order('date', { ascending: false });

    if (org.linked_client_id) {
      invQuery = invQuery.or(`client_id.eq.${org.linked_client_id},notes.ilike.%${org.org_name}%,notes.ilike.%${org.org_id}%`);
    } else {
      invQuery = invQuery.or(`notes.ilike.%${org.org_name}%,notes.ilike.%${org.org_id}%`);
    }

    const { data: invData } = await invQuery;
    if (invData) {
      invoices = invData.map((inv: any) => {
        const total = (inv.items || []).reduce((sum: number, it: any) => sum + (it.quantity * it.rate), 0);
        const paid = (inv.payments || []).reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
        const tok = inv.token?.[0]?.token || '';
        return {
          id: inv.id,
          invoice_number: inv.invoice_number,
          date: inv.date,
          due_date: inv.due_date,
          currency: inv.currency,
          status: inv.status,
          total_amount: total,
          paid_amount: paid,
          due_amount: Math.max(0, total - paid),
          share_url: tok ? `/invoices/token/${tok}` : `/invoices/${inv.id}`,
          items: inv.items,
          payments: inv.payments
        };
      });
    }

    // 2. Fetch Payments
    const { data: pmtData } = await supabase
      .from('attendx_payments')
      .select('*')
      .eq('organization_id', org.id)
      .order('payment_date', { ascending: false });

    if (pmtData) {
      payments = pmtData;
    }
  } catch (e) {
    console.warn('Supabase getAttendxOrganizationDetails error:', e);
  }

  // Calculate Financial Metrics
  const totalBilled = invoices.reduce((sum, inv) => sum + inv.total_amount, 0);
  const totalCollectedFromInvoices = invoices.reduce((sum, inv) => sum + inv.paid_amount, 0);
  const directPaymentsSum = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalCollected = Math.max(totalCollectedFromInvoices, directPaymentsSum);
  const outstandingDue = Math.max(0, totalBilled - totalCollected);
  const hardwareRevenue = (org.hardware_sales || []).reduce((sum, h) => sum + (h.unit_price * h.quantity), 0);
  const saasRevenue = Math.max(0, totalBilled - hardwareRevenue);
  const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 100;

  const financials = {
    total_billed: totalBilled,
    total_collected: totalCollected,
    outstanding_due: outstandingDue,
    hardware_revenue: hardwareRevenue,
    saas_revenue: saasRevenue,
    lifetime_spent: totalCollected,
    collection_rate: collectionRate,
    invoice_count: invoices.length,
    paid_invoices_count: invoices.filter(i => i.status === 'paid').length,
    unpaid_invoices_count: invoices.filter(i => i.status !== 'paid').length
  };

  return {
    ...org,
    invoices,
    payments,
    financials
  };
}
