import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// 10 analysis requests per IP per hour (sliding window)
export const analysisRateLimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, "1h"),
    analytics: true,
    prefix: "paperlens:ratelimit",
});
