import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function GET() {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("tuition_share_links")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  const linkIds = (data || []).map((l: any) => l.id);
  const countMap: Record<string, number> = {};

  if (linkIds.length > 0) {
    const { data: viewLogs } = await supabase
      .from("tuition_view_logs")
      .select("token_id")
      .in("token_id", linkIds);

    (viewLogs || []).forEach((v: any) => {
      countMap[v.token_id] = (countMap[v.token_id] || 0) + 1;
    });
  }

  const links = (data || []).map((l: any) => ({
    id: l.id,
    token: l.token,
    label: l.label,
    type: l.type,
    params: l.params || {},
    expiresAt: l.expires_at,
    neverExpires: Boolean(l.never_expires),
    allowRecordClass: l.allow_record_class !== false,
    createdAt: l.created_at,
    revokedAt: l.revoked_at,
    viewCount: countMap[l.id] || 0,
  }));

  return NextResponse.json({ success: true, links });
}

export async function POST(request: NextRequest) {
  const supabase = createServiceRoleClient();
  const body = await request.json();
  const { label, type, params, neverExpires, daysExpiry, allowRecordClass } = body;

  const expiresAt = neverExpires
    ? null
    : (() => {
        const d = new Date();
        d.setDate(d.getDate() + (Number(daysExpiry) || 30));
        return d.toISOString();
      })();

  const { data, error } = await supabase
    .from("tuition_share_links")
    .insert({
      label: label || null,
      type: type || "all",
      params: params || {},
      never_expires: Boolean(neverExpires),
      expires_at: expiresAt,
      allow_record_class: allowRecordClass !== false,
    })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ success: false, error: error?.message || "Failed to create share link" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    link: {
      id: data.id,
      token: data.token,
      label: data.label,
      type: data.type,
      params: data.params || {},
      expiresAt: data.expires_at,
      neverExpires: Boolean(data.never_expires),
      allowRecordClass: data.allow_record_class !== false,
      createdAt: data.created_at,
      revokedAt: data.revoked_at,
      viewCount: 0,
    },
  });
}
