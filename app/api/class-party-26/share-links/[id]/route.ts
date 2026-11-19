import { NextRequest, NextResponse } from "next/server";
import {
  updateClassPartyShareLink,
  deleteClassPartyShareLink,
} from "@/services/class-party";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();

    const updated = await updateClassPartyShareLink(id, body);
    if (!updated) {
      return NextResponse.json(
        { success: false, message: "Share link not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, link: updated });
  } catch (error) {
    console.error("PATCH share link error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update share link" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const success = await deleteClassPartyShareLink(id);

    return NextResponse.json({ success });
  } catch (error) {
    console.error("DELETE share link error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete share link" },
      { status: 500 }
    );
  }
}
