import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Rate Limiting Middleware Function
 * Implements rate limiting to prevent API abuse
 * Default: 100 requests per minute per user
 */

// In-memory store for rate limiting (in production, use Redis or similar)
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 100;

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now - data.windowStart > RATE_LIMIT_WINDOW * 2) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

function checkRateLimit(identifier) {
  const now = Date.now();
  const userLimit = rateLimitStore.get(identifier);

  if (!userLimit) {
    rateLimitStore.set(identifier, {
      count: 1,
      windowStart: now
    });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1 };
  }

  const timeSinceWindowStart = now - userLimit.windowStart;

  // Reset window if expired
  if (timeSinceWindowStart > RATE_LIMIT_WINDOW) {
    rateLimitStore.set(identifier, {
      count: 1,
      windowStart: now
    });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1 };
  }

  // Check if limit exceeded
  if (userLimit.count >= MAX_REQUESTS_PER_WINDOW) {
    const resetTime = Math.ceil((RATE_LIMIT_WINDOW - timeSinceWindowStart) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetIn: resetTime
    };
  }

  // Increment count
  userLimit.count++;
  return {
    allowed: true,
    remaining: MAX_REQUESTS_PER_WINDOW - userLimit.count
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get user for rate limiting
    const user = await base44.auth.me();
    if (!user) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check rate limit
    const rateLimit = checkRateLimit(user.email);

    if (!rateLimit.allowed) {
      return Response.json(
        {
          error: 'Rate limit exceeded',
          message: `Too many requests. Please try again in ${rateLimit.resetIn} seconds.`,
          resetIn: rateLimit.resetIn
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimit.resetIn.toString(),
            'X-RateLimit-Limit': MAX_REQUESTS_PER_WINDOW.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(Date.now() + rateLimit.resetIn * 1000).toISOString()
          }
        }
      );
    }

    // Return rate limit status
    return Response.json(
      {
        success: true,
        rateLimit: {
          limit: MAX_REQUESTS_PER_WINDOW,
          remaining: rateLimit.remaining,
          window: RATE_LIMIT_WINDOW / 1000
        }
      },
      {
        headers: {
          'X-RateLimit-Limit': MAX_REQUESTS_PER_WINDOW.toString(),
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Window': (RATE_LIMIT_WINDOW / 1000).toString()
        }
      }
    );
  } catch (error) {
    console.error('Rate limiter error:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});