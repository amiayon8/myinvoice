import { NextResponse } from "next/server";
import {
  getClassPartyActivityLogs,
  getClassPartyViewLogs,
} from "@/services/class-party";

export async function GET() {
  try {
    const [activities, viewLogs] = await Promise.all([
      getClassPartyActivityLogs(),
      getClassPartyViewLogs(),
    ]);

    return NextResponse.json({
      success: true,
      activities,
      viewLogs,
    });
  } catch (error) {
    console.error("GET class party history error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch class party history" },
      { status: 500 }
    );
  }
}
