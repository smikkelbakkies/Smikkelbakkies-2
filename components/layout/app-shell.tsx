"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Building2, Calculator, Calendar, ChefHat, Command, Home, Menu, Moon, PackageSearch, Settings, Sparkles, Store, TrendingUp, X } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { CommandPalette } from "@/components/layout/command-palette";
import { ToastProvider } from "@/components/ui/toast";
import { AuthGuard, LogoutButton } from "@/components/auth/auth-guard";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/events", label: "Catering Calculator", icon: Calculator },
  { href: "/events/festival", label: "Festival Rekenmodule", icon: Store },
  { href: "/events/planner", label: "Event Planningskalender", icon: Calendar },
  { href: "/recipes", label: "Burgers & Recepten", icon: ChefHat },
  { href: "/ingredients", label: "Ingrediënten & Inkoop", icon: PackageSearch },
  { href: "/suppliers", label: "Leveranciers", icon: Building2 },
  { href: "/analytics", label: "Analyses & Marges", icon: TrendingUp },
  { href: "/settings", label: "Instellingen", icon: Settings }
];

const pageLabels: Record<string, string> = {
  "/": "Dashboard",
  "/events": "Catering Calculator",
  "/events/festival": "Festival Rekenmodule",
  "/events/planner": "Event Planningskalender",
  "/recipes": "Burgers & Recepten",
  "/ingredients": "Ingrediënten & Inkoop",
  "/suppliers": "Leveranciers",
  "/analytics": "Analyses & Marges",
  "/settings": "Instellingen"
};

import { APP_VERSION } from "@/lib/version";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [dark, setDark] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const currentPage = useMemo(() => pageLabels[pathname] ?? "Smikkelbakkies", [pathname]);

  return (
    <AuthGuard>
      <ToastProvider>
        <div className="min-h-screen premium-grid">
          <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
          
          {/* Mobile backdrop */}
          {mobileOpen && (
            <div
              className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
              onClick={() => setMobileOpen(false)}
            />
          )}

          <aside
            className={cn(
              "fixed inset-y-0 left-0 z-30 w-72 border-r bg-background/95 p-4 backdrop-blur-xl transition-transform duration-300 ease-in-out lg:translate-x-0",
              mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
            )}
          >
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 font-bold tracking-wider text-gold" onClick={() => setMobileOpen(false)}>
                <Sparkles className="h-5 w-5" /> SMIKKELBAKKIES
              </Link>
              <Button className="lg:hidden" variant="ghost" size="icon" onClick={() => setMobileOpen(false)} aria-label="Navigatie sluiten">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <nav className="mt-8 grid gap-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition",
                      active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 text-gold" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="absolute bottom-4 left-4 right-4 rounded-xl border bg-card/70 p-4 space-y-1">
              <div className="flex items-center justify-between text-sm font-medium">
                <span className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-gold" /> VOF Smikkelbakkies
                </span>
                <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold border border-gold/30">{APP_VERSION}</span>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">Receptuur, food cost, event rekenmodel & uurverdienste voor 2 vennoten.</p>
            </div>
          </aside>

          <div className="lg:pl-72">
            <header className="sticky top-0 z-20 border-b bg-background/82 backdrop-blur-xl">
              <div className="flex h-16 items-center justify-between gap-4 px-4 lg:px-8">
                <div className="flex items-center gap-3">
                  <Button className="lg:hidden" variant="ghost" size="icon" onClick={() => setMobileOpen(true)} aria-label="Navigatie openen">
                    <Menu className="h-4 w-4" />
                  </Button>
                  <div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Smikkelbakkies / {currentPage}</span>
                      <span className="rounded-md bg-gold/10 px-1.5 py-0.5 text-[10px] font-semibold text-gold border border-gold/20">{APP_VERSION}</span>
                    </div>
                    <h1 className="text-lg font-semibold">{currentPage}</h1>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="secondary" className="hidden min-w-64 justify-start text-muted-foreground md:flex" onClick={() => setCommandOpen(true)}>
                    <Command className="h-4 w-4 text-gold" />
                    Zoek of voer commando uit
                    <kbd className="ml-auto rounded border px-1.5 py-0.5 text-[10px]">Ctrl K</kbd>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDark((value) => !value)} aria-label="Dark mode wisselen">
                    <Moon className="h-4 w-4 text-gold" />
                  </Button>
                  <LogoutButton />
                </div>
              </div>
            </header>

            <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8">{children}</main>
          </div>
        </div>
      </ToastProvider>
    </AuthGuard>
  );
}
