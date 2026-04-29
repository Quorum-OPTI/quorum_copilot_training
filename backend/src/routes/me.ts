import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/require-auth.js";

export const meRouter = Router();

meRouter.get("/", requireAuth, (req: AuthedRequest, res) => {
  res.json({ user: req.user });
});
