import { z } from "zod";

export const supplierSchema = z.object({
  name: z.string().trim().min(2, "Naam is verplicht"),
  address: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().email("Geen geldig emailadres").or(z.literal("")),
  website: z.string().trim().url("Geen geldige website").or(z.literal("")),
  vatNumber: z.string().trim().optional(),
  chamberOfCommerceNumber: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  isActive: z.boolean()
});

export type SupplierFormInput = z.infer<typeof supplierSchema>;
