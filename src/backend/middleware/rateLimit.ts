import { Request, Response, NextFunction } from "express";

/**
 * Simple in-memory rate limiter
 * Suitable for single-instance Home Assistant addon
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;

    // Clean up old entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, timestamps] of this.requests.entries()) {
      const validTimestamps = timestamps.filter((t) => now - t < this.windowMs);
      if (validTimestamps.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validTimestamps);
      }
    }
  }

  private getKey(req: Request): string {
    // Use IP address as key
    return req.ip || req.socket.remoteAddress || "unknown";
  }

  check(req: Request): boolean {
    const key = this.getKey(req);
    const now = Date.now();
    const timestamps = this.requests.get(key) || [];

    // Filter out old timestamps
    const validTimestamps = timestamps.filter((t) => now - t < this.windowMs);

    if (validTimestamps.length >= this.maxRequests) {
      return false;
    }

    validTimestamps.push(now);
    this.requests.set(key, validTimestamps);
    return true;
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.check(req)) {
        res.status(429).json({
          error: "Too many requests",
          message: "Please try again later",
        });
        return;
      }
      next();
    };
  }
}

/**
 * Create rate limiter middleware with custom options
 */
export function createRateLimiter(
  windowMs: number = 60000,
  maxRequests: number = 100,
) {
  const limiter = new RateLimiter(windowMs, maxRequests);
  return limiter.middleware();
}
