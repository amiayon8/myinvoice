
export interface CompanyProfile {
  id: string;
  name: string;
  logo_url: string;
  email: string;
  website: string;
  address: string;
  phone: string;
  color: string;
  created_at?: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  address: string;
  phone?: string;
  created_at?: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id?: string;
  description: string;
  quantity: number;
  rate: number;
}

export type RecurringFrequency = 'weekly' | 'monthly' | 'annually';

export interface Invoice {
  id: string;
  invoice_number: string;
  date: string;
  company_id: string;
  client_id: string;
  notes: string;
  currency: string;
  tax_rate: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  is_recurring: boolean;
  recurring_frequency?: RecurringFrequency;
  next_generation_date?: string;
  created_at?: string;
  paid_amount: number;
  total_amount?: number;
  items?: InvoiceItem[];
  client?: Client;
  company?: CompanyProfile;
}

export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  companyId: string;
  client: {
    name: string;
    email: string;
    address: string;
  };
  items: InvoiceItem[];
  notes: string;
  currency: string;
  taxRate: number;
  isRecurring: boolean;
  recurringFrequency?: RecurringFrequency;
}

export type ViewType = 'dashboard' | 'invoices' | 'clients' | 'companies' | 'edit-invoice' | 'recurring' | 'sources' | 'links';
export type Theme = 'light' | 'dark';

export interface LoanSource {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  created_at?: string;
}

