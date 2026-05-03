import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { AuthTokenPayload } from "./auth.js";

const secret = process.env.JWT_SECRET ?? "dev-secret";

export function streamAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const fromHeader = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  const q = req.query.token;
  const fromQuery = typeof q === "string" && q.length > 0 ? q : undefined;
  const token = fromHeader ?? fromQuery;
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
