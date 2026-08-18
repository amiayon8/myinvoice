import { NextRequest, NextResponse } from 'next/server';
import { getPaymentMethods, getPaymentMethodsForClient, savePaymentMethod, deletePaymentMethod } from '@/lib/payment-methods-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const forPublic = searchParams.get('public') === 'true';

    if (forPublic || clientId !== null) {
      const methods = await getPaymentMethodsForClient(clientId);
      return NextResponse.json({ success: true, payment_methods: methods });
    }

    const methods = await getPaymentMethods();
    return NextResponse.json({ success: true, payment_methods: methods });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const saved = await savePaymentMethod(body);
    return NextResponse.json({ success: true, payment_method: saved });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });

    await deletePaymentMethod(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
