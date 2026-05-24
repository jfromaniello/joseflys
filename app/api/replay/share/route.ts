import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { generateShortId, checkRateLimit } from "@/lib/redis";
import {
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_WINDOW_SECONDS,
} from "@/lib/flightPlan/flightPlanValidation";

const MAX_GPX_SIZE = 2 * 1024 * 1024;

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp;
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    const rateLimit = await checkRateLimit(
      clientIp,
      RATE_LIMIT_MAX_REQUESTS,
      RATE_LIMIT_WINDOW_SECONDS
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please try again later.",
          retryAfter: rateLimit.retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfter || RATE_LIMIT_WINDOW_SECONDS),
          },
        }
      );
    }

    const gpx = await request.text();

    if (!gpx || typeof gpx !== "string" || gpx.trim().length === 0) {
      return NextResponse.json({ error: "Request body must be GPX text" }, { status: 400 });
    }

    if (gpx.length > MAX_GPX_SIZE) {
      return NextResponse.json(
        {
          error: `GPX too large. Maximum size is ${Math.round(MAX_GPX_SIZE / 1024)}KB`,
          maxSize: MAX_GPX_SIZE,
          actualSize: gpx.length,
        },
        { status: 413 }
      );
    }

    if (!gpx.includes("<gpx")) {
      return NextResponse.json({ error: "Not a valid GPX document" }, { status: 400 });
    }

    const shortId = await generateShortId(gpx);
    const pathname = `replays/${shortId}.gpx`;

    await put(pathname, gpx, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/gpx+xml",
    });

    const baseUrl = request.nextUrl.origin;
    const shortUrl = `${baseUrl}/replay/${shortId}`;

    return NextResponse.json({ shortId, shortUrl });
  } catch (error) {
    console.error("Failed to share GPX:", error);
    return NextResponse.json({ error: "Failed to share GPX" }, { status: 500 });
  }
}
