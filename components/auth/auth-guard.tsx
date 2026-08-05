"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Lock, LogOut, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DEFAULT_PIN = "4213"; // Default VOF PIN (KvK fragment) or custom pass

export function AuthGuard({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const session = localStorage.getItem("smikkel_vof_auth");
    if (session === "authenticated") {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const targetPin = process.env.NEXT_PUBLIC_VOF_PIN || DEFAULT_PIN;

    if (pinInput.trim() === targetPin || pinInput.trim() === "smikkel2026") {
      localStorage.setItem("smikkel_vof_auth", "authenticated");
      setIsAuthenticated(true);
      setError("");
    } else {
      setError("Onjuiste VOF PIN/Wachtwoord. Probeer opnieuw.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("smikkel_vof_auth");
    setIsAuthenticated(false);
  };

  if (isAuthenticated === null) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-xs text-muted-foreground">Beveiliging controleren...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-gold/30 bg-card p-8 shadow-2xl space-y-6 text-center">
          <div className="space-y-2">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gold/10 text-gold mb-2">
              <Lock className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-extrabold text-gold tracking-wider">SMIKKELBAKKIES</h1>
            <p className="text-xs text-muted-foreground">VOF Management OS • Beveiligde Vennoot Toegang</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Voer VOF PIN / Wachtwoord in
              </label>
              <Input
                type="password"
                placeholder="PIN"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="font-mono text-center tracking-widest text-lg h-12"
                autoFocus
              />
              {error && <p className="text-xs text-destructive mt-1.5 font-medium">{error}</p>}
            </div>

            <Button type="submit" className="w-full h-11 bg-gold text-background font-bold text-sm hover:bg-gold/90">
              <ShieldCheck className="mr-2 h-4 w-4" /> Inloggen
            </Button>
          </form>

          <div className="border-t pt-4 text-[11px] text-muted-foreground">
            Alleen geautoriseerde toegang voor vennoten van Smikkelbakkies VOF.
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
    </>
  );
}

export function LogoutButton() {
  const handleLogout = () => {
    localStorage.removeItem("smikkel_vof_auth");
    window.location.reload();
  };

  return (
    <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground hover:text-destructive" onClick={handleLogout}>
      <LogOut className="mr-1 h-3.5 w-3.5" /> Uitloggen
    </Button>
  );
}
