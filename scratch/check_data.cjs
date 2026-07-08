const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Parse .env manually
const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim().replace(/(^['"]|['"]$)/g, '');
    env[key] = val;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: plans } = await supabase.from('subscription_plans').select('*');
  const { data: users } = await supabase.from('subscription_users').select('*');
  const { data: subs } = await supabase.from('subscriptions').select('*, user:subscription_users(name)');

  console.log("=== PLANS ===");
  console.log(JSON.stringify(plans, null, 2));
  console.log("=== USERS ===");
  console.log(JSON.stringify(users, null, 2));
  console.log("=== SUBSCRIPTIONS ===");
  console.log(JSON.stringify(subs, null, 2));
}

check();
