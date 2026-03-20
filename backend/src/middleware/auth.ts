import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { AuthRequest, AuthUser } from '../types/index.js';

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: '未授权', code: 'NO_TOKEN' });
    return;
  }

  const token = authHeader.slice(7);

  if (!token) {
    res.status(401).json({ error: '未授权', code: 'NO_TOKEN' });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AuthUser & { iat?: number; exp?: number };
    req.user = { id: decoded.id, username: decoded.username };
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: '未授权', code: 'TOKEN_EXPIRED' });
    } else {
      res.status(401).json({ error: '未授权', code: 'INVALID_TOKEN' });
    }
  }
}
