import { CheckCircle2, Database, KeyRound, Moon, Target } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { isSupabaseConfigured } from "@/lib/supabase/client";

const settings = [
  { label: "Product brutomarge", value: "70%", icon: Target },
  { label: "Gezonde eventmarge", value: "30-45%", icon: CheckCircle2 },
  { label: "Thema", value: "Dark premium", icon: Moon },
  { label: "Supabase", value: isSupabaseConfigured ? "Verbonden" : "Mock mode", icon: Database }
];

export default function SettingsPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Configuratie"
        title="Instellingen"
        description="Centrale plek voor bedrijfsgegevens, standaardmarges, auth-status en technische configuratie."
      />

      <div className="grid gap-4 lg:grid-cols-[.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <h3 className="font-semibold">Bedrijfsprofiel</h3>
            <p className="mt-1 text-sm text-muted-foreground">Deze gegevens worden later gebruikt voor offertes en rapportages.</p>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Field label="Bedrijfsnaam"><Input defaultValue="Smikkelbakkies" /></Field>
            <Field label="Eigenaar"><Input placeholder="Naam eigenaar" /></Field>
            <Field label="Email"><Input placeholder="info@smikkelbakkies.nl" /></Field>
            <Field label="Standaard doelwinst per uur"><Input defaultValue="€ 55" /></Field>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {settings.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.label}>
                  <CardContent className="p-5">
                    <Icon className="h-5 w-5 text-gold" />
                    <div className="mt-4 text-sm text-muted-foreground">{item.label}</div>
                    <div className="mt-1 text-xl font-semibold">{item.value}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold">Authenticatie</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Supabase Auth is voorbereid. Voeg environment variables toe om live auth te activeren.</p>
                </div>
                <Badge tone={isSupabaseConfigured ? "success" : "warning"}>{isSupabaseConfigured ? "Live" : "Mock"}</Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-muted-foreground">
              <div className="flex gap-3 rounded-lg border bg-muted/35 p-3"><KeyRound className="h-4 w-4 text-gold" />NEXT_PUBLIC_SUPABASE_URL</div>
              <div className="flex gap-3 rounded-lg border bg-muted/35 p-3"><KeyRound className="h-4 w-4 text-gold" />NEXT_PUBLIC_SUPABASE_ANON_KEY</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-muted-foreground">
      {label}
      {children}
    </label>
  );
}
