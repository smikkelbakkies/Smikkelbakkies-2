import { z } from "zod";

export const ingredientSchema = z.object({
  name: z.string().trim().min(2, "Naam is verplicht"),
  categoryId: z.string().uuid("Kies een categorie"),
  primarySupplierId: z.string().uuid().nullable(),
  baseUnit: z.enum(["stuk", "gram", "kg", "ml", "liter", "portie"]),
  purchaseUnit: z.string().trim().min(1, "Inkoopeenheid is verplicht"),
  packageContent: z.coerce.number().positive("Inhoud verpakking moet groter zijn dan 0"),
  purchasePrice: z.coerce.number().min(0, "Inkoopprijs mag niet negatief zijn"),
  isActive: z.boolean()
});

export type IngredientFormInput = z.infer<typeof ingredientSchema>;
