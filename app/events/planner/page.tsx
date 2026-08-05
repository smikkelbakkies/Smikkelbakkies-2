import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { EventPlanner } from "@/features/events/event-planner";

export default function EventPlannerPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="VOF Planning & Status"
        title="Event Planningskalender"
        description="Overzicht van alle opgeslagen catering events, statusopvolging (van offerte tot gefactureerd) en geprojecteerde winst per vennoot."
      />
      <EventPlanner />
    </AppShell>
  );
}
