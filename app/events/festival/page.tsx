import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { FestivalCalculator } from "@/features/events/festival-calculator";

export default function FestivalPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Openbare Events & Kassa"
        title="Festival Rekenmodule"
        description="Bereken de winstgevendheid, break-even verkooppunt, standgeld-afdrachten en baksnelheid per vennoot op feesten en festivals met vrije verkoop."
      />
      <FestivalCalculator />
    </AppShell>
  );
}
