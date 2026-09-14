// Supabase client for The Daily Bureau
// All user accounts are stored in Supabase PostgreSQL so ALL devices share the same user registry.
//
// Setup: Set these two environment variables in Cloudflare Pages → Settings → Environment Variables
//   NEXT_PUBLIC_SUPABASE_URL       → your project URL (https://xxxx.supabase.co)
//   NEXT_PUBLIC_SUPABASE_ANON_KEY  → your project anon/public key

import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? '';
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured =
  supabaseUrl.startsWith('https://') && supabaseKey.length > 10;

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null;
