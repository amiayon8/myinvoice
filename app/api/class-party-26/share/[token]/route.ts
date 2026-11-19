import { NextRequest, NextResponse } from "next/server";
import {
  getSharedClassPartyData,
  logClassPartyView,
  ClassPartyRegistrationRecord,
} from "@/services/class-party";

interface RouteParams {
  params: Promise<{ token: string }>;
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.headers.get("x-real-ip") || "unknown";
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;
    const result = await getSharedClassPartyData(token);

    if (!result.success || !result.link) {
      return NextResponse.json(
        { success: false, message: result.error || "Not found" },
        { status: result.error === "Share link not found" ? 404 : 403 }
      );
    }

    const ipAddress = getClientIp(req);
    const userAgent = req.headers.get("user-agent") || undefined;
    const referrer = req.headers.get("referer") || undefined;

    void logClassPartyView({
      token_id: result.link.id,
      ip_address: ipAddress,
      user_agent: userAgent,
      referrer,
    });

    const records = result.registrations || [];
    const showFinancials = result.link.params.showFinancials !== false;
    const showContactInfo = result.link.params.showContactInfo !== false;
    const showHistory = result.link.params.showHistory !== false;
    const coordinatorFilter = result.link.params.coordinatorFilter;

    let filteredRecords = [...records];
    if (coordinatorFilter) {
      filteredRecords = filteredRecords.filter(
        (r) =>
          r.cash_paid_to?.toLowerCase() === coordinatorFilter.toLowerCase() ||
          (coordinatorFilter.toLowerCase() === "ayon" && r.payment_method === "bkash")
      );
    }

    const sanitizedRecords = filteredRecords.map((r) => {
      const record: Partial<ClassPartyRegistrationRecord> & { id: string } = {
        id: r.id,
        created_at: r.created_at,
        full_name: r.full_name,
        student_id: r.student_id,
        selected_option_id: r.selected_option_id,
        selected_option_title: r.selected_option_title,
        selected_option_category: r.selected_option_category,
        payment_status: r.payment_status,
        payment_method: r.payment_method,
      };

      if (showContactInfo) {
        record.phone = r.phone;
        record.email = r.email;
        record.bkash_sender_number = r.bkash_sender_number;
        record.bkash_transaction_id = r.bkash_transaction_id;
        record.cash_paid_to = r.cash_paid_to;
        record.special_notes = r.special_notes;
      } else {
        record.phone = r.phone ? `${r.phone.slice(0, 4)}***${r.phone.slice(-3)}` : "";
        record.cash_paid_to = r.cash_paid_to;
      }

      if (showFinancials) {
        record.base_price = r.base_price;
        record.vat_percent = r.vat_percent;
        record.vat_amount = r.vat_amount;
        record.subtotal_with_vat = r.subtotal_with_vat;
        record.bkash_fee_percent = r.bkash_fee_percent;
        record.bkash_fee_amount = r.bkash_fee_amount;
        record.total_payable = r.total_payable;
      }

      return record;
    });

    const totalRegistrations = filteredRecords.length;
    const verifiedRegistrations = filteredRecords.filter(
      (r) => r.payment_status === "verified"
    ).length;
    const pendingRegistrations = filteredRecords.filter(
      (r) => r.payment_status === "pending"
    ).length;
    const rejectedRegistrations = filteredRecords.filter(
      (r) => r.payment_status === "rejected"
    ).length;

    const totalRevenueExpected = filteredRecords.reduce(
      (acc, r) => acc + (Number(r.total_payable) || 0),
      0
    );
    const totalRevenueVerified = filteredRecords
      .filter((r) => r.payment_status === "verified")
      .reduce((acc, r) => acc + (Number(r.total_payable) || 0), 0);

    const bkashRecords = filteredRecords.filter((r) => r.payment_method === "bkash");
    const cashRecords = filteredRecords.filter((r) => r.payment_method === "cash");

    const bkashCount = bkashRecords.length;
    const cashCount = cashRecords.length;
    const bkashTotal = bkashRecords.reduce(
      (acc, r) => acc + (Number(r.total_payable) || 0),
      0
    );
    const cashTotal = cashRecords.reduce(
      (acc, r) => acc + (Number(r.total_payable) || 0),
      0
    );

    const menuCounts: Record<string, number> = {};
    filteredRecords.forEach((r) => {
      const key = String(r.selected_option_title || "Unknown");
      menuCounts[key] = (menuCounts[key] || 0) + 1;
    });

    const coordinatorCounts: Record<
      string,
      {
        cashCount: number;
        cashTotal: number;
        bkashCount: number;
        bkashTotal: number;
        totalCount: number;
        totalAmount: number;
      }
    > = {};

    coordinatorCounts["Ayon"] = {
      cashCount: 0,
      cashTotal: 0,
      bkashCount,
      bkashTotal,
      totalCount: bkashCount,
      totalAmount: bkashTotal,
    };

    filteredRecords.forEach((r) => {
      if (r.payment_method === "cash" && r.cash_paid_to) {
        const person = String(r.cash_paid_to);
        const amount = Number(r.total_payable) || 0;

        if (!coordinatorCounts[person]) {
          coordinatorCounts[person] = {
            cashCount: 0,
            cashTotal: 0,
            bkashCount: 0,
            bkashTotal: 0,
            totalCount: 0,
            totalAmount: 0,
          };
        }

        coordinatorCounts[person].cashCount += 1;
        coordinatorCounts[person].cashTotal += amount;
        coordinatorCounts[person].totalCount += 1;
        coordinatorCounts[person].totalAmount += amount;
      }
    });

    return NextResponse.json({
      success: true,
      link: {
        id: result.link.id,
        label: result.link.label,
        type: result.link.type,
        params: result.link.params,
        never_expires: result.link.never_expires,
        expires_at: result.link.expires_at,
        created_at: result.link.created_at,
      },
      stats: {
        totalRegistrations,
        verifiedRegistrations,
        pendingRegistrations,
        rejectedRegistrations,
        totalRevenueExpected: showFinancials ? totalRevenueExpected : null,
        totalRevenueVerified: showFinancials ? totalRevenueVerified : null,
        bkashCount,
        cashCount,
        bkashTotal: showFinancials ? bkashTotal : null,
        cashTotal: showFinancials ? cashTotal : null,
        menuCounts,
        coordinatorCounts: showFinancials ? coordinatorCounts : null,
      },
      registrations: sanitizedRecords,
      history: showHistory ? result.activities : [],
    });
  } catch (error) {
    console.error("GET shared class party error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
