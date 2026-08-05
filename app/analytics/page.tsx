import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { AnalyticsDashboard } from "@/features/analytics/analytics-dashboard";

export default function AnalyticsPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Rendement & Rapportage"
        title="Analyses & Marges"
        description="Visueel overzicht van kostprijzen vs brutowinst per burger en uurverdienste-simulaties voor de 2 vennoten."
      />
      <AnalyticsDashboard />
    </AppShell>
  );
}
