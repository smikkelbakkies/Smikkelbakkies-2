import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://omaknpblyeddbbfdpiuy.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tYWtucGJseWVkZGJiZmRwaXV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MDYxOTcsImV4cCI6MjEwMTQ4MjE5N30.jPemaVDMe-Z-9ltcm4zMPcPuFZf6lDglOOKPLGzgGJI";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log("Testing insert with Anon Key...");
  
  const testId = "00000000-0000-0000-0000-000000000000";
  
  const payload = {
    id: testId,
    name: "Test Ingredient",
    category_id: "7da89c92-3a56-42d3-9791-c454e9bc33bc", // random uuid
    base_unit: "stuk",
    purchase_unit: "doos",
    package_content: 1,
    purchase_price: 10,
    is_active: true
  };
  
  const { data, error } = await supabase.from("ingredients").insert(payload);
  
  console.log("Insert result:", { data, error });
}

test();
