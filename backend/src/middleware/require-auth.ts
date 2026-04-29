import type { NextFunction, Request, Response } from "express";
import { auth } from "../auth.js";

export interface AuthedRequest extends Request {
  user?: { id: string; email: string; name: string };
  sessionId?: string;
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const session = await auth.api.getSession({
    headers: new Headers(req.headers as Record<string, string>),
  });

  if (!session?.user) {
    res.status(401).json({ error: "unauthenticated" });
    return;
  }

  req.user = {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  };
  req.sessionId = session.session.id;
  next();
}
