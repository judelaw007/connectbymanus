import rateLimit from "express-rate-limit";
import type { Request, Response, NextFunction } from "express";

/**
 * Rate limiters for different endpoint categories.
 *
 * tRPC routes arrive as POST /api/trpc/<procedure> for mutations
 * and GET /api/trpc/<procedure> for queries. We match on the URL
 * to apply per-category limits.
 */

// Auth endpoints: strict limits to prevent brute-force
// 10 requests per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: "Too many authentication attempts. Please try again in 15 minutes.",
  },
  keyGenerator: req => req.ip || req.socket.remoteAddress || "unknown",
});

// Message sending: moderate limits to prevent spam
// 60 messages per minute per IP
const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: "You are sending messages too quickly. Please slow down.",
  },
  keyGenerator: req => req.ip || req.socket.remoteAddress || "unknown",
});

// Support ticket creation: prevent ticket spam
// 5 tickets per 15 minutes per IP
const supportCreateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: "Too many support tickets. Please wait before creating another.",
  },
  keyGenerator: req => req.ip || req.socket.remoteAddress || "unknown",
});

// Content creation: prevent spam of posts, groups, channel joins
// 10 creations per 15 minutes per IP
const contentCreateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error:
      "You are creating content too quickly. Please wait before trying again.",
  },
  keyGenerator: req => req.ip || req.socket.remoteAddress || "unknown",
});

// General API limiter: broad protection for all endpoints
// 200 requests per minute per IP
const generalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 200,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: "Too many requests. Please try again shortly.",
  },
  keyGenerator: req => req.ip || req.socket.remoteAddress || "unknown",
});

// tRPC procedure names that each limiter targets
const AUTH_PROCEDURES = [
  "memberAuth.requestCode",
  "memberAuth.verifyCode",
  "auth.adminLogin",
];

const MESSAGE_PROCEDURES = ["messages.send"];

const SUPPORT_CREATE_PROCEDURES = ["support.create"];

const CONTENT_CREATE_PROCEDURES = [
  "posts.create",
  "studyGroups.create",
  "studyGroups.join",
];

/**
 * Extract the tRPC procedure name from the request URL.
 * tRPC routes look like: /api/trpc/messages.send or /api/trpc/auth.adminLogin
 */
function getTrpcProcedure(req: Request): string | null {
  const url = req.originalUrl || req.url;
  const match = url.match(/\/api\/trpc\/([^?]+)/);
  return match ? match[1] : null;
}

/**
 * Middleware that routes requests to the appropriate rate limiter
 * based on the tRPC procedure being called.
 */
export function trpcRateLimiter(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const procedure = getTrpcProcedure(req);
  if (!procedure) {
    return next();
  }

  if (AUTH_PROCEDURES.includes(procedure)) {
    return authLimiter(req, res, next);
  }

  if (MESSAGE_PROCEDURES.includes(procedure)) {
    return messageLimiter(req, res, next);
  }

  if (SUPPORT_CREATE_PROCEDURES.includes(procedure)) {
    return supportCreateLimiter(req, res, next);
  }

  if (CONTENT_CREATE_PROCEDURES.includes(procedure)) {
    return contentCreateLimiter(req, res, next);
  }

  // All other API calls get general limiting
  return generalApiLimiter(req, res, next);
}
