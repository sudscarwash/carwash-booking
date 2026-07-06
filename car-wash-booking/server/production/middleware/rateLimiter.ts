/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [ip: string]: {
    timestamps: number[];
  };
}

const memoryStore: RateLimitStore = {};

// Clean up memory store every 15 minutes to prevent leak
setInterval(() => {
  const now = Date.now();
  const fifteenMinutesAgo = now - 15 * 60 * 1000;
  for (const ip in memoryStore) {
    memoryStore[ip].timestamps = memoryStore[ip].timestamps.filter(t => t > fifteenMinutesAgo);
    if (memoryStore[ip].timestamps.length === 0) {
      delete memoryStore[ip];
    }
  }
}, 15 * 60 * 1000);

/**
 * Creates a rate limiting middleware
 * 
 * @param windowMs The time window in milliseconds (e.g. 1 minute = 60000ms)
 * @param maxLimit Maximum requests allowed inside that window
 * @param message Custom message returned on block
 */
export function createRateLimiter(
  windowMs: number = 60 * 1000, 
  maxLimit: number = 30, 
  message: string = 'Too many requests. Please slow down and try again later.'
) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Standard cloud forwarding headers (such as Cloudflare CF-Connecting-IP or standard X-Forwarded-For)
    const ip = (req.headers['cf-connecting-ip'] as string) || 
               (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || 
               req.socket.remoteAddress || 
               'unknown-ip';

    const now = Date.now();

    if (!memoryStore[ip]) {
      memoryStore[ip] = { timestamps: [] };
    }

    // Filter out timestamps outside current sliding window
    memoryStore[ip].timestamps = memoryStore[ip].timestamps.filter(t => now - t < windowMs);

    // Header info to let clients know their quotas (helpful for single page apps to throttle clicks)
    res.setHeader('X-RateLimit-Limit', maxLimit);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxLimit - memoryStore[ip].timestamps.length - 1));
    res.setHeader('X-RateLimit-Reset', new Date(now + windowMs).toISOString());

    if (memoryStore[ip].timestamps.length >= maxLimit) {
      console.warn(`[RateLimiter] Rate limit triggered by IP: ${ip} for path: ${req.path}`);
      res.status(429).json({
        error: message,
        retryAfterMs: windowMs
      });
      return;
    }

    // Log the request timestamp
    memoryStore[ip].timestamps.push(now);
    next();
  };
}

/**
 * Specifically hardened limiter for sensitive auth endpoints (Login, Register, OTP validation)
 * 5 attempts per minute max
 */
export const authRateLimiter = createRateLimiter(
  60 * 1000, 
  5, 
  'Too many failed attempts or actions. Security lock triggered. Please try again after 1 minute.'
);

/**
 * General global route api limiter
 */
export const apiRateLimiter = createRateLimiter(
  60 * 1000, 
  60, 
  'Standard API rate limit exceeded. Please throttle your client requests.'
);
