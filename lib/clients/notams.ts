import { getRedis } from "@/lib/redis";

export interface Notam {
  facilityDesignator: string;
  notamNumber: string;
  featureName: string;
  issueDate: string;
  startDate: string;
  endDate: string;
  source: string;
  sourceType: string;
  icaoMessage: string;
  traditionalMessage: string;
  plainLanguageMessage: string;
  traditionalMessageFrom4thWord: string;
  icaoId: string;
  accountId: string;
  airportName: string;
  procedure: boolean;
  transactionID: number;
  cancelledOrExpired: boolean;
  status: string;
  keyword: string;
  snowtam: boolean;
  geometry: string;
  mapPointer: string;
}

export interface NotamResult {
  notams: Notam[];
  searchedId: string;
  cachedAt?: string;
}

interface CachedNotams extends NotamResult {
  cachedAt: string;
}

const CACHE_KEY_PREFIX = "notams:";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:145.0) Gecko/20100101 Firefox/145.0";

// Cookie jar to persist cookies between requests
let cookieJar: Map<string, string> = new Map();
let cookieJarInitialized = false;

/**
 * Get the base URL from environment variable
 */
function getBaseUrl(): string {
  const url = process.env.NOTAM_SEARCH_URL;
  if (!url) {
    throw new Error("NOTAM_SEARCH_URL environment variable is not set");
  }
  return url;
}

/**
 * Initialize the cookie jar with the disclaimer cookie
 */
async function initCookieJar(): Promise<void> {
  if (cookieJarInitialized) return;

  const baseUrl = getBaseUrl();

  // First, visit the main page to get any session cookies
  const response = await fetch(`${baseUrl}/nsapp.html`, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html",
    },
  });

  // Extract cookies from response
  const setCookies = response.headers.getSetCookie?.() || [];
  for (const cookie of setCookies) {
    const [nameValue] = cookie.split(";");
    const [name, value] = nameValue.split("=");
    if (name && value) {
      cookieJar.set(name.trim(), value.trim());
    }
  }

  // Set the disclaimer cookie (required to bypass the consent screen)
  cookieJar.set("fnsDisclaimer", "agreed");

  cookieJarInitialized = true;
}

/**
 * Get cookie string for requests
 */
function getCookieString(): string {
  return Array.from(cookieJar.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

/**
 * Calculate TTL for NOTAM cache.
 * NOTAMs don't have a fixed update schedule, so we use a moderate TTL.
 */
function calculateNotamTTL(): number {
  // Cache for 15 minutes
  return 15 * 60;
}

/**
 * Fetch NOTAMs for an aerodrome
 *
 * @param icao - ICAO code (e.g., "KJFK" or "SACO")
 */
export async function fetchNotams(icao: string): Promise<Notam[]> {
  const baseUrl = getBaseUrl();

  const redis = getRedis();
  const searchedId = icao.toUpperCase();
  const cacheKey = `${CACHE_KEY_PREFIX}${searchedId}`;

  // Try cache first
  const cached = await redis.get<CachedNotams>(cacheKey);
  if (cached) {
    console.log(`[NOTAM] Cache hit for ${searchedId}`);
    return cached.notams;
  }

  // Initialize cookie jar if needed
  await initCookieJar();

  // Build search params
  const params = new URLSearchParams({
    searchType: "0", // Location search
    designatorsForLocation: searchedId,
    notamsOnly: "true",
    offset: "0",
  });

  const url = `${baseUrl}/search`;
  console.log(`[NOTAM] Fetching: ${url} for ${searchedId}`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "User-Agent": USER_AGENT,
      "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
      Cookie: getCookieString(),
      Accept: "application/json",
    },
    body: params.toString(),
  });

  // Update cookies from response
  const setCookies = response.headers.getSetCookie?.() || [];
  for (const cookie of setCookies) {
    const [nameValue] = cookie.split(";");
    const [name, value] = nameValue.split("=");
    if (name && value) {
      cookieJar.set(name.trim(), value.trim());
    }
  }

  console.log(`[NOTAM] Response: ${response.status}`);

  if (!response.ok) {
    throw new Error(`NOTAM search failed: ${response.status}`);
  }

  const data = await response.json();

  // The API returns an array of NOTAMs directly
  const notams: Notam[] = Array.isArray(data) ? data : [];
  console.log(`[NOTAM] Found ${notams.length} NOTAMs for ${searchedId}`);

  // Cache the result
  const ttl = calculateNotamTTL();
  const cacheData: CachedNotams = {
    notams,
    searchedId,
    cachedAt: new Date().toISOString(),
  };

  await redis.set(cacheKey, cacheData, { ex: ttl });
  console.log(`[NOTAM] Cached ${searchedId} for ${ttl}s`);

  return notams;
}

/**
 * Reset the cookie jar (useful for testing or after errors)
 */
export function resetCookieJar(): void {
  cookieJar = new Map();
  cookieJarInitialized = false;
}
