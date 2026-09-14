// Supabase client for The Daily Bureau
// All user accounts are stored in Supabase PostgreSQL so ALL devices share the same user registry.

import { createClient } from '@supabase/supabase-js';

// Fallback to project credentials so Cloudflare Pages & all devices work out-of-the-box
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://zaayzlxsxpuyllbutssj.supabase.co';

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphYXl6bHhzeHB1eWxsYnV0c3NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzOTAxNDYsImV4cCI6MjEwNDk2NjE0Nn0.NC_BakcIRFakUYjX2ZkR7fSV1BOGDLxWRYAfbB4WU0s';

export const isSupabaseConfigured =
  Boolean(supabaseUrl && supabaseUrl.startsWith('https://') && supabaseKey && supabaseKey.length > 10);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null;

