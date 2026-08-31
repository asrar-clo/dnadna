const PAYPAL_API_BASE =
  process.env.PAYPAL_ENV === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

// Keep these in sync with scripts/setup-paypal-plans.mjs, which creates the
// actual PayPal billing plans these prices are attached to.
export const MONTHLY_PRICE_USD = '9.00';
export const YEARLY_PRICE_USD = '90.00';

export type BillingInterval = 'monthly' | 'yearly';

function planIdFor(interval: BillingInterval): string {
  const id =
    interval === 'monthly'
      ? process.env.PAYPAL_PLAN_ID_MONTHLY
      : process.env.PAYPAL_PLAN_ID_YEARLY;

  if (!id) {
    throw new Error(
      `PAYPAL_PLAN_ID_${interval.toUpperCase()} is not set. Run scripts/setup-paypal-plans.mjs once to create it.`
    );
  }
  return id;
}

function intervalForPlanId(planId: string): BillingInterval | null {
  if (planId === process.env.PAYPAL_PLAN_ID_MONTHLY) return 'monthly';
  if (planId === process.env.PAYPAL_PLAN_ID_YEARLY) return 'yearly';
  return null;
}

async function getAccessToken(): Promise<string> {
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64');

  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) throw new Error('PAYPAL_AUTH_FAILED');
  const data = await res.json();
  return data.access_token;
}

// Creates a recurring subscription for the given billing interval and
// returns the URL to send the user to for approval on PayPal's site.
export async function createSubscription(
  userId: string,
  interval: BillingInterval
): Promise<{ id: string; approveUrl: string }> {
  const token = await getAccessToken();
  const planId = planIdFor(interval);

  const res = await fetch(`${PAYPAL_API_BASE}/v1/billing/subscriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      plan_id: planId,
      custom_id: userId,
      application_context: {
        brand_name: 'VoiceDNA',
        user_action: 'SUBSCRIBE_NOW',
        return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/app?paypal=success`,
        cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/app?paypal=cancelled`,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error('paypal_create_subscription_failed', res.status, body);
    throw new Error('PAYPAL_SUBSCRIPTION_CREATE_FAILED');
  }
  const data = await res.json();
  const approveUrl = data.links?.find((l: any) => l.rel === 'approve')?.href;
  if (!approveUrl) throw new Error('PAYPAL_NO_APPROVE_LINK');
  return { id: data.id, approveUrl };
}

// Fetches a subscription from PayPal directly (never trust the client's
// claim that payment succeeded) and reports whether it's actually active,
// which user it belongs to, and which interval it's billed on.
export async function getSubscription(subscriptionId: string): Promise<{
  status: string;
  userId: string | null;
  interval: BillingInterval | null;
}> {
  const token = await getAccessToken();

  const res = await fetch(
    `${PAYPAL_API_BASE}/v1/billing/subscriptions/${subscriptionId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) throw new Error('PAYPAL_SUBSCRIPTION_FETCH_FAILED');
  const data = await res.json();
  return {
    status: data.status,
    userId: data.custom_id ?? null,
    interval: data.plan_id ? intervalForPlanId(data.plan_id) : null,
  };
}

export { intervalForPlanId };
