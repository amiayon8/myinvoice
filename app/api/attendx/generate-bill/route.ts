import { NextRequest, NextResponse } from 'next/server';
import { generateAttendxBill } from '@/lib/attendx-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      org_id,
      plan_tier,
      billing_cycle,
      duration_months,
      custom_rate,
      students,
      discount_type,
      discount_value,
      includeHardware,
      selected_hardware,
      custom_notes,
      dueDays
    } = body;

    if (!org_id) {
      return NextResponse.json({ success: false, error: 'org_id is required' }, { status: 400 });
    }

    const result = await generateAttendxBill(org_id, {
      plan_tier,
      billing_cycle,
      duration_months,
      custom_rate,
      students,
      discount_type,
      discount_value,
      includeHardware,
      selected_hardware,
      custom_notes,
      dueDays: dueDays || 14
    });

    return NextResponse.json({
      success: true,
      message: 'Invoice created successfully in Supabase DB',
      ...result
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
