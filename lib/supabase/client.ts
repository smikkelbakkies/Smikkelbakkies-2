import { createClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://omaknpblyeddbbfdpiuy.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tYWtucGJseWVkZGJiZmRwaXV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MDYxOTcsImV4cCI6MjEwMTQ4MjE5N30.jPemaVDMe-Z-9ltcm4zMPcPuFZf6lDglOOKPLGzgGJI";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = true;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
