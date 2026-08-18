export interface PaymentField {
  id: string;
  label: string;
  value: string;
  is_copyable?: boolean;
  is_highlighted?: boolean;
}

export interface PaymentMethodVisibility {
  mode: 'all' | 'include' | 'exclude';
  client_ids: string[];
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: 'mobile_banking' | 'bank_transfer' | 'card' | 'crypto' | 'other';
  badge?: string;
  icon_svg?: string;
  icon_name?: string;
  color?: string;
  bg_gradient?: string;
  is_active: boolean;
  sort_order: number;
  instructions?: string;
  fields: PaymentField[];
  visibility: PaymentMethodVisibility;
  created_at?: string;
  updated_at?: string;
}

export interface PaymentUpdateRequest {
  id: string;
  type: 'invoice' | 'subscription';
  invoice_id?: string;
  invoice_number?: string;
  subscription_id?: string;
  client_id?: string;
  client_name?: string;
  client_contact?: string;
  transaction_id: string;
  account_number: string;
  payment_method_id?: string;
  payment_method_name?: string;
  amount?: number;
  currency?: string;
  notes?: string;
  screenshot_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string;
  submitted_at: string;
  reviewed_at?: string;
}

export const PRESET_PAYMENT_SVGS: Record<string, string> = {
  bkash: `<svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M12.92 2.01c-.34.02-.68.16-.94.42L3.25 11.16a1.34 1.34 0 0 0 0 1.89l8.73 8.73c.52.52 1.37.52 1.89 0l8.73-8.73a1.34 1.34 0 0 0 0-1.89L13.86 2.43a1.3 1.3 0 0 0-.94-.42zm-.04 3.73l5.88 5.88-5.88 5.88-5.88-5.88 5.88-5.88z"/></svg>`,
  nagad: `<svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>`,
  bank: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/><line x1="2" x2="22" y1="9" y2="9"/></svg>`,
  mobile: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>`,
  card: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>`,
  crypto: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6"><circle cx="12" cy="12" r="10"/><path d="M9.5 9.5c.5-1 1.5-1.5 2.5-1.5 1.5 0 2.5 1 2.5 2.5 0 1-.5 1.5-1.5 2 1 .5 1.5 1 1.5 2 0 1.5-1 2.5-2.5 2.5-1 0-2-.5-2.5-1.5"/><line x1="12" x2="12" y1="6" y2="8"/><line x1="12" x2="12" y1="16" y2="18"/><line x1="9" x2="14" y1="12" y2="12"/></svg>`
};
