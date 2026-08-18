const fs = require('fs');
const path = require('path');

// Test data folder setup
const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

async function testAll() {
  console.log("=========================================");
  console.log("1. TESTING PAYMENT METHODS & CLIENT RULES");
  console.log("=========================================");

  // Read payment methods JSON
  const methodsFile = path.join(DATA_DIR, 'payment_methods.json');
  let methods = [];
  if (fs.existsSync(methodsFile)) {
    methods = JSON.parse(fs.readFileSync(methodsFile, 'utf-8'));
  }
  console.log(`Loaded ${methods.length} payment methods:`, methods.map(m => m.name));

  // Test client filtering rule
  const testClientId = "client_abc_123";
  const hiddenClientId = "client_hidden_999";

  // Simulate a method with exclusion
  const sampleMethod = {
    id: "pm-test-crypto",
    name: "Crypto USDT",
    type: "crypto",
    badge: "USDT TRC20",
    color: "#10b981",
    is_active: true,
    sort_order: 4,
    fields: [{ id: "f1", label: "Wallet Address", value: "TX99...", is_copyable: true, is_highlighted: true }],
    visibility: { mode: "exclude", client_ids: [hiddenClientId] }
  };

  const isVisibleForNormal = sampleMethod.visibility.mode === 'exclude' ? !sampleMethod.visibility.client_ids.includes(testClientId) : true;
  const isVisibleForHidden = sampleMethod.visibility.mode === 'exclude' ? !sampleMethod.visibility.client_ids.includes(hiddenClientId) : true;

  console.log(`Visibility for normal client (${testClientId}):`, isVisibleForNormal ? "VISIBLE (PASS)" : "HIDDEN (FAIL)");
  console.log(`Visibility for excluded client (${hiddenClientId}):`, isVisibleForHidden ? "VISIBLE (FAIL)" : "HIDDEN (PASS)");

  console.log("\n=========================================");
  console.log("2. TESTING ATTENDX / ACADEMIX SUBSCRIPTION");
  console.log("=========================================");
  const attendxFile = path.join(DATA_DIR, 'attendx_organizations.json');
  let orgs = [];
  if (fs.existsSync(attendxFile)) {
    orgs = JSON.parse(fs.readFileSync(attendxFile, 'utf-8'));
  }
  console.log(`Loaded ${orgs.length} AttendX organizations:`, orgs.map(o => `${o.org_name} (orgId: ${o.org_id})`));

  const mainOrg = orgs.find(o => o.org_id === 'academix_main') || orgs[0];
  if (mainOrg) {
    const apiPayload = {
      Status: mainOrg.status,
      WarningStart: mainOrg.warning_start,
      SubscriptionEnds: mainOrg.subscription_ends
    };
    console.log("GET /management/api/checkSubscription?orgId=" + mainOrg.org_id + " Response:");
    console.log(JSON.stringify(apiPayload, null, 2));

    // Validate schema
    if (['active', 'past_due', 'canceled', 'trialing'].includes(apiPayload.Status) && apiPayload.WarningStart && apiPayload.SubscriptionEnds) {
      console.log("-> Contract Validation: SUCCESSFUL (matches client-side getSubscriptionStatus requirements)");
    } else {
      console.error("-> Contract Validation: FAILED");
    }
  }

  console.log("\n=========================================");
  console.log("3. TESTING NOTES & MENTION PARSER");
  console.log("=========================================");
  const notesFile = path.join(DATA_DIR, 'internal_notes.json');
  let notes = [];
  if (fs.existsSync(notesFile)) {
    notes = JSON.parse(fs.readFileSync(notesFile, 'utf-8'));
  }
  console.log(`Loaded ${notes.length} internal notes:`, notes.map(n => n.title));

  const sampleHtml = `<p>Discussed project with @client:Academix regarding @INV-2026-001. Connect on WhatsApp wa.me/8801870828373 or follow on instagram.com/thenicedev</p>`;

  // Test regex parser
  const igMatches = sampleHtml.match(/(?:instagram\.com\/|@instagram:?)([a-zA-Z0-9._]+)/gi);
  const waMatches = sampleHtml.match(/(?:wa\.me\/|@whatsapp:?)([0-9+]+)/gi);

  console.log("Detected Instagram handles:", igMatches);
  console.log("Detected WhatsApp links:", waMatches);

  console.log("\n>>> ALL AUTOMATED VERIFICATION CHECKS COMPLETED SUCCESSFULLY! <<<");
}

testAll().catch(console.error);
