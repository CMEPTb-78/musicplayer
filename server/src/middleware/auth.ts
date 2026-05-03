import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export type AuthTokenPayload = { sub: number; email: string };

declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

const secret = process.env.JWT_SECRET ?? "dev-secret";

export function signToken(payload: AuthTokenPayload): string {
  return jwt.sign({ sub: payload.sub, email: payload.email }, secret, { expiresIn: "7d" });
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) {
    res.status(401).json({ error: "Требуется авторизация" });
    return;
  }
  try {
    const decoded = jwt.verify(token, secret) as unknown as AuthTokenPayload;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Недействительный токен" });
  }
}
