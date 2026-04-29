import { Router } from "express";
import { prisma } from "../prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/require-auth.js";

export const contactsRouter = Router();

contactsRouter.use(requireAuth);

contactsRouter.get("/", async (req: AuthedRequest, res) => {
  const contacts = await prisma.contact.findMany({
    where: { userId: req.user!.id },
    orderBy: { name: "asc" },
  });
  res.json({ contacts });
});
