import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 premium-grid">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold text-background">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="mt-6 text-2xl font-semibold">Inloggen</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Supabase Auth is voorbereid. Zodra de Supabase keys zijn ingesteld, kan deze pagina echte sessies beheren.</p>
          <form className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm font-medium text-muted-foreground">Email<Input type="email" placeholder="info@smikkelbakkies.nl" /></label>
            <label className="grid gap-2 text-sm font-medium text-muted-foreground">Wachtwoord<Input type="password" placeholder="••••••••" /></label>
            <Button type="button">Demo openen</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
