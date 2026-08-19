import { NextRequest, NextResponse } from 'next/server';
import {
  getAttendxOrganizations,
  getAttendxOrganizationDetails,
  saveAttendxOrganization,
  deleteAttendxOrganization,
  recordAttendxPayment,
  addHardwareSale,
  deleteHardwareSale
} from '@/lib/attendx-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');

    if (orgId) {
      const details = await getAttendxOrganizationDetails(orgId);
      return NextResponse.json({ success: true, organization: details });
    }

    const orgs = await getAttendxOrganizations();
    return NextResponse.json({ success: true, organizations: orgs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'record_payment') {
      const result = await recordAttendxPayment(body);
      return NextResponse.json(result);
    }

    const saved = await saveAttendxOrganization(body);
    return NextResponse.json({ success: true, organization: saved });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { org_id, hardware_item } = body;

    if (!org_id || !hardware_item) {
      return NextResponse.json({ success: false, error: 'org_id and hardware_item are required' }, { status: 400 });
    }

    const savedHw = await addHardwareSale(org_id, hardware_item);
    return NextResponse.json({ success: true, hardware_item: savedHw });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const hardwareId = searchParams.get('hardware_id');
    const orgId = searchParams.get('org_id');

    if (hardwareId && orgId) {
      await deleteHardwareSale(orgId, hardwareId);
      return NextResponse.json({ success: true, message: 'Hardware deleted' });
    }

    if (!id) return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });

    await deleteAttendxOrganization(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
