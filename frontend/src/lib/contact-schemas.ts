import { z } from "zod";

const optionalString = z
  .string()
  .transform((v) => (v === "" ? undefined : v))
  .optional();

const optionalEmail = z
  .union([z.literal(""), z.string().email("Must be a valid email")])
  .optional()
  .transform((v) => (v === "" ? undefined : v));

export const createContactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: optionalEmail,
  phone: optionalString,
});

export const updateContactSchema = createContactSchema.partial();

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;

// Shape returned by the API — matches backend's Contact prisma model.
export interface Contact {
  id: string;
  userId: string;
  name: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
}
