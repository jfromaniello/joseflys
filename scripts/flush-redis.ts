import { Redis } from "@upstash/redis";
import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });
config({ path: ".env.development.local" });

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

if (!url || !token) {
  console.error("Redis credentials not configured");
  process.exit(1);
}

const redis = new Redis({ url, token });

async function flushAll() {
  // Use flushdb to clear all keys
  const result = await redis.flushdb();
  console.log("Flushed all keys:", result);
  console.log("Done!");
}

flushAll();
