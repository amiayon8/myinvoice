import { NextRequest, NextResponse } from 'next/server';
import { getPaymentUpdateRequests, submitPaymentUpdateRequest } from '@/lib/payment-methods-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const type = searchParams.get('type') || undefined;

    const requests = await getPaymentUpdateRequests({ status, type });
    return NextResponse.json({ success: true, requests });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transaction_id, account_number } = body;

    if (!transaction_id || !account_number) {
      return NextResponse.json({
        success: false,
        error: 'Transaction ID and Account Number are required'
      }, { status: 400 });
    }

    const newReq = await submitPaymentUpdateRequest(body);
    return NextResponse.json({
      success: true,
      message: 'Payment verification request submitted successfully. It will be reviewed by our team.',
      request: newReq
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
