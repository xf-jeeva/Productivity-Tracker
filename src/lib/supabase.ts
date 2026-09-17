// Supabase client — used across the entire app
import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? '';
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured =
  supabaseUrl.startsWith('https://') && supabaseKey.length > 10;

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export type SupabaseProfile = {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  role: 'admin' | 'member';
  created_at: string;
};
