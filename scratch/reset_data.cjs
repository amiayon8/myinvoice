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

async function run() {
  console.log("Fetching current subscriptions...");
  const { data: subs, error: fetchErr } = await supabase
    .from('subscriptions')
    .select('*, user:subscription_users(name)');

  if (fetchErr || !subs) {
    console.error("Failed to fetch subscriptions:", fetchErr);
    process.exit(1);
  }

  console.log("Cleaning all payment history...");
  const { error: deleteErr } = await supabase
    .from('subscription_payments')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Deletes everything

  if (deleteErr) {
    console.error("Failed to delete payment records:", deleteErr);
    process.exit(1);
  }
  console.log("All payment history cleaned successfully.");

  const targets = [
    { name: "Mizanur Rahman", amount: 140, months: 1.0, startDate: "2026-07-08" },
    { name: "Chandra Roy Rinki", amount: 140, months: 1.0, startDate: "2026-07-08" },
    { name: "Showrav Sarker", amount: 140, months: 1.0, startDate: "2026-07-08" },
    { name: "Sujoy Sarker", amount: 140, months: 1.0, startDate: "2026-07-08" },
    { name: "Rashedul Islam", amount: 140, months: 1.0, startDate: "2026-07-08" },
    { name: "Shantanu Biswas", amount: 280, months: 2.0, startDate: "2026-07-08" },
    { name: "Dr. Samaresh Chandra Saha", amount: 280, months: 2.0, startDate: "2026-07-08" },
    { name: "Shishir Sarker", amount: 380, months: 2.71, startDate: "2026-07-08" },
    { name: "Abir Sarker", amount: 720, months: 5.14, startDate: "2026-06-08" }
  ];

  for (const target of targets) {
    const sub = subs.find(s => s.user?.name === target.name);
    if (!sub) {
      console.warn(`Could not find subscription for user: ${target.name}`);
      continue;
    }

    console.log(`Setting up payment for ${target.name}...`);

    // 1. Update subscription details
    const { error: subErr } = await supabase
      .from('subscriptions')
      .update({
        start_date: target.startDate,
        months_paid: target.months,
        total_amount_paid: target.amount,
        status: 'active',
        kicked_at: null
      })
      .eq('id', sub.id);

    if (subErr) {
      console.error(`Failed to update subscription for ${target.name}:`, subErr);
      continue;
    }

    // 2. Insert single payment history record
    const { error: payErr } = await supabase
      .from('subscription_payments')
      .insert({
        subscription_id: sub.id,
        amount: target.amount,
        months: target.months,
        notes: 'Initial Reset Payment'
      });

    if (payErr) {
      console.error(`Failed to insert payment record for ${target.name}:`, payErr);
      continue;
    }

    console.log(`Successfully updated ${target.name}.`);
  }

  console.log("Database reset run complete!");
}

run();
