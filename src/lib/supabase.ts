// Supabase client — used across the entire app
import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zaayzlxsxpuyllbutssj.supabase.co';
// Correct accidental double 'j' typo in URL if present in environment variables
const supabaseUrl = rawUrl.replace(/zaayzlxsxpuyllbutssjj/g, 'zaayzlxsxpuyllbutssj').replace(/\/+$/, '');

const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphYXl6bHhzeHB1eWxsYnV0c3NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzOTAxNDYsImV4cCI6MjEwNDk2NjE0Nn0.NC_BakcIRFakUYjX2ZkR7fSV1BOGDLxWRYAfbB4WU0s';

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
