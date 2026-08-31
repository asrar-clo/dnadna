import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getSubscription } from '@/lib/paypal';

// Called by the client after the user approves the subscription on PayPal's
// site. We still verify everything server-side against PayPal itself before
// touching the database - the client only tells us WHICH subscription to
// check.
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Please log in to continue.' }, { status: 401 });
  }

  const { subscriptionId } = await req.json().catch(() => ({ subscriptionId: null }));
  if (!subscriptionId) {
    return NextResponse.json({ error: 'Missing subscription id.' }, { status: 400 });
  }

  try {
    const { status, userId, interval } = await getSubscription(subscriptionId);

    if (status !== 'ACTIVE' || userId !== user.id) {
      return NextResponse.json({ error: 'Payment could not be verified.' }, { status: 402 });
    }

    // Use the service-role client for the actual write: profiles has no
    // client-facing update policy, so plan changes can only ever happen
    // through trusted server code that has already verified payment.
    const admin = createAdminClient();
    const { error } = await admin
      .from('profiles')
      .update({
        plan: 'pro',
        plan_interval: interval,
        paypal_customer_or_subscription_id: subscriptionId,
      })
      .eq('id', user.id);

    if (error) throw error;

    return NextResponse.json({ ok: true, interval });
  } catch (err) {
    console.error('paypal_confirm_subscription_failed', err);
    return NextResponse.json({ error: 'Payment failed or could not be verified. You have not been charged.' }, { status: 500 });
  }
}
