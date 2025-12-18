
import { createClient } from '@supabase/supabase-js';

// These environment variables are assumed to be provided in the environment
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Storage Bucket Names
export const BUCKETS = {
    LOGOS: 'logos'
};
