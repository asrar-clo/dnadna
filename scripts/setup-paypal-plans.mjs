// One-time setup script. Creates a PayPal Product plus two Billing Plans
// (Monthly $9, Yearly $90) and prints the plan IDs you need to paste into
// .env.local. Safe to re-run — it just creates new plans each time, so only
// run it once per environment (sandbox vs live).
//
// Usage:
//   node --env-file=.env.local scripts/setup-paypal-plans.mjs
//
// (If your Node version doesn't support --env-file, export the PAYPAL_*
// vars in your shell first, then run: node scripts/setup-paypal-plans.mjs)

const BASE =
  process.env.PAYPAL_ENV === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

const MONTHLY_PRICE_USD = '9.00';
const YEARLY_PRICE_USD = '90.00';

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing ${name} in your environment. Set it in .env.local first.`);
    process.exit(1);
  }
  return v;
}

async function getAccessToken() {
  const clientId = requireEnv('PAYPAL_CLIENT_ID');
  const secret = requireEnv('PAYPAL_CLIENT_SECRET');
  const auth = Buffer.from(`${clientId}:${secret}`).toString('base64');

  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) {
    console.error('Auth failed:', await res.text());
    process.exit(1);
  }
  return (await res.json()).access_token;
}

async function createProduct(token) {
  const res = await fetch(`${BASE}/v1/catalogs/products`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'VoiceDNA Pro',
      description: 'VoiceDNA Pro subscription',
      type: 'SERVICE',
      category: 'SOFTWARE',
    }),
  });
  if (!res.ok) {
    console.error('Product creation failed:', await res.text());
    process.exit(1);
  }
  return (await res.json()).id;
}

async function createPlan(token, productId, { name, interval, price }) {
  const res = await fetch(`${BASE}/v1/billing/plans`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      product_id: productId,
      name,
      billing_cycles: [
        {
          frequency: { interval_unit: interval, interval_count: 1 },
          tenure_type: 'REGULAR',
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: {
            fixed_price: { value: price, currency_code: 'USD' },
          },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        payment_failure_threshold: 2,
      },
    }),
  });
  if (!res.ok) {
    console.error(`Plan creation failed (${name}):`, await res.text());
    process.exit(1);
  }
  return (await res.json()).id;
}

const token = await getAccessToken();
console.log('Authenticated with PayPal (' + (process.env.PAYPAL_ENV || 'sandbox') + ').');

const productId = await createProduct(token);
console.log('Created product:', productId);

const monthlyId = await createPlan(token, productId, {
  name: 'VoiceDNA Pro — Monthly',
  interval: 'MONTH',
  price: MONTHLY_PRICE_USD,
});
console.log('Created monthly plan:', monthlyId);

const yearlyId = await createPlan(token, productId, {
  name: 'VoiceDNA Pro — Yearly',
  interval: 'YEAR',
  price: YEARLY_PRICE_USD,
});
console.log('Created yearly plan:', yearlyId);

console.log('\nAdd these to your .env.local:\n');
console.log(`PAYPAL_PLAN_ID_MONTHLY=${monthlyId}`);
console.log(`PAYPAL_PLAN_ID_YEARLY=${yearlyId}`);
