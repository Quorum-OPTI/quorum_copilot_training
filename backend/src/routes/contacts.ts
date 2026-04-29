import { Router } from "express";
import { prisma } from "../prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/require-auth.js";
import { createContactSchema, updateContactSchema } from "../lib/contact-schemas.js";

export const contactsRouter = Router();

contactsRouter.use(requireAuth);

contactsRouter.get("/", async (req: AuthedRequest, res) => {
  const contacts = await prisma.contact.findMany({
    where: { userId: req.user!.id },
    orderBy: { name: "asc" },
  });
  res.json({ contacts });
});

contactsRouter.post("/", async (req: AuthedRequest, res) => {
  const parsed = createContactSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", issues: parsed.error.issues });
    return;
  }
  const contact = await prisma.contact.create({
    data: {
      userId: req.user!.id,
      name: parsed.data.name,
      email: parsed.data.email ?? null,
      phone: parsed.data.phone ?? null,
    },
  });
  res.status(201).json({ contact });
});

contactsRouter.get("/:id", async (req: AuthedRequest, res) => {
  const contact = await prisma.contact.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!contact) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  res.json({ contact });
});

contactsRouter.patch("/:id", async (req: AuthedRequest, res) => {
  const parsed = updateContactSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", issues: parsed.error.issues });
    return;
  }
  const result = await prisma.contact.updateMany({
    where: { id: req.params.id, userId: req.user!.id },
    data: {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.email !== undefined && { email: parsed.data.email ?? null }),
      ...(parsed.data.phone !== undefined && { phone: parsed.data.phone ?? null }),
    },
  });
  if (result.count === 0) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  const contact = await prisma.contact.findUnique({ where: { id: req.params.id } });
  res.json({ contact });
});

contactsRouter.delete("/:id", async (req: AuthedRequest, res) => {
  const result = await prisma.contact.deleteMany({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (result.count === 0) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  res.status(204).end();
});
