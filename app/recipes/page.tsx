import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { RecipesManager } from "@/features/recipes/recipes-manager";

export default function RecipesPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Receptuur & Producten"
        title="Burgers & Recepten"
        description="Stel je eigen burgers samen en beheer recepten. Kostprijzen en adviesverkoopprijzen rekenen automatisch door op basis van ingrediëntprijzen en doelmarges."
      />
      <RecipesManager />
    </AppShell>
  );
}
