import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { EventCalculator } from "@/features/events/event-calculator";

export default function EventsPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Catering & Foodtruck"
        title="Event & Pakket Calculator"
        description="Bereken offerteprijzen, pakketmarges, directe kosten en exact wat jullie als 2 vennoten per uur overhouden aan een klus."
      />
      <EventCalculator />
    </AppShell>
  );
}
