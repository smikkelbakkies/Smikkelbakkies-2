import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { SuppliersManager } from "@/features/suppliers/suppliers-manager";
import { listSuppliers } from "@/services/suppliers.service";

export default async function SuppliersPage() {
  const suppliers = await listSuppliers();

  return (
    <AppShell>
      <PageHeader
        eyebrow="Inkoopnetwerk"
        title="Leveranciers"
        description="Beheer leveranciersgegevens centraal. Het datamodel is voorbereid om later meerdere leveranciers per ingredient te koppelen."
      />
      <SuppliersManager initialSuppliers={suppliers} />
    </AppShell>
  );
}
