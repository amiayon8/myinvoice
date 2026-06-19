import { createClient } from '@supabase/supabase-js';

export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!serviceRoleKey) {
    console.warn(
      'Warning: SUPABASE_SERVICE_ROLE_KEY is not defined. Automated recurring cron calls will fall back to anon key and might fail RLS policy checks.'
    );
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );
}
