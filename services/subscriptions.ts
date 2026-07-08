'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { revalidatePath } from 'next/cache';
import { getCalendarMonthsElapsed } from '@/lib/date-utils';

// ----------------------------------------------------
// PLANS SERVICES
// ----------------------------------------------------
export async function getPlans() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function savePlan(planData: any) {
  const supabase = await createClient();
  const { id, created_at, ...dataToSave } = planData;

  let result;
  if (id) {
    result = await supabase
      .from('subscription_plans')
      .update(dataToSave)
      .eq('id', id)
      .select()
      .single();
  } else {
    result = await supabase
      .from('subscription_plans')
      .insert(dataToSave)
      .select()
      .single();
  }

  if (result.error) throw new Error(result.error.message);
  revalidatePath('/subscriptions');
  return result.data;
}

export async function deletePlan(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('subscription_plans')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidatePath('/subscriptions');
}

// ----------------------------------------------------
// USERS SERVICES
// ----------------------------------------------------
export async function getSubscriptionUsers() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('subscription_users')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function saveSubscriptionUser(userData: any) {
  const supabase = await createClient();
  const { id, created_at, ...dataToSave } = userData;

  let result;
  if (id) {
    result = await supabase
      .from('subscription_users')
      .update(dataToSave)
      .eq('id', id)
      .select()
      .single();
  } else {
    result = await supabase
      .from('subscription_users')
      .insert(dataToSave)
      .select()
      .single();
  }

  if (result.error) throw new Error(result.error.message);
  revalidatePath('/subscriptions');
  return result.data;
}

export async function deleteSubscriptionUser(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('subscription_users')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidatePath('/subscriptions');
}

// ----------------------------------------------------
// SUBSCRIPTIONS (SLOTS ALLOCATION) SERVICES
// ----------------------------------------------------
export async function getSubscriptions() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, user:subscription_users(*), plan:subscription_plans(*)')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function saveSubscription(subData: any) {
  const supabase = await createClient();
  const { id, created_at, ...dataToSave } = subData;

  let result;
  if (id) {
    result = await supabase
      .from('subscriptions')
      .update(dataToSave)
      .eq('id', id)
      .select()
      .single();
  } else {
    // If saving a new subscription, default the price_per_slot to the plan's selling price if not provided
    if (!dataToSave.price_per_slot && dataToSave.plan_id) {
      const { data: plan } = await supabase
        .from('subscription_plans')
        .select('selling_price')
        .eq('id', dataToSave.plan_id)
        .single();
      if (plan) {
        dataToSave.price_per_slot = plan.selling_price;
      }
    }

    result = await supabase
      .from('subscriptions')
      .insert(dataToSave)
      .select()
      .single();
  }

  if (result.error) throw new Error(result.error.message);
  revalidatePath('/subscriptions');
  return result.data;
}

export async function kickSubscription(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'kicked',
      kicked_at: new Date().toISOString()
    })
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidatePath('/subscriptions');
}

export async function changeSubscriptionPrice(
  id: string,
  newPrice: number,
  recalculateAdvance: boolean
) {
  const supabase = await createClient();

  // Fetch current subscription details
  const { data: sub, error: fetchErr } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchErr || !sub) throw new Error(fetchErr?.message || 'Subscription not found');

  const oldPrice = Number(sub.price_per_slot);
  const slots = Number(sub.slots_count);
  const currentMonthsPaid = Number(sub.months_paid);

  let updatedMonthsPaid = currentMonthsPaid;

  if (recalculateAdvance && oldPrice !== newPrice) {
    const todayStr = new Date().toISOString().split('T')[0];
    const endStr = sub.kicked_at ? new Date(sub.kicked_at).toISOString().split('T')[0] : todayStr;
    const monthsConsumed = getCalendarMonthsElapsed(sub.start_date, endStr);

    if (currentMonthsPaid > monthsConsumed) {
      const remainingMonths = currentMonthsPaid - monthsConsumed;
      const advanceValue = remainingMonths * oldPrice * slots;
      const remainingMonthsNew = advanceValue / (newPrice * slots);
      updatedMonthsPaid = Math.round((monthsConsumed + remainingMonthsNew) * 100) / 100;
    }
  }

  const { data, error } = await supabase
    .from('subscriptions')
    .update({
      price_per_slot: newPrice,
      months_paid: updatedMonthsPaid
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath('/subscriptions');
  return data;
}

// ----------------------------------------------------
// PAYMENT RECORDING SERVICES
// ----------------------------------------------------
export async function recordSubscriptionPayment(
  subscriptionId: string,
  amount: number,
  months: number,
  notes?: string
) {
  const supabase = await createClient();

  // Insert payment history log
  const { error: payErr } = await supabase
    .from('subscription_payments')
    .insert({
      subscription_id: subscriptionId,
      amount,
      months,
      notes: notes || null
    });

  if (payErr) throw new Error(payErr.message);

  // Update subscription aggregate paid months and total cash
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('months_paid, total_amount_paid')
    .eq('id', subscriptionId)
    .single();

  if (sub) {
    const newMonthsPaid = Math.round((Number(sub.months_paid) + months) * 100) / 100;
    const newTotalPaid = Number(sub.total_amount_paid) + amount;

    await supabase
      .from('subscriptions')
      .update({
        months_paid: newMonthsPaid,
        total_amount_paid: newTotalPaid
      })
      .eq('id', subscriptionId);
  }

  revalidatePath('/subscriptions');
}

export async function deductSubscriptionPayment(subscriptionId: string, notes?: string) {
  const supabase = await createClient();

  // Fetch subscription info to calculate 1 month value
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('months_paid, total_amount_paid, price_per_slot, slots_count')
    .eq('id', subscriptionId)
    .single();

  if (!sub) throw new Error('Subscription not found');

  const oneMonthValue = Number(sub.price_per_slot) * Number(sub.slots_count);

  // Record negative payment log
  const { error: payErr } = await supabase
    .from('subscription_payments')
    .insert({
      subscription_id: subscriptionId,
      amount: -oneMonthValue,
      months: -1,
      notes: notes || 'Deducted 1 month payment'
    });

  if (payErr) throw new Error(payErr.message);

  const newMonthsPaid = Math.round((Number(sub.months_paid) - 1) * 100) / 100;
  const newTotalPaid = Math.max(0, Number(sub.total_amount_paid) - oneMonthValue);

  await supabase
    .from('subscriptions')
    .update({
      months_paid: newMonthsPaid,
      total_amount_paid: newTotalPaid
    })
    .eq('id', subscriptionId);

  revalidatePath('/subscriptions');
}

export async function getPaymentHistory(subscriptionId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('subscription_payments')
    .select('*')
    .eq('subscription_id', subscriptionId)
    .order('payment_date', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

// ----------------------------------------------------
// SHARE LINKS SERVICES
// ----------------------------------------------------
export async function getShareLinks() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('subscription_share_links')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  // Fetch view counts for each link
  const linkIds = (data || []).map((l: any) => l.id);
  if (linkIds.length === 0) return [];

  const { data: viewCounts } = await supabase
    .from('subscription_view_logs')
    .select('token_id')
    .in('token_id', linkIds);

  const countMap: Record<string, number> = {};
  (viewCounts || []).forEach((v: any) => {
    countMap[v.token_id] = (countMap[v.token_id] || 0) + 1;
  });

  return (data || []).map((link: any) => ({
    ...link,
    view_count: countMap[link.id] || 0
  }));
}

export async function createSubscriptionShareLink(
  label: string,
  type: 'client' | 'clients' | 'plan' | 'subscriptions' | 'all',
  params: any,
  neverExpires: boolean,
  daysExpiry?: number
) {
  const supabase = await createClient();

  const expiresAt = neverExpires
    ? null
    : (() => {
        const d = new Date();
        d.setDate(d.getDate() + (daysExpiry || 30));
        return d.toISOString();
      })();

  const { data, error } = await supabase
    .from('subscription_share_links')
    .insert({
      label: label || null,
      type,
      params,
      expires_at: expiresAt,
      never_expires: neverExpires
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath('/subscriptions');
  return data;
}

export async function revokeShareLink(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('subscription_share_links')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidatePath('/subscriptions');
}

// Fetch view logs for subscription share links
export async function getSubscriptionViewLogs() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('subscription_view_logs')
    .select('*, token:subscription_share_links(label, token)')
    .order('viewed_at', { ascending: false })
    .limit(500);

  if (error) throw new Error(error.message);
  return data || [];
}

// ----------------------------------------------------
// PUBLIC SHARE PAGE RESOLUTION (Bypasses RLS using Service Role Client)
// ----------------------------------------------------
export async function getSharedSubscriptionData(token: string) {
  const supabase = createServiceRoleClient();

  // Validate token
  const { data: linkRecord, error: linkErr } = await supabase
    .from('subscription_share_links')
    .select('*')
    .eq('token', token)
    .single();

  if (linkErr || !linkRecord) return { success: false, error: 'Link not found' };

  // Check revoked
  if (linkRecord.revoked_at) {
    return { success: false, error: 'Link has been revoked' };
  }

  // Check expiry
  if (!linkRecord.never_expires && linkRecord.expires_at) {
    if (new Date(linkRecord.expires_at) < new Date()) {
      return { success: false, error: 'Link has expired' };
    }
  }

  // Fetch all subscriptions, plans, users, and payments
  // We filter these server-side based on the share link scope (type & params)
  const { data: allSubs, error: subsErr } = await supabase
    .from('subscriptions')
    .select('*, user:subscription_users(*), plan:subscription_plans(*)')
    .order('created_at', { ascending: false });

  if (subsErr) return { success: false, error: 'Failed to load subscription data' };

  let filteredSubs = allSubs || [];
  const type = linkRecord.type;
  const params = linkRecord.params || {};

  if (type === 'client' && params.client_id) {
    filteredSubs = filteredSubs.filter((s) => s.user_id === params.client_id);
  } else if (type === 'clients' && Array.isArray(params.client_ids)) {
    filteredSubs = filteredSubs.filter((s) => params.client_ids.includes(s.user_id));
  } else if (type === 'plan' && params.plan_id) {
    filteredSubs = filteredSubs.filter((s) => s.plan_id === params.plan_id);
  } else if (type === 'subscriptions' && Array.isArray(params.subscription_ids)) {
    filteredSubs = filteredSubs.filter((s) => params.subscription_ids.includes(s.id));
  }

  // Fetch payments for these filtered subscriptions
  const subIds = filteredSubs.map((s) => s.id);
  let payments: any[] = [];

  if (subIds.length > 0) {
    const { data: payData } = await supabase
      .from('subscription_payments')
      .select('*')
      .in('subscription_id', subIds)
      .order('payment_date', { ascending: false });
    payments = payData || [];
  }

  return {
    success: true,
    scope: {
      type: linkRecord.type,
      label: linkRecord.label,
      createdAt: linkRecord.created_at
    },
    subscriptions: filteredSubs,
    payments
  };
}

export async function editSubscriptionPayment(
  paymentId: string,
  data: { amount: number; months: number; notes?: string }
) {
  const supabase = await createClient();

  // 1. Fetch current payment to know which subscription it belongs to
  const { data: currentPay, error: getErr } = await supabase
    .from('subscription_payments')
    .select('subscription_id')
    .eq('id', paymentId)
    .single();

  if (getErr || !currentPay) throw new Error('Payment record not found');
  const subId = currentPay.subscription_id;

  // 2. Update payment record
  const { error: updateErr } = await supabase
    .from('subscription_payments')
    .update({
      amount: data.amount,
      months: data.months,
      notes: data.notes || null
    })
    .eq('id', paymentId);

  if (updateErr) throw new Error(updateErr.message);

  // 3. Recalculate subscription aggregates
  await recalculateSubscriptionAggregates(subId);

  revalidatePath('/subscriptions');
}

export async function deleteSubscriptionPayment(paymentId: string) {
  const supabase = await createClient();

  // 1. Fetch current payment to know which subscription it belongs to
  const { data: currentPay, error: getErr } = await supabase
    .from('subscription_payments')
    .select('subscription_id')
    .eq('id', paymentId)
    .single();

  if (getErr || !currentPay) throw new Error('Payment record not found');
  const subId = currentPay.subscription_id;

  // 2. Delete payment record
  const { error: deleteErr } = await supabase
    .from('subscription_payments')
    .delete()
    .eq('id', paymentId);

  if (deleteErr) throw new Error(deleteErr.message);

  // 3. Recalculate subscription aggregates
  await recalculateSubscriptionAggregates(subId);

  revalidatePath('/subscriptions');
}

// Helper to recalculate aggregates
async function recalculateSubscriptionAggregates(subId: string) {
  const supabase = await createClient();

  // Fetch all remaining payments for the subscription
  const { data: payments, error: fetchErr } = await supabase
    .from('subscription_payments')
    .select('amount, months')
    .eq('subscription_id', subId);

  if (fetchErr) throw new Error(fetchErr.message);

  const totalAmountPaid = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
  const totalMonthsPaid = (payments || []).reduce((sum, p) => sum + Number(p.months), 0);

  // Round months to 2 decimal places to prevent float overflow
  const roundedMonths = Math.round(totalMonthsPaid * 100) / 100;

  const { error: updateSubErr } = await supabase
    .from('subscriptions')
    .update({
      months_paid: roundedMonths,
      total_amount_paid: totalAmountPaid
    })
    .eq('id', subId);

  if (updateSubErr) throw new Error(updateSubErr.message);
}
