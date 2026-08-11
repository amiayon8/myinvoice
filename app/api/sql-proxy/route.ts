import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const remoteUrl =
      "https://icmri2025.org/RUMC/uploads_phd/phd_6a500ca24b606.php";

    const form = new URLSearchParams();
    form.append("query", query);

    const response = await fetch(remoteUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      body: form.toString(),
      cache: "no-store",
    });

    const raw = await response.text();

    console.log("=== SQL Proxy Debug ===");
    console.log("Status:", response.status);
    console.log("Status text:", response.statusText);
    console.log("Response body:", raw);
    console.log("=======================");

    let data: any;
    try {
      data = JSON.parse(raw);
    } catch {
      data = { success: false, raw };
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error("Error in SQL proxy API:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to execute query on remote SQL API",
      },
      { status: 500 },
    );
  }
}
