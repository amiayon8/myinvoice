import { NextRequest, NextResponse } from "next/server";
import {
  getClassPartyShareLinks,
  createClassPartyShareLink,
} from "@/services/class-party";

export async function GET() {
  try {
    const links = await getClassPartyShareLinks();
    return NextResponse.json({ success: true, links });
  } catch (error) {
    console.error("GET share links error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch share links" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { label, type, params, neverExpires, daysExpiry } = body;

    const link = await createClassPartyShareLink({
      label,
      type,
      params,
      neverExpires: Boolean(neverExpires),
      daysExpiry: daysExpiry ? Number(daysExpiry) : undefined,
    });

    return NextResponse.json({ success: true, link });
  } catch (error) {
    console.error("POST share link error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create share link" },
      { status: 500 }
    );
  }
}
