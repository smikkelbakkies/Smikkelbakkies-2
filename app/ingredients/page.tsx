import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { IngredientsManager } from "@/features/ingredients/ingredients-manager";
import { listIngredientCategories, listIngredients } from "@/services/ingredients.service";
import { listSuppliers } from "@/services/suppliers.service";

export default async function IngredientsPage() {
  const [ingredients, categories, suppliers] = await Promise.all([
    listIngredients(),
    listIngredientCategories(),
    listSuppliers()
  ]);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Inkoopdata"
        title="Ingredienten"
        description="Beheer ingredientprijzen, verpakkingsinhoud, basiseenheden en leveranciers. Dit wordt de bron voor recepten, food cost en marges."
      />
      <IngredientsManager initialIngredients={ingredients} categories={categories} suppliers={suppliers} />
    </AppShell>
  );
}
