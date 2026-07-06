/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-super-secure-jwt-secret-string-2026';

export interface DecodedToken {
  id: string;
  email: string;
  name: string;
  role: string;
  businessId?: string;
}

export interface ProtectedRequest extends Request {
  user?: DecodedToken;
}

/**
 * Middleware to verify a JSON Web Token (JWT) on incoming requests.
 * Parses standard Authorization Bearer header.
 */
export function verifyJWT(req: ProtectedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Extract from "Bearer <Token>"

  if (!token) {
    res.status(401).json({ error: 'Access Denied: No authentication token provided.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
    req.user = decoded;
    next();
  } catch (error) {
    console.error(`[AuthMiddleware] Token validation failed:`, error);
    res.status(403).json({ error: 'Access Denied: The security token has expired or is invalid.' });
  }
}

/**
 * Role-Based Access Control (RBAC) authorization middleware
 * 
 * Ensures the authenticated user possesses one of the specified operational roles.
 */
export function requireRoles(allowedRoles: string[]) {
  return (req: ProtectedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized: User authentication record not loaded.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      console.warn(`[AuthMiddleware] Forbidden access attempt by ${req.user.email} (Role: ${req.user.role}) on restricted resource.`);
      res.status(403).json({ error: 'Forbidden: Your security tier does not grant access to this resource.' });
      return;
    }

    next();
  };
}
