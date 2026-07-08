const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase credentials in env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: plans } = await supabase.from('subscription_plans').select('*');
  const { data: users } = await supabase.from('subscription_users').select('*');
  const { data: subs } = await supabase.from('subscriptions').select('*, user:subscription_users(name)');

  console.log("=== PLANS ===");
  console.log(plans);
  console.log("=== USERS ===");
  console.log(users);
  console.log("=== SUBSCRIPTIONS ===");
  console.log(subs);
}

check();
