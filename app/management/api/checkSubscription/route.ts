import { NextRequest, NextResponse } from 'next/server';
import { getAttendxOrganizationByOrgId } from '@/lib/attendx-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json({
        error: 'Missing required query parameter "orgId"'
      }, { status: 400 });
    }

    const org = await getAttendxOrganizationByOrgId(orgId);

    if (!org) {
      // If org not found, return 404
      return NextResponse.json({
        error: `Organization with orgId "${orgId}" not found`
      }, { status: 404 });
    }

    // Return the exact JSON schema expected by getSubscriptionStatus()
    return NextResponse.json({
      Status: org.status,
      WarningStart: org.warning_start,
      SubscriptionEnds: org.subscription_ends
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message || 'Internal Server Error'
    }, { status: 500 });
  }
}
