/**
 * Supabase client initialization
 *
 * Provides access to Supabase database and auth services.
 */
import { createClient } from '@supabase/supabase-js';

// Publishable (anon) fallback for project lmqwtldpfacrrlvdnmld — client-safe,
// keeps the client constructible even when env vars are absent. Env wins.
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://lmqwtldpfacrrlvdnmld.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtcXd0bGRwZmFjcnJsdmRubWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NTkwODEsImV4cCI6MjA5NDQzNTA4MX0.CITWnsiEJEd1B-G4RReYZdaTFbBNvw8NnM8OrRvDX8s';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
