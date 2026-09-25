import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = createServiceRoleClient();
  const body = await request.json();
  const { action, reason } = body;

  if (action !== "APPROVE" && action !== "REJECT") {
    return NextResponse.json({ success: false, error: "Action must be APPROVE or REJECT" }, { status: 400 });
  }

  const payload: any = {
    approval_status: action === "APPROVE" ? "APPROVED" : "REJECTED",
    rejection_reason: action === "REJECT" ? (reason || null) : null,
  };

  const { data, error } = await supabase
    .from("tuition_class_sessions")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ success: false, error: error?.message || "Failed to update session approval" }, { status: 500 });
  }

  return NextResponse.json({ success: true, session: data });
}
