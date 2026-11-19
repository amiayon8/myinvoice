import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { logClassPartyActivity } from "@/services/class-party";
import fs from "fs";
import path from "path";

const localBackupPath = path.join(process.cwd(), "appData", "class-party-26-submissions.json");

function readLocalBackup(): Array<Record<string, unknown>> {
  try {
    if (fs.existsSync(localBackupPath)) {
      const raw = fs.readFileSync(localBackupPath, "utf8");
      return JSON.parse(raw);
    }
  } catch (error) {
    console.error("Local backup read error:", error);
  }
  return [];
}

function updateLocalBackup(id: string, updates: Record<string, unknown>) {
  try {
    const list = readLocalBackup();
    const index = list.findIndex((item) => item.id === id);
    if (index !== -1) {
      list[index] = { ...list[index], ...updates };
      fs.writeFileSync(localBackupPath, JSON.stringify(list, null, 2), "utf8");
    }
  } catch (error) {
    console.error("Local backup update error:", error);
  }
}

function deleteLocalBackup(id: string) {
  try {
    const list = readLocalBackup();
    const filtered = list.filter((item) => item.id !== id);
    fs.writeFileSync(localBackupPath, JSON.stringify(filtered, null, 2), "utf8");
  } catch (error) {
    console.error("Local backup delete error:", error);
  }
}

interface CoordinatorSummary {
  cashCount: number;
  cashTotal: number;
  bkashCount: number;
  bkashTotal: number;
  totalCount: number;
  totalAmount: number;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");
    const methodFilter = searchParams.get("method");
    const search = searchParams.get("search")?.toLowerCase().trim();

    let records: Array<Record<string, unknown>> = [];
    const supabase = createServiceRoleClient();

    try {
      const { data, error } = await supabase
        .from("class_party_26_registrations")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        records = data;
      } else {
        records = readLocalBackup();
      }
    } catch {
      records = readLocalBackup();
    }

    if (records.length === 0) {
      records = readLocalBackup();
    }

    const totalRegistrations = records.length;
    const verifiedRegistrations = records.filter((r) => r.payment_status === "verified").length;
    const pendingRegistrations = records.filter((r) => r.payment_status === "pending").length;
    const rejectedRegistrations = records.filter((r) => r.payment_status === "rejected").length;

    const totalRevenueExpected = records.reduce((acc, r) => acc + (Number(r.total_payable) || 0), 0);
    const totalRevenueVerified = records
      .filter((r) => r.payment_status === "verified")
      .reduce((acc, r) => acc + (Number(r.total_payable) || 0), 0);

    const bkashRecords = records.filter((r) => r.payment_method === "bkash");
    const cashRecords = records.filter((r) => r.payment_method === "cash");

    const bkashCount = bkashRecords.length;
    const cashCount = cashRecords.length;
    const bkashTotal = bkashRecords.reduce((acc, r) => acc + (Number(r.total_payable) || 0), 0);
    const cashTotal = cashRecords.reduce((acc, r) => acc + (Number(r.total_payable) || 0), 0);

    const menuCounts: Record<string, number> = {};
    records.forEach((r) => {
      const key = String(r.selected_option_title || "Unknown");
      menuCounts[key] = (menuCounts[key] || 0) + 1;
    });

    const coordinatorCounts: Record<string, CoordinatorSummary> = {};

    coordinatorCounts["Ayon"] = {
      cashCount: 0,
      cashTotal: 0,
      bkashCount,
      bkashTotal,
      totalCount: bkashCount,
      totalAmount: bkashTotal,
    };

    records.forEach((r) => {
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

    let filtered = [...records];
    if (statusFilter && statusFilter !== "all") {
      filtered = filtered.filter((r) => r.payment_status === statusFilter);
    }
    if (methodFilter && methodFilter !== "all") {
      filtered = filtered.filter((r) => r.payment_method === methodFilter);
    }
    if (search) {
      filtered = filtered.filter(
        (r) =>
          String(r.full_name || "").toLowerCase().includes(search) ||
          String(r.phone || "").toLowerCase().includes(search) ||
          String(r.student_id || "").toLowerCase().includes(search) ||
          String(r.bkash_transaction_id || "").toLowerCase().includes(search) ||
          String(r.cash_paid_to || "").toLowerCase().includes(search)
      );
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalRegistrations,
        verifiedRegistrations,
        pendingRegistrations,
        rejectedRegistrations,
        totalRevenueExpected,
        totalRevenueVerified,
        bkashCount,
        cashCount,
        bkashTotal,
        cashTotal,
        menuCounts,
        coordinatorCounts,
      },
      registrations: filtered,
    });
  } catch (error) {
    console.error("Admin GET error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch registrations" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Missing registration id" },
        { status: 400 }
      );
    }

    if (updates.payment_status && !updates.verified_at && updates.payment_status !== "pending") {
      updates.verified_at = new Date().toISOString();
      if (!updates.verified_by) {
        updates.verified_by = "Admin";
      }
    }

    updateLocalBackup(id, updates);

    try {
      const supabase = createServiceRoleClient();
      const { error } = await supabase
        .from("class_party_26_registrations")
        .update(updates)
        .eq("id", id);

      if (error) {
        console.warn("Supabase update error:", error);
      }
    } catch (err) {
      console.warn("Supabase update exception:", err);
    }

    void logClassPartyActivity({
      category: updates.payment_status ? "payment" : "edit",
      actor: updates.verified_by || "Admin",
      action: updates.payment_status
        ? `Marked payment as ${updates.payment_status}`
        : "Updated registration details",
      details: updates.full_name ? `Attendee: ${updates.full_name}` : undefined,
      record_id: id,
      participant_name: updates.full_name || undefined,
    });

    return NextResponse.json({ success: true, updates });
  } catch (error) {
    console.error("Admin PATCH error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update registration" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");

    if (!id) {
      try {
        const body = await req.json();
        id = body.id;
      } catch {}
    }

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Missing id to delete" },
        { status: 400 }
      );
    }

    deleteLocalBackup(id);

    try {
      const supabase = createServiceRoleClient();
      const { error } = await supabase
        .from("class_party_26_registrations")
        .delete()
        .eq("id", id);

      if (error) {
        console.warn("Supabase delete error:", error);
      }
    } catch (err) {
      console.warn("Supabase delete exception:", err);
    }

    void logClassPartyActivity({
      category: "delete",
      actor: "Admin",
      action: "Deleted registration record",
      record_id: id,
    });

    return NextResponse.json({ success: true, message: "Registration deleted successfully" });
  } catch (error) {
    console.error("Admin DELETE error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete registration" },
      { status: 500 }
    );
  }
}
