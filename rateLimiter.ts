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

/**
 * Creates an isolated rate limiting middleware instance
 * 
 * @param windowMs The time window in milliseconds (e.g. 1 minute = 60000ms)
 * @param maxLimit Maximum requests allowed inside that window
 * @param message Custom message returned on block
 */
export function createRateLimiter(
  windowMs: number = 60 * 1000, 
  maxLimit: number = 60, 
  message: string = 'Too many requests. Please slow down and try again later.'
) {
  const store: RateLimitStore = {};

  // Clean up isolated memory store every 15 minutes
  const interval = setInterval(() => {
    const now = Date.now();
    const cutoff = now - windowMs * 2;
    for (const ip in store) {
      store[ip].timestamps = store[ip].timestamps.filter(t => t > cutoff);
      if (store[ip].timestamps.length === 0) {
        delete store[ip];
      }
    }
  }, 15 * 60 * 1000);

  if (interval.unref) {
    interval.unref();
  }

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = (req.headers['cf-connecting-ip'] as string) || 
               (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || 
               req.ip ||
               req.socket.remoteAddress || 
               'unknown-ip';

    const now = Date.now();

    if (!store[ip]) {
      store[ip] = { timestamps: [] };
    }

    // Filter out timestamps outside current sliding window
    store[ip].timestamps = store[ip].timestamps.filter(t => now - t < windowMs);

    res.setHeader('X-RateLimit-Limit', maxLimit);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxLimit - store[ip].timestamps.length - 1));
    res.setHeader('X-RateLimit-Reset', new Date(now + windowMs).toISOString());

    if (store[ip].timestamps.length >= maxLimit) {
      console.warn(`[RateLimiter] Limit exceeded (${store[ip].timestamps.length}/${maxLimit}) for IP: ${ip} on path: ${req.path}`);
      res.status(429).json({
        error: message,
        retryAfterMs: windowMs
      });
      return;
    }

    store[ip].timestamps.push(now);
    next();
  };
}

// Instantiate dedicated rate limiters with isolated stores
const devAuthLimiter = createRateLimiter(
  60 * 1000, 
  15, 
  'Too many auth attempts. Please wait 1 minute before trying again.'
);

const prodAuthLimiter = createRateLimiter(
  60 * 1000, 
  10, 
  'Too many login or registration attempts. Please wait 1 minute before trying again.'
);

const devApiLimiter = createRateLimiter(
  60 * 1000, 
  1000, 
  'API limit exceeded. Please slow down.'
);

const prodApiLimiter = createRateLimiter(
  60 * 1000, 
  300, 
  'Standard API rate limit exceeded. Please try again shortly.'
);

/**
 * Specifically hardened limiter for sensitive auth endpoints (Login, Register, OTP validation)
 */
export const authRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const isProd = process.env.NODE_ENV === 'production';
  const host = req.headers.host || '';
  const isDevOrPreview = !isProd || 
    host.includes('ais-dev-') || 
    host.includes('ais-pre-') || 
    host.includes('localhost') || 
    host.includes('127.0.0.1');

  if (isDevOrPreview) {
    return devAuthLimiter(req, res, next);
  }
  return prodAuthLimiter(req, res, next);
};

/**
 * General global route api limiter
 */
export const apiRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const isProd = process.env.NODE_ENV === 'production';
  const host = req.headers.host || '';
  const isDevOrPreview = !isProd || 
    host.includes('ais-dev-') || 
    host.includes('ais-pre-') || 
    host.includes('localhost') || 
    host.includes('127.0.0.1');

  if (isDevOrPreview) {
    return devApiLimiter(req, res, next);
  }
  return prodApiLimiter(req, res, next);
};
