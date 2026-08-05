import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import { suppliers } from "@/services/mock-data";
import type { Supplier } from "@/types/core";

export async function listSuppliers(): Promise<Supplier[]> {
  if (!isSupabaseConfigured || !supabase) {
    return suppliers;
  }

  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .is("deleted_at", null)
    .order("name");

  if (error) throw error;

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
