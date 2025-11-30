import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

// Fail fast if JWT_SECRET is not configured in production
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable is required in production');
}

const EFFECTIVE_SECRET = JWT_SECRET || 'dev-only-secret-do-not-use-in-production';

export interface AuthRequest extends Request {
  userId?: number;
}

export function generateToken(userId: number): string {
  return jwt.sign({ userId }, EFFECTIVE_SECRET, { expiresIn: '30d' });
}

export function verifyToken(token: string): { userId: number } | null {
  try {
    return jwt.verify(token, EFFECTIVE_SECRET) as { userId: number };
  } catch {
    return null;
  }
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  
  req.userId = decoded.userId;
  next();
}
