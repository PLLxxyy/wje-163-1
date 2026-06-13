import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from './types';

const JWT_SECRET = process.env.JWT_SECRET || 'recycling-station-secret-key-2026';

export function generateToken(userId: number, role: string): string {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '7d' });
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: '未登录' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number; role: string };
    req.userId = payload.userId;
    req.userRole = payload.role;
    next();
  } catch {
    res.status(401).json({ error: '登录已过期' });
  }
}

export function adminOnly(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.userRole !== 'admin') {
    res.status(403).json({ error: '无权限' });
    return;
  }
  next();
}

export function recyclerOnly(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.userRole !== 'recycler' && req.userRole !== 'admin') {
    res.status(403).json({ error: '仅回收员可操作' });
    return;
  }
  next();
}
