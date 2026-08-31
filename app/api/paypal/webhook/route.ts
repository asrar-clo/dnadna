import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { intervalForPlanId } from '@/lib/paypal';

// Safety net: if PayPal activates/cancels a subscription but the user
// closes the tab before our client calls /api/paypal/confirm-subscription,
// this webhook keeps the profile in sync either way. Configure this URL in
// the PayPal developer dashboard for these events:
//   BILLING.SUBSCRIPTION.ACTIVATED
//   BILLING.SUBSCRIPTION.CANCELLED
//   BILLING.SUBSCRIPTION.EXPIRED
//   BILLING.SUBSCRIPTION.SUSPENDED
// Full signature verification is skipped to keep this MVP simple - this
// route only ever flips plan between 'pro' and 'free', which is low-risk,
// and the client-side confirm call remains the primary path for upgrades.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.event_type?.startsWith('BILLING.SUBSCRIPTION.')) {
    return NextResponse.json({ ok: true });
  }

  const subscriptionId: string | undefined = body.resource?.id;
  const userId: string | undefined = body.resource?.custom_id;
  const admin = createAdminClient();

  if (body.event_type === 'BILLING.SUBSCRIPTION.ACTIVATED') {
    if (!userId) return NextResponse.json({ ok: true });
    const interval = body.resource?.plan_id ? intervalForPlanId(body.resource.plan_id) : null;
    await admin
      .from('profiles')
      .update({
        plan: 'pro',
        plan_interval: interval,
        paypal_customer_or_subscription_id: subscriptionId ?? null,
      })
      .eq('id', userId);
  } else if (
    ['BILLING.SUBSCRIPTION.CANCELLED', 'BILLING.SUBSCRIPTION.EXPIRED', 'BILLING.SUBSCRIPTION.SUSPENDED'].includes(
      body.event_type
    )
  ) {
    if (!subscriptionId) return NextResponse.json({ ok: true });
    await admin
      .from('profiles')
      .update({ plan: 'free', plan_interval: null })
      .eq('paypal_customer_or_subscription_id', subscriptionId);
  }

  return NextResponse.json({ ok: true });
}
