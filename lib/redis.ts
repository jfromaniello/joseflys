import { Redis } from "@upstash/redis";

// Create a lazy-loaded Redis client
let redisInstance: Redis | null = null;

export function getRedis(): Redis {
  if (!redisInstance) {
    // Vercel KV uses KV_REST_API_URL and KV_REST_API_TOKEN
    // Upstash uses UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
    const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      throw new Error("Redis credentials not configured. Set KV_REST_API_URL and KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN)");
    }

    redisInstance = new Redis({ url, token });
  }
  return redisInstance;
}

/**
 * Generate a deterministic short ID from content using a hash
 * Same content will always produce the same ID
 */
export async function generateShortId(content: string): Promise<string> {
  // Use Web Crypto API (available in both Node.js 18+ and Edge Runtime)
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  // Convert to base62 (alphanumeric only) for URL-friendliness
  // Take first 8 characters which gives us ~218 trillion unique combinations
  const base62Chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let shortId = "";
  for (let i = 0; i < 8; i++) {
    shortId += base62Chars[hashArray[i] % 62];
  }

  return shortId;
}

// Key prefixes
const SHARED_PLAN_PREFIX = "shared:plan:";
const RATE_LIMIT_PREFIX = "ratelimit:share:";

// TTL for shared flight plans (30 days)
export const SHARED_PLAN_TTL_DAYS = 30;
const SHARED_PLAN_TTL_SECONDS = SHARED_PLAN_TTL_DAYS * 24 * 60 * 60;

/**
 * Store a flight plan in Redis with a deterministic short ID
 * Returns the short ID (same content = same ID)
 */
export async function storeSharedFlightPlan(planJson: string): Promise<string> {
  const redis = getRedis();
  const shortId = await generateShortId(planJson);
  const key = `${SHARED_PLAN_PREFIX}${shortId}`;

  // Check if already exists (idempotent)
  const existing = await redis.exists(key);
  if (!existing) {
    // Store with 30-day TTL
    await redis.set(key, planJson, { ex: SHARED_PLAN_TTL_SECONDS });
  } else {
    // Refresh TTL on existing plan (extend expiration)
    await redis.expire(key, SHARED_PLAN_TTL_SECONDS);
  }

  return shortId;
}

/**
 * Retrieve a flight plan from Redis by short ID
 * Note: Upstash client auto-deserializes JSON, so this returns the parsed object
 */
export async function getSharedFlightPlan(shortId: string): Promise<unknown> {
  const redis = getRedis();
  const key = `${SHARED_PLAN_PREFIX}${shortId}`;
  const plan = await redis.get(key);
  return plan;
}

/**
 * Check rate limit for an IP address
 * Returns { allowed: true, remaining: N } or { allowed: false, remaining: 0, retryAfter: seconds }
 */
export async function checkRateLimit(
  ip: string,
  maxRequests: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; retryAfter?: number }> {
  const redis = getRedis();
  const key = `${RATE_LIMIT_PREFIX}${ip}`;

  // Get current count
  const current = await redis.get<number>(key);

  if (current === null) {
    // First request - set counter with expiry
    await redis.set(key, 1, { ex: windowSeconds });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (current >= maxRequests) {
    // Rate limited - get TTL for retry-after
    const ttl = await redis.ttl(key);
    return { allowed: false, remaining: 0, retryAfter: ttl > 0 ? ttl : windowSeconds };
  }

  // Increment counter
  await redis.incr(key);
  return { allowed: true, remaining: maxRequests - current - 1 };
}
