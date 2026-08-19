export interface PaymentField {
  id: string;
  label: string;
  value: string;
  is_copyable?: boolean;
  is_highlighted?: boolean;
}

export interface PaymentMethodVisibility {
  mode: "all" | "include" | "exclude";
  client_ids: string[];
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: "mobile_banking" | "bank_transfer" | "card" | "crypto" | "other";
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
  type: "invoice" | "subscription";
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
  status: "pending" | "approved" | "rejected";
  admin_notes?: string;
  submitted_at: string;
  reviewed_at?: string;
}

export const PRESET_PAYMENT_COLORS: Record<string, string> = {
  bkash: "#e2136e",
  nagad: "#ffffff",
  bank: "#000000",
  mobile: "#000000",
  card: "#000000",
  crypto: "#000000",
};

export const PRESET_PAYMENT_SVGS: Record<string, string> = {
  bkash: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-18.0015 -28.3525 156.013 170.115"><g fill="none"><path fill="#FFFFFF" d="M96.58 62.45l-53.03-8.31 7.03 31.6z"/><path fill="#FFFFFF" d="M96.58 62.45L56.62 6.93 43.56 54.15z"/><path fill="#FFFFFF" d="M42.32 53.51L.45 0l54.83 6.55z"/><path fill="#FFFFFF" d="M23.25 31.15L0 9.24h6.12z"/><path fill="#FFFFFF" d="M107.89 35.46l-9.84 26.69L82.1 40.09z"/><path fill="#FFFFFF" d="M56.77 84.14l38.61-15.51L97 63.7z"/><path fill="#FFFFFF" d="M25.89 113.41l16.54-58.02 8.39 37.75z"/><path fill="#FFFFFF" d="M109.43 35.67l-4.06 11.02 14.64-.24z"/></g></svg>`,
  nagad: `<svg xmlns="http://www.w3.org/2000/svg" version="1.2" viewBox="0 0 54 54"><style>.s0,.s1{fill:none;stroke:#ef4123;stroke-width:.4}.s1{stroke:#f47c20}.s2{fill:#f6921e}.s3{fill:#f16522}.s4{fill:#ec1c24}</style><g id="surface1"><path class="s0" d="m31.57 40.35q0.01 0.04-0.01 0.08-0.02 0.03-0.05 0.04-3.54 1.89-7.47 2.24c-3.17 0.28-6.43-0.21-9.37-1.48q-5.27-2.28-8.53-7.05c-2.01-2.94-3.14-6.45-3.31-9.96q-0.23-4.74 1.71-9.08 0.04-0.08 0-0.1"/><path class="s1" d="m36.15 19.66q0.09-0.02 0.16 0.09 0.01 0.02 0.04 0.03 0.02 0 0.04 0.01c3.61 3.98 5.44 9.14 5.1 14.5-0.45 7.13-4.77 13.43-11.23 16.47q-0.61 0.29-1.24 0.53-5.43 2.06-11.22 0.84"/><path class="s2" d="m13.01 11.65q2.11-5.25 6.48-8.98 0.91-0.78 2.19-1.61c0.64-0.42 1.26-0.58 1.94-0.27 0.41 0.18 0.66 0.47 0.88 0.87q1.76 3.24 3.5 6.45 0.02 0.03-0.01 0.04c-3.18 1.17-6.01 3.28-8.28 5.84-3.48 3.92-5.82 8.83-6.47 14.06q-0.04 0.36-0.05 0.68-0.01 0.16-0.07 0.01-0.62-1.65-1.03-3.41-0.59-2.52-0.64-4.97-0.1-4.57 1.56-8.71z"/><path class="s3" d="m29.56 8.81q0.03-0.01 0.02-0.04l-2.45-4.5q-0.01-0.04 0.02-0.06c3.6-2.41 7.82-3.52 12.18-3.42 0.76 0.02 1.41 0.47 1.64 1.18q0.08 0.26 0.11 0.89 0.18 4.72 0.38 9.37 0 0.04-0.04 0.03c-2.73-0.3-5.53-0.3-8.26 0.07-5.09 0.69-9.82 2.81-13.37 6.46q-2.29 2.35-3.81 5.25-0.1 0.18-0.07-0.03c0.91-5.43 4.74-9.97 9.3-12.9q2.07-1.33 4.35-2.3z"/><path class="s4" d="m31.57 40.35q0.01 0.04-0.01 0.08-0.02 0.03-0.05 0.04-3.54 1.89-7.47 2.24c-3.17 0.28-6.43-0.21-9.37-1.48q-5.27-2.28-8.53-7.05c-2.01-2.94-3.14-6.45-3.31-9.96q-0.23-4.74 1.71-9.08 0.04-0.08 0-0.1 2.84-4.56 7.26-7.59 1.22-0.83 2.57-1.53 0.07-0.03 0.03 0.03c-2.53 3.91-3.94 8.53-4.29 13.18q-0.28 3.68 0.55 7.39c1.22 5.49 4.42 10.54 9.44 13.2q2.53 1.35 5.38 1.62 3.1 0.3 6.09-0.99z"/><path class="s4" d="m42.64 13.47l-0.26-5.16q0-0.06 0.06-0.07c1.27-0.07 2.6 0.11 3.81 0.42q3.41 0.89 6.37 2.76 0.61 0.38 0.86 1.13 0.2 0.63 0 1.32-0.07 0.27-0.36 0.72-2.67 4.12-5.26 8.14-0.01 0.01-0.02 0.01-0.01 0-0.01-0.01-3.12-3.02-7.21-4.33c-3.12-1-6.45-1.22-9.72-0.84-3.58 0.42-7.13 1.5-10.46 3.02q-0.16 0.07-0.04-0.05 3.28-3.5 7.69-5.33c4.56-1.88 9.61-2.26 14.51-1.69q0.04 0.01 0.04-0.04z"/><path class="s3" d="m4.54 15.04q0.04 0.02 0 0.1-1.94 4.34-1.71 9.08c0.17 3.51 1.3 7.02 3.31 9.96q3.26 4.77 8.53 7.05c2.94 1.27 6.2 1.76 9.37 1.48q3.93-0.35 7.47-2.24 0.03-0.01 0.05-0.04 0.02-0.04 0.01-0.08 1.31-0.57 2.29-1.29 1.76-1.29 3.06-3.21c2.07-3.04 2.82-6.8 1.99-10.4q-0.74-3.21-2.76-5.79 0.09-0.02 0.16 0.09 0.01 0.02 0.04 0.03 0.02 0 0.04 0.01c3.61 3.98 5.44 9.14 5.1 14.5-0.45 7.13-4.77 13.43-11.23 16.47q-0.61 0.29-1.24 0.53-5.43 2.06-11.22 0.84-0.17 0-0.54-0.14-3.62-1.36-6.44-3.51-5.31-4.03-7.98-10.12-0.26-0.6-0.49-1.23-2.1-5.74-1.42-11.73 0.64-5.55 3.61-10.36z"/><path class="s2" d="m17.8 52.13q5.79 1.22 11.22-0.84 0.63-0.24 1.24-0.53c6.46-3.04 10.78-9.34 11.23-16.47 0.34-5.36-1.49-10.52-5.1-14.5q-0.02-0.01-0.04-0.01-0.03-0.01-0.04-0.03-0.07-0.11-0.16-0.09l-0.81-0.92q-0.09-0.1 0.04-0.07c0.13 0.03 0.31 0.01 0.42 0.02 2.98 0.15 5.77 1.29 8.06 3.22 3.6 3.02 5.63 7.57 5.52 12.27q-0.08 3.12-1.4 6.09-0.26 0.6-0.63 1.19-3.07 4.99-7.94 8.12c-3.77 2.42-8.1 3.74-12.56 3.92q-4.3 0.17-8.65-1.18-0.29-0.09-0.4-0.19z"/></g></svg>`,
  bank: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/><line x1="2" x2="22" y1="9" y2="9"/></svg>`,
  mobile: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>`,
  card: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>`,
  crypto: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.5 9.5c.5-1 1.5-1.5 2.5-1.5 1.5 0 2.5 1 2.5 2.5 0 1-.5 1.5-1.5 2 1 .5 1.5 1 1.5 2 0 1.5-1 2.5-2.5 2.5-1 0-2-.5-2.5-1.5"/><line x1="12" x2="12" y1="6" y2="8"/><line x1="12" x2="12" y1="16" y2="18"/><line x1="9" x2="14" y1="12" y2="12"/></svg>`,
};
