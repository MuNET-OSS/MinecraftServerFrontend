import { Request } from 'express';

export interface AuthUser {
  id: number;
  username: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}
