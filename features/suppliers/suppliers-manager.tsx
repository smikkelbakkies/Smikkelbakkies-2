"use client";

import { Edit3, ExternalLink, Mail, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import type { Supplier } from "@/types/core";

import { deleteSupplierFromDb, saveSupplierToDb } from "@/services/suppliers.service";

type SupplierForm = Omit<Supplier, "createdAt" | "updatedAt" | "deletedAt">;

export function SuppliersManager({ initialSuppliers }: { initialSuppliers: Supplier[] }) {
  const [items, setItems] = useState(initialSuppliers);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState("");
  const { notify } = useToast();

  const filtered = useMemo(() => {
    return items
      .filter((item) => item.deletedAt === null)
      .filter((item) => [item.name, item.email, item.phone, item.address].join(" ").toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items, query]);

  const saveSupplier = async (form: SupplierForm) => {
    const duplicate = items.some((item) => item.id !== editing?.id && item.deletedAt === null && item.name.trim().toLowerCase() === form.name.trim().toLowerCase());
    if (duplicate) {
      setError("Er bestaat al een leverancier met deze naam.");
      return;
    }

    const timestamp = new Date().toISOString();
    const next: Supplier = {
      ...form,
      createdAt: editing?.createdAt ?? timestamp,
      updatedAt: timestamp,
      deletedAt: null
    };

    const saved = await saveSupplierToDb(next);
    setItems((current) => editing ? current.map((item) => item.id === editing.id ? saved : item) : [saved, ...current]);
    setFormOpen(false);
    notify({ title: editing ? "Leverancier bijgewerkt in Database" : "Leverancier opgeslagen in Database" });
  };

  const removeSupplier = async (supplier: Supplier) => {
    if (!window.confirm(`Leverancier "${supplier.name}" verwijderen?`)) return;
    await deleteSupplierFromDb(supplier.id);
    setItems((current) => current.map((item) => item.id === supplier.id ? { ...item, deletedAt: new Date().toISOString(), isActive: false } : item));
    notify({ title: "Leverancier verwijderd uit Database" });
  };

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative max-w-xl flex-1">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Zoek leverancier..." />
        </div>
        <Button onClick={() => { setEditing(null); setError(""); setFormOpen(true); }}><Plus className="h-4 w-4" />Leverancier toevoegen</Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {filtered.map((supplier) => (
          <Card key={supplier.id} className="transition hover:-translate-y-0.5">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{supplier.name}</h3>
                    <Badge tone={supplier.isActive ? "success" : "neutral"}>{supplier.isActive ? "Actief" : "Inactief"}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{supplier.address || "Geen adres ingevuld"}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(supplier); setError(""); setFormOpen(true); }} aria-label="Bewerken">
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => removeSupplier(supplier)} aria-label="Verwijderen">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="mt-5 grid gap-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-2"><Mail className="h-4 w-4" />{supplier.email || "Geen email"}</span>
                <span>{supplier.phone || "Geen telefoonnummer"}</span>
                {supplier.website ? <a className="flex items-center gap-2 text-gold hover:underline" href={supplier.website} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />Website openen</a> : null}
              </div>
              <div className="mt-5 rounded-lg border bg-muted/35 p-3 text-sm text-muted-foreground">{supplier.notes || "Geen notities"}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen} title={editing ? "Leverancier bewerken" : "Nieuwe leverancier"} description="Contact- en bedrijfsgegevens voor inkoopbeheer.">
        <SupplierForm supplier={editing} error={error} onSubmit={saveSupplier} />
      </Dialog>
    </>
  );
}

function SupplierForm({ supplier, error, onSubmit }: { supplier: Supplier | null; error: string; onSubmit: (form: SupplierForm) => void }) {
  const [form, setForm] = useState<SupplierForm>(() => ({
    id: supplier?.id ?? crypto.randomUUID(),
    name: supplier?.name ?? "",
    address: supplier?.address ?? "",
    phone: supplier?.phone ?? "",
    email: supplier?.email ?? "",
    website: supplier?.website ?? "",
    vatNumber: supplier?.vatNumber ?? "",
    chamberOfCommerceNumber: supplier?.chamberOfCommerceNumber ?? "",
    notes: supplier?.notes ?? "",
    isActive: supplier?.isActive ?? true
  }));

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(form);
      }}
    >
      {error ? <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Naam"><Input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
        <Field label="Telefoon"><Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
        <Field label="Email"><Input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
        <Field label="Website"><Input value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} /></Field>
        <Field label="BTW nummer"><Input value={form.vatNumber} onChange={(event) => setForm({ ...form, vatNumber: event.target.value })} /></Field>
        <Field label="KVK"><Input value={form.chamberOfCommerceNumber} onChange={(event) => setForm({ ...form, chamberOfCommerceNumber: event.target.value })} /></Field>
        <Field label="Adres"><Input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></Field>
        <Field label="Notities"><Input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
      </div>
      <div className="flex justify-end">
        <Button type="submit"><Plus className="h-4 w-4" />Opslaan</Button>
      </div>
    </form>
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
