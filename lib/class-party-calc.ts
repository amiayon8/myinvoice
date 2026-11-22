export interface ClassPartyRegistrationRecord {
  id: string;
  created_at: string;
  full_name: string;
  phone: string;
  student_id: string | null;
  email: string | null;
  selected_option_title: string;
  selected_option_category: string;
  subtotal: number;
  paid_amount: number | null;
  payment_method: "cash" | "bkash";
  bkash_sender_number: string | null;
  bkash_transaction_id: string | null;
  cash_paid_to: string | null;
  special_notes: string | null;
  payment_status: "pending" | "verified" | "rejected";
  verified_by: string | null;
  verified_at: string | null;
  due_amount?: number;
  raw_submitted_amount?: number;
  total_payable?: number;
  subtotal_with_vat?: number;
}

export function getClassPartySubtotal(record: {
  selected_option_title?: string | null;
  selected_option_category?: string | null;
  payment_method?: "cash" | "bkash" | string | null;
  subtotal?: number | null;
  subtotal_with_vat?: number | null;
}): number {
  if (record.subtotal !== undefined && record.subtotal !== null && !isNaN(Number(record.subtotal))) {
    return Number(record.subtotal);
  }
  if (record.subtotal_with_vat !== undefined && record.subtotal_with_vat !== null && !isNaN(Number(record.subtotal_with_vat))) {
    return Number(record.subtotal_with_vat);
  }

  const t = (record.selected_option_title || "").toLowerCase();
  const c = (record.selected_option_category || "").toLowerCase();
  const isBkash = record.payment_method === "bkash";

  if (t === "other" || c === "other") return 0;
  if (
    t.includes("buffet") ||
    (!t.includes("combo") && !t.includes("set") && !t.includes("thai-chinese") && c.includes("buffet"))
  ) {
    return isBkash ? 1380 : 1350;
  }
  if (
    t.includes("combo") ||
    t.includes("thai-chinese") ||
    t.includes("set") ||
    c.includes("thai-chinese") ||
    c.includes("set")
  ) {
    return isBkash ? 820 : 800;
  }
  return 0;
}

export function getClassPartyFinancials(record: {
  selected_option_title?: string | null;
  selected_option_category?: string | null;
  payment_method?: "cash" | "bkash" | string | null;
  subtotal?: number | null;
  subtotal_with_vat?: number | null;
  total_payable?: number | null;
  paid_amount?: number | null;
  payment_status?: "pending" | "verified" | "rejected" | string | null;
}) {
  const subtotal = getClassPartySubtotal(record);
  const isApproved = record.payment_status === "verified";
  const rawSubmittedAmount =
    record.paid_amount !== undefined && record.paid_amount !== null
      ? Number(record.paid_amount) || 0
      : Number(record.total_payable) || 0;
  const paidAmount = isApproved ? rawSubmittedAmount : 0;
  const dueAmount = Math.max(0, subtotal - paidAmount);

  return {
    subtotal,
    paidAmount,
    rawSubmittedAmount,
    dueAmount,
    isApproved,
    isFullyPaid: dueAmount === 0,
    hasDue: dueAmount > 0,
  };
}
