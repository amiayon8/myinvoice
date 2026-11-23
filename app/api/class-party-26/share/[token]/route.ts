import { NextRequest, NextResponse } from "next/server";
import {
  getSharedClassPartyData,
  logClassPartyView,
  logClassPartyActivity,
  updateClassPartyRegistration,
  ClassPartyRegistrationRecord,
  getClassPartyFinancials,
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
        selected_option_title: r.selected_option_title,
        selected_option_category: r.selected_option_category,
        payment_status: r.payment_status,
        payment_method: r.payment_method,
        verified_by: r.verified_by,
        verified_at: r.verified_at,
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
        const fin = getClassPartyFinancials(r);
        record.subtotal = fin.subtotal;
        record.subtotal_with_vat = fin.subtotal;
        record.total_payable = fin.rawSubmittedAmount;
        record.paid_amount = fin.paidAmount;
        record.due_amount = fin.dueAmount;
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

    const validRecords = filteredRecords.filter((r) => r.payment_status !== "rejected");
    const verifiedRecords = filteredRecords.filter((r) => r.payment_status === "verified");

    const totalRevenueVerified = verifiedRecords.reduce(
      (acc, r) => acc + getClassPartyFinancials(r).paidAmount,
      0
    );
    const totalDues = validRecords.reduce(
      (acc, r) => acc + getClassPartyFinancials(r).dueAmount,
      0
    );
    const totalRevenueExpected = totalRevenueVerified + totalDues;
    const totalSubtotal = totalRevenueExpected;

    const bkashRecords = filteredRecords.filter((r) => r.payment_method === "bkash");
    const cashRecords = filteredRecords.filter((r) => r.payment_method === "cash");

    const bkashCount = bkashRecords.length;
    const cashCount = cashRecords.length;
    const bkashTotal = bkashRecords
      .filter((r) => r.payment_status === "verified")
      .reduce((acc, r) => acc + getClassPartyFinancials(r).paidAmount, 0);
    const bkashDues = bkashRecords
      .filter((r) => r.payment_status !== "rejected")
      .reduce((acc, r) => acc + getClassPartyFinancials(r).dueAmount, 0);
    const cashTotal = cashRecords
      .filter((r) => r.payment_status === "verified")
      .reduce((acc, r) => acc + getClassPartyFinancials(r).paidAmount, 0);
    const cashDues = cashRecords
      .filter((r) => r.payment_status !== "rejected")
      .reduce((acc, r) => acc + getClassPartyFinancials(r).dueAmount, 0);

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
        cashDues: number;
        bkashCount: number;
        bkashTotal: number;
        bkashDues: number;
        totalCount: number;
        totalAmount: number;
        totalDues: number;
      }
    > = {};

    coordinatorCounts["Ayon"] = {
      cashCount: 0,
      cashTotal: 0,
      cashDues: 0,
      bkashCount,
      bkashTotal,
      bkashDues,
      totalCount: bkashCount,
      totalAmount: bkashTotal,
      totalDues: bkashDues,
    };

    filteredRecords.forEach((r) => {
      if (r.payment_method === "cash" && r.cash_paid_to) {
        const person = String(r.cash_paid_to).trim();
        if (!person) return;

        const isVerified = r.payment_status === "verified";
        const isRejected = r.payment_status === "rejected";
        const fin = getClassPartyFinancials(r);
        const paid = isVerified ? fin.paidAmount : 0;
        const due = !isRejected ? fin.dueAmount : 0;

        if (!coordinatorCounts[person]) {
          coordinatorCounts[person] = {
            cashCount: 0,
            cashTotal: 0,
            cashDues: 0,
            bkashCount: 0,
            bkashTotal: 0,
            bkashDues: 0,
            totalCount: 0,
            totalAmount: 0,
            totalDues: 0,
          };
        }

        coordinatorCounts[person].cashCount += 1;
        coordinatorCounts[person].cashTotal += paid;
        coordinatorCounts[person].cashDues += due;
        coordinatorCounts[person].totalCount += 1;
        coordinatorCounts[person].totalAmount += paid;
        coordinatorCounts[person].totalDues += due;
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
        totalSubtotal: showFinancials ? totalSubtotal : null,
        totalRevenueExpected: showFinancials ? totalRevenueExpected : null,
        totalRevenueVerified: showFinancials ? totalRevenueVerified : null,
        totalDues: showFinancials ? totalDues : null,
        bkashCount,
        cashCount,
        bkashTotal: showFinancials ? bkashTotal : null,
        cashTotal: showFinancials ? cashTotal : null,
        bkashDues: showFinancials ? bkashDues : null,
        cashDues: showFinancials ? cashDues : null,
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

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;
    const result = await getSharedClassPartyData(token);

    if (!result.success || !result.link) {
      return NextResponse.json(
        { success: false, message: result.error || "Share link not found" },
        { status: result.error === "Share link not found" ? 404 : 403 }
      );
    }

    const { link, registrations } = result;

    if (!link.can_approve_payments && !link.params.canApprovePayments) {
      return NextResponse.json(
        {
          success: false,
          message: "This share link is not authorized to approve payments",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { registrationId, status } = body;

    if (!registrationId) {
      return NextResponse.json(
        { success: false, message: "Missing registration id" },
        { status: 400 }
      );
    }

    if (
      status !== "verified" &&
      status !== "rejected" &&
      status !== "pending"
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid payment status" },
        { status: 400 }
      );
    }

    const targetRecord = registrations.find((r) => r.id === registrationId);
    if (!targetRecord) {
      return NextResponse.json(
        { success: false, message: "Registration record not found" },
        { status: 404 }
      );
    }

    const organizer = link.organizer || link.params.organizer;
    if (organizer) {
      const organizerLower = organizer.toLowerCase();
      const isPaidToOrganizer =
        organizerLower === "ayon"
          ? targetRecord.payment_method === "bkash" ||
            targetRecord.cash_paid_to?.toLowerCase() === "ayon"
          : targetRecord.cash_paid_to?.toLowerCase() === organizerLower;

      if (!isPaidToOrganizer) {
        const paidToName =
          targetRecord.payment_method === "bkash"
            ? "Ayon (bKash)"
            : targetRecord.cash_paid_to || "another coordinator";
        return NextResponse.json(
          {
            success: false,
            message: `You can only approve payments paid to you. This payment was received by ${paidToName}.`,
          },
          { status: 403 }
        );
      }
    }

    const actorName = organizer || link.label || "Organizer";
    const updates: Partial<ClassPartyRegistrationRecord> = {
      payment_status: status,
      verified_by: status === "pending" ? null : actorName,
      verified_at: status === "pending" ? null : new Date().toISOString(),
    };

    const updated = await updateClassPartyRegistration(registrationId, updates);

    await logClassPartyActivity({
      category: "payment",
      actor: actorName,
      action:
        status === "verified"
          ? `Verified payment for ${targetRecord.full_name} (via share link)`
          : status === "rejected"
            ? `Rejected payment for ${targetRecord.full_name} (via share link)`
            : `Reset payment for ${targetRecord.full_name} to pending (via share link)`,
      details: `Organizer: ${actorName} | Amount: ৳${targetRecord.paid_amount ?? targetRecord.subtotal ?? 0}`,
      record_id: targetRecord.id,
      participant_name: targetRecord.full_name,
    });

    return NextResponse.json({
      success: true,
      record: updated || { ...targetRecord, ...updates },
    });
  } catch (error) {
    console.error("Shared approval PATCH error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
