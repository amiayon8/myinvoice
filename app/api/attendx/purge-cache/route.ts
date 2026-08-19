import { NextRequest, NextResponse } from 'next/server';
import { purgeClientCache } from '@/lib/attendx-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const org_id = body.org_id || body.orgId || body.clientId;

    if (!org_id) {
      return NextResponse.json({ success: false, error: 'org_id or orgId is required' }, { status: 400 });
    }

    const result = await purgeClientCache(org_id);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
