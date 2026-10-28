import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tlrfmhucpxcbesdqvndg.supabase.co";

// Fallback prevents createClient from throwing 'supabaseKey is required' during build/local dev
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRscmZtaHVjcHhjYmVzZHF2bmRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwMzc2MjUsImV4cCI6MjEwODYxMzYyNX0.L950HBj7hiVhl0ZbaPZS1nDk0HpIR6vXighLd0t0lnE";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);