import { z } from "zod";

// Optional string that accepts "" as "not provided" — forms often submit "" for empty optional fields.
const optionalString = z
  .string()
  .transform((v) => (v === "" ? undefined : v))
  .optional();

const optionalEmail = z
  .string()
  .transform((v) => (v === "" ? undefined : v))
  .optional()
  .refine((v) => v === undefined || z.string().email().safeParse(v).success, {
    message: "Must be a valid email",
  });

export const createContactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: optionalEmail,
  phone: optionalString,
});

export const updateContactSchema = createContactSchema.partial();

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
