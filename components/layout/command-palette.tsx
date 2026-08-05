"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import { Building2, Calculator, Calendar, ChefHat, Home, PackageSearch, Settings, Store, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";

const commands = [
  { label: "Ga naar dashboard", href: "/", icon: Home },
  { label: "Catering Calculator openen", href: "/events", icon: Calculator },
  { label: "Festival Rekenmodule openen", href: "/events/festival", icon: Store },
  { label: "Event Planningskalender openen", href: "/events/planner", icon: Calendar },
  { label: "Burgers & Recepten beheren", href: "/recipes", icon: ChefHat },
  { label: "Ingrediënten & Inkoop beheren", href: "/ingredients", icon: PackageSearch },
  { label: "Leveranciers beheren", href: "/suppliers", icon: Building2 },
  { label: "Analyses & Marges bekijken", href: "/analytics", icon: TrendingUp },
  { label: "Instellingen openen", href: "/settings", icon: Settings }
];

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-24 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border bg-card shadow-premium">
          <Command className="bg-transparent">
            <Command.Input
              className="h-14 w-full border-b bg-transparent px-4 text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Zoek pagina's, acties of instellingen..."
            />
            <Command.List className="max-h-80 overflow-y-auto p-2">
              <Command.Empty className="px-3 py-8 text-center text-sm text-muted-foreground">Geen resultaten gevonden.</Command.Empty>
              <Command.Group heading="Navigatie" className="text-xs text-muted-foreground">
                {commands.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Command.Item
                      key={item.href}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground aria-selected:bg-muted"
                      onSelect={() => {
                        router.push(item.href);
                        onOpenChange(false);
                      }}
                    >
                      <Icon className="h-4 w-4 text-gold" />
                      {item.label}
                    </Command.Item>
                  );
                })}
              </Command.Group>
            </Command.List>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
