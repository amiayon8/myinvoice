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

export interface ClassPartyDuplicateInfo {
  isDuplicate: boolean;
  reasons: string[];
  count: number;
}

export function getClassPartyDuplicateMap(
  registrations: Array<{
    id: string;
    full_name?: string | null;
    phone?: string | null;
    student_id?: string | null;
  }>
): Map<string, ClassPartyDuplicateInfo> {
  const map = new Map<string, ClassPartyDuplicateInfo>();
  if (!registrations || registrations.length === 0) return map;

  const normalizeName = (name?: string | null) =>
    (name || "").trim().toLowerCase().replace(/\s+/g, " ");
  const normalizePhone = (phone?: string | null) =>
    (phone || "").replace(/[^0-9]/g, "");
  const normalizeStudentId = (id?: string | null) =>
    (id || "").trim().toLowerCase().replace(/\s+/g, "");

  const isDummyPhone = (phone?: string | null) => {
    const digits = normalizePhone(phone);
    return digits.length < 10 || /^0+$/.test(digits) || /^01[0-9]0{7,}$/.test(digits);
  };

  const isDummyStudentId = (id?: string | null) => {
    const s = normalizeStudentId(id);
    return !s || s.startsWith("0000");
  };

  for (let i = 0; i < registrations.length; i++) {
    const a = registrations[i];
    const matchReasons = new Set<string>();
    let matches = 0;

    for (let j = 0; j < registrations.length; j++) {
      if (i === j) continue;
      const b = registrations[j];
      let isMatch = false;

      if (a.full_name && b.full_name && normalizeName(a.full_name) === normalizeName(b.full_name)) {
        matchReasons.add("Name");
        isMatch = true;
      }

      if (
        !isDummyStudentId(a.student_id) &&
        !isDummyStudentId(b.student_id) &&
        normalizeStudentId(a.student_id) === normalizeStudentId(b.student_id)
      ) {
        matchReasons.add("Student ID");
        isMatch = true;
      }

      if (
        !isDummyPhone(a.phone) &&
        !isDummyPhone(b.phone) &&
        normalizePhone(a.phone) === normalizePhone(b.phone)
      ) {
        matchReasons.add("Phone");
        isMatch = true;
      }

      if (isMatch) {
        matches++;
      }
    }

    if (matches > 0) {
      map.set(a.id, {
        isDuplicate: true,
        reasons: Array.from(matchReasons),
        count: matches + 1,
      });
    }
  }

  return map;
}

