import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import { suppliers as mockSuppliers } from "@/services/mock-data";
import type { Supplier } from "@/types/core";

let localSuppliers = [...mockSuppliers];

export async function listSuppliers(): Promise<Supplier[]> {
  if (!isSupabaseConfigured || !supabase) {
    return localSuppliers;
  }

  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .is("deleted_at", null)
    .order("name");

  if (error || !data || data.length === 0) {
    if (supabase) {
      for (const s of mockSuppliers) {
        await supabase.from("suppliers").upsert({
          id: s.id,
          name: s.name,
          address: s.address,
          phone: s.phone,
          email: s.email,
          website: s.website,
          vat_number: s.vatNumber,
          chamber_of_commerce_number: s.chamberOfCommerceNumber,
          notes: s.notes,
          is_active: s.isActive
        });
      }
    }
    return mockSuppliers;
  }

  return data.map((item) => ({
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
}

export async function saveSupplierToDb(supplier: Supplier): Promise<Supplier> {
  const timestamp = new Date().toISOString();

  if (isSupabaseConfigured && supabase) {
    await supabase.from("suppliers").upsert({
      id: supplier.id,
      name: supplier.name,
      address: supplier.address,
      phone: supplier.phone,
      email: supplier.email,
      website: supplier.website,
      vat_number: supplier.vatNumber,
      chamber_of_commerce_number: supplier.chamberOfCommerceNumber,
      notes: supplier.notes,
      is_active: supplier.isActive,
      updated_at: timestamp
    });
  }

  const existingIndex = localSuppliers.findIndex((s) => s.id === supplier.id);
  if (existingIndex !== -1) {
    localSuppliers[existingIndex] = { ...supplier, updatedAt: timestamp };
  } else {
    localSuppliers.unshift({ ...supplier, updatedAt: timestamp });
  }

  return supplier;
}

export async function deleteSupplierFromDb(supplierId: string): Promise<void> {
  localSuppliers = localSuppliers.filter((s) => s.id !== supplierId);
  if (isSupabaseConfigured && supabase) {
    await supabase
      .from("suppliers")
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq("id", supplierId);
  }
}
