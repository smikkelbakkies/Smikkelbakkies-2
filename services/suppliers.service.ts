import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import { suppliers as mockSuppliers } from "@/services/mock-data";
import type { Supplier } from "@/types/core";

let localSuppliers = [...mockSuppliers];

function getLocalStorageSuppliers(): Supplier[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("smikkel_suppliers");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalStorageSuppliers(items: Supplier[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("smikkel_suppliers", JSON.stringify(items));
  } catch {
    // ignore
  }
}

export async function listSuppliers(): Promise<Supplier[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .is("deleted_at", null)
      .order("name");

    if (!error && data && data.length > 0) {
      const parsed: Supplier[] = data.map((item) => ({
        id: item.id,
        name: item.name,
        address: item.address ?? "",
        phone: item.phone ?? "",
        email: item.email ?? "",
        website: item.website ?? "",
        vatNumber: item.vat_number ?? "",
        chamberOfCommerceNumber: item.chamber_of_commerce_number ?? "",
        notes: item.notes ?? "",
        isActive: item.is_active,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        deletedAt: item.deleted_at
      }));

      setLocalStorageSuppliers(parsed);
      return parsed;
    }
  }

  const stored = getLocalStorageSuppliers();
  if (stored.length > 0) {
    return stored.sort((a, b) => a.name.localeCompare(b.name));
  }

  return mockSuppliers;
}

export async function saveSupplierToDb(supplier: Supplier): Promise<Supplier> {
  const timestamp = new Date().toISOString();
  const nextSupplier: Supplier = {
    ...supplier,
    updatedAt: timestamp
  };

  const stored = getLocalStorageSuppliers();
  const existingIndex = stored.findIndex((s) => s.id === nextSupplier.id);
  let updatedLocal: Supplier[];
  if (existingIndex !== -1) {
    updatedLocal = [...stored];
    updatedLocal[existingIndex] = nextSupplier;
  } else {
    updatedLocal = [nextSupplier, ...stored];
  }
  setLocalStorageSuppliers(updatedLocal);

  if (isSupabaseConfigured && supabase) {
    await supabase.from("suppliers").upsert({
      id: nextSupplier.id,
      name: nextSupplier.name,
      address: nextSupplier.address,
      phone: nextSupplier.phone,
      email: nextSupplier.email,
      website: nextSupplier.website,
      vat_number: nextSupplier.vatNumber,
      chamber_of_commerce_number: nextSupplier.chamberOfCommerceNumber,
      notes: nextSupplier.notes,
      is_active: nextSupplier.isActive,
      updated_at: timestamp
    });
  }

  return nextSupplier;
}

export async function deleteSupplierFromDb(supplierId: string): Promise<void> {
  const stored = getLocalStorageSuppliers();
  const filtered = stored.filter((s) => s.id !== supplierId);
  setLocalStorageSuppliers(filtered);

  if (isSupabaseConfigured && supabase) {
    await supabase
      .from("suppliers")
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq("id", supplierId);
  }
}
