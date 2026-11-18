import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
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

    const bkashCount = records.filter((r) => r.payment_method === "bkash").length;
    const cashCount = records.filter((r) => r.payment_method === "cash").length;

    const menuCounts: Record<string, number> = {};
    records.forEach((r) => {
      const key = String(r.selected_option_title || "Unknown");
      menuCounts[key] = (menuCounts[key] || 0) + 1;
    });

    const cashCollectorCounts: Record<string, { count: number; total: number }> = {};
    records
      .filter((r) => r.payment_method === "cash" && r.cash_paid_to)
      .forEach((r) => {
        const person = String(r.cash_paid_to);
        if (!cashCollectorCounts[person]) {
          cashCollectorCounts[person] = { count: 0, total: 0 };
        }
        cashCollectorCounts[person].count += 1;
        cashCollectorCounts[person].total += Number(r.total_payable) || 0;
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
        menuCounts,
        cashCollectorCounts,
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
    const { id, payment_status, verified_by } = body;

    if (!id || !payment_status) {
      return NextResponse.json(
        { success: false, message: "Missing id or payment_status" },
        { status: 400 }
      );
    }

    const updates = {
      payment_status,
      verified_by: verified_by || "Admin",
      verified_at: new Date().toISOString(),
    };

    updateLocalBackup(id, updates);

    try {
      const supabase = createServiceRoleClient();
      await supabase
        .from("class_party_26_registrations")
        .update(updates)
        .eq("id", id);
    } catch (err) {
      console.warn("Supabase update error:", err);
    }

    return NextResponse.json({ success: true, updates });
  } catch (error) {
    console.error("Admin PATCH error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update status" },
      { status: 500 }
    );
  }
}
