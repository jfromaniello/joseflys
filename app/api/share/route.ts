import { NextRequest, NextResponse } from "next/server";
import { storeSharedFlightPlan, checkRateLimit } from "@/lib/redis";
import {
  validateFlightPlan,
  MAX_FLIGHT_PLAN_SIZE,
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_WINDOW_SECONDS,
} from "@/lib/flightPlan/flightPlanValidation";

/**
 * Get client IP from request headers
 * Handles various proxy headers used by Vercel, Cloudflare, etc.
 */
function getClientIp(request: NextRequest): string {
  // Vercel
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  // Cloudflare
  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Real IP header
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fallback
  return "unknown";
}

/**
 * Stringify with sorted keys for consistent hashing
 */
function stableStringify(obj: unknown): string {
  return JSON.stringify(obj, (_, value) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return Object.keys(value)
        .sort()
        .reduce((sorted: Record<string, unknown>, key) => {
          sorted[key] = value[key];
          return sorted;
        }, {});
    }
    return value;
  });
}

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const clientIp = getClientIp(request);

    // Check rate limit
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
            "X-RateLimit-Limit": String(RATE_LIMIT_MAX_REQUESTS),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    // Parse request body as JSON directly
    const plan = await request.json();

    if (!plan || typeof plan !== "object") {
      return NextResponse.json(
        { error: "Request body must be a flight plan object" },
        { status: 400 }
      );
    }

    // Validate flight plan structure with Zod
    try {
      validateFlightPlan(plan);
    } catch (error) {
      console.error("Flight plan validation error:", error);
      return NextResponse.json(
        { error: "Invalid flight plan structure" },
        { status: 400 }
      );
    }

    // Serialize with stable key ordering for consistent hashing
    const planJson = stableStringify(plan);

    // Check size limit
    if (planJson.length > MAX_FLIGHT_PLAN_SIZE) {
      return NextResponse.json(
        {
          error: `Flight plan too large. Maximum size is ${Math.round(MAX_FLIGHT_PLAN_SIZE / 1024)}KB`,
          maxSize: MAX_FLIGHT_PLAN_SIZE,
          actualSize: planJson.length,
        },
        { status: 413 }
      );
    }

    // Store in Redis and get short ID
    const shortId = await storeSharedFlightPlan(planJson);

    // Build the short URL
    const baseUrl = request.nextUrl.origin;
    const shortUrl = `${baseUrl}/s/${shortId}`;

    return NextResponse.json(
      { shortId, shortUrl },
      {
        headers: {
          "X-RateLimit-Limit": String(RATE_LIMIT_MAX_REQUESTS),
          "X-RateLimit-Remaining": String(rateLimit.remaining),
        },
      }
    );
  } catch (error) {
    console.error("Failed to create short link:", error);
    return NextResponse.json(
      { error: "Failed to create short link" },
      { status: 500 }
    );
  }
}
