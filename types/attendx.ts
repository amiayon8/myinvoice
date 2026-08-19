export type AttendxSubscriptionStatus = 'active' | 'warning' | 'expired' | 'past_due' | 'canceled' | 'trialing';

export interface HardwareItem {
  id: string;
  name: string;
  serial_numbers?: string[];
  quantity: number;
  unit_price: number;
  warranty_months?: number;
  sold_date: string;
  notes?: string;
  is_new?: boolean;
}

export interface PricingPlan {
  id: 'bronze' | 'silver' | 'gold' | 'diamond' | 'platinum';
  name: string;
  badge?: string;
  students: string;
  studentMin: number;
  studentMax: number;
  monthlyPrice: number;
  yearlyPrice: number;
  color: string;
  borderColor: string;
  bgGradient: string;
  features: string[];
}

export const ATTENDX_DEFAULT_PLANS: PricingPlan[] = [
  {
    id: 'bronze',
    name: 'Bronze',
    students: '50-100 Students',
    studentMin: 50,
    studentMax: 100,
    monthlyPrice: 849,
    yearlyPrice: 8499,
    color: '#cd7f32',
    borderColor: 'border-amber-700/50',
    bgGradient: 'from-amber-950/30 to-amber-900/10',
    features: [
      'All ERP Modules Included',
      'Academic, Exams & OMR',
      'Financial CRM & HR Payroll',
      'IoT Attendance & Mobile',
      'Email Support'
    ]
  },
  {
    id: 'silver',
    name: 'Silver',
    badge: 'Popular',
    students: '100-200 Students',
    studentMin: 100,
    studentMax: 200,
    monthlyPrice: 1049,
    yearlyPrice: 10499,
    color: '#94a3b8',
    borderColor: 'border-slate-500/50',
    bgGradient: 'from-slate-800/30 to-slate-900/10',
    features: [
      'All ERP Modules Included',
      'Academic, Exams & OMR',
      'Financial CRM & HR Payroll',
      'IoT Attendance & Mobile',
      'Priority Email Support'
    ]
  },
  {
    id: 'gold',
    name: 'Gold',
    students: '200-400 Students',
    studentMin: 200,
    studentMax: 400,
    monthlyPrice: 1549,
    yearlyPrice: 15499,
    color: '#eab308',
    borderColor: 'border-yellow-500/50',
    bgGradient: 'from-yellow-950/30 to-yellow-900/10',
    features: [
      'All ERP Modules Included',
      'Academic, Exams & OMR',
      'Financial CRM & HR Payroll',
      'IoT Attendance & Mobile',
      'Live Chat & Phone Support'
    ]
  },
  {
    id: 'diamond',
    name: 'Diamond',
    students: '400-1000 Students',
    studentMin: 400,
    studentMax: 1000,
    monthlyPrice: 2049,
    yearlyPrice: 20499,
    color: '#38bdf8',
    borderColor: 'border-cyan-500/50',
    bgGradient: 'from-cyan-950/30 to-cyan-900/10',
    features: [
      'All ERP Modules Included',
      'Academic, Exams & OMR',
      'Financial CRM & HR Payroll',
      'IoT Attendance & Mobile',
      'Dedicated Account Manager'
    ]
  },
  {
    id: 'platinum',
    name: 'Platinum',
    badge: 'Enterprise',
    students: '>1000 Students',
    studentMin: 1000,
    studentMax: 100000,
    monthlyPrice: 3499,
    yearlyPrice: 34999,
    color: '#a855f7',
    borderColor: 'border-purple-500/50',
    bgGradient: 'from-purple-950/30 to-purple-900/10',
    features: [
      'All ERP Modules Included',
      'Multi-Branch & Multi-Campus',
      'Custom API & Integrations',
      'Dedicated Account Manager',
      '24/7 Priority SLA'
    ]
  }
];

export interface AttendxPayment {
  id: string;
  organization_id: string;
  invoice_id?: string;
  invoice_number?: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  transaction_id?: string;
  notes?: string;
  created_at: string;
}

export interface AttendxFinancials {
  total_billed: number;
  total_collected: number;
  outstanding_due: number;
  hardware_revenue: number;
  saas_revenue: number;
  lifetime_spent: number;
  collection_rate: number;
  invoice_count: number;
  paid_invoices_count: number;
  unpaid_invoices_count: number;
}

export interface AttendxOrganization {
  id: string;
  org_id: string;
  org_name: string;
  client_id: string;
  client_web_base: string;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  status: AttendxSubscriptionStatus;
  plan_tier?: 'bronze' | 'silver' | 'gold' | 'diamond' | 'platinum' | 'custom';
  warning_start: string;
  subscription_ends: string;
  billing_cycle: 'monthly' | 'quarterly' | 'biannual' | 'yearly' | 'custom';
  plan_price: number;
  currency: string;
  student_count?: number;
  hardware_sales: HardwareItem[];
  payments?: AttendxPayment[];
  financials?: AttendxFinancials;
  linked_client_id?: string;
  last_webhook_status?: {
    success: boolean;
    status_code?: number;
    message?: string;
    timestamp: string;
  };
  notes?: string;
  created_at: string;
  updated_at: string;
}
