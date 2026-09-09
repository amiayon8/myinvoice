import { NextRequest, NextResponse } from 'next/server';
import { reviewPaymentUpdateRequest } from '@/lib/payment-methods-service';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { action, admin_notes } = body;

    if (!['approved', 'rejected'].includes(action)) {
      return NextResponse.json({
        success: false,
        error: 'Action must be "approved" or "rejected"'
      }, { status: 400 });
    }

    const result = await reviewPaymentUpdateRequest(id, action, admin_notes);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, request: result.request });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
