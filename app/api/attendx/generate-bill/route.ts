import { NextRequest, NextResponse } from 'next/server';
import { generateAttendxBill } from '@/lib/attendx-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const org_id = body.org_id;
    const optionsPayload = body.options || body;

    if (!org_id) {
      return NextResponse.json({ success: false, error: 'org_id is required' }, { status: 400 });
    }

    const result = await generateAttendxBill(org_id, optionsPayload);

    return NextResponse.json({
      success: true,
      message: 'Invoice created successfully in Supabase DB',
      ...result
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
