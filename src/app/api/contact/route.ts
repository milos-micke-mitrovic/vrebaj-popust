import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Per-IP rate limiting for contact form: 3 submissions per 60 seconds
const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 60_000;
const rateMap = new Map<string, number[]>();

// Minimum time (ms) between form render and submission (bot detection)
const MIN_SUBMIT_TIME_MS = 3_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateMap.get(ip) || [];
  const recent = timestamps.filter((t) => now - t < RATE_WINDOW_MS);

  if (recent.length >= RATE_LIMIT) {
    rateMap.set(ip, recent);
    return true;
  }

  recent.push(now);
  rateMap.set(ip, recent);

  // Cleanup if map grows too large
  if (rateMap.size > 5000) {
    for (const [key, vals] of rateMap) {
      if (vals.every((t) => now - t > RATE_WINDOW_MS)) {
        rateMap.delete(key);
      }
    }
  }

  return false;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { errors: ["Previše zahteva. Pokušajte ponovo za minut."] },
        { status: 429 }
      );
    }

    const body = await request.json();

    // Honeypot check — if the hidden field is filled, it's a bot
    if (body.website) {
      // Silently accept to not tip off the bot
      return NextResponse.json({ success: true });
    }

    // Time-based bot detection
    const loadedAt = typeof body._t === "number" ? body._t : 0;
    if (Date.now() - loadedAt < MIN_SUBMIT_TIME_MS) {
      return NextResponse.json({ success: true });
    }

    const name = typeof body.name === "string" ? body.name.trim().slice(0, 100) : "";
    const email = typeof body.email === "string" ? body.email.trim().slice(0, 200) : "";
    const message = typeof body.message === "string" ? body.message.trim().slice(0, 2000) : "";

    const errors: string[] = [];

    if (!name) {
      errors.push("Ime je obavezno.");
    }

    if (!email) {
      errors.push("Email je obavezan.");
    } else if (!EMAIL_REGEX.test(email)) {
      errors.push("Email adresa nije validna.");
    }

    if (!message) {
      errors.push("Poruka je obavezna.");
    }

    if (errors.length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    await prisma.contactMessage.create({
      data: { name, email, message },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving contact message:", error);
    return NextResponse.json(
      { errors: ["Došlo je do greške. Pokušajte ponovo."] },
      { status: 500 }
    );
  }
}
