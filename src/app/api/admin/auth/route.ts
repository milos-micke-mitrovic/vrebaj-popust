import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// Use environment variable for admin password
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "change-me-in-production";

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Password required" },
        { status: 400 }
      );
    }

    if (password !== ADMIN_PASSWORD) {
      // Add delay to prevent brute force
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }

    // Set cookie (readable from JS for client-side auth check)
    const cookieStore = await cookies();
    cookieStore.set("admin_auth", "1", {
      httpOnly: false, // Allow JS to read for client-side auth check
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/admin",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}
