import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { captureOrder } from '@/lib/paypal';

// Called by the client after the user approves payment on PayPal's site.
// We still verify everything server-side against PayPal itself before
// touching the database - the client only tells us WHICH order to check.
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Please log in to continue.' }, { status: 401 });
  }

  const { orderId } = await req.json().catch(() => ({ orderId: null }));
  if (!orderId) {
    return NextResponse.json({ error: 'Missing order id.' }, { status: 400 });
  }

  try {
    const { status, userId } = await captureOrder(orderId);

    if (status !== 'COMPLETED' || userId !== user.id) {
      return NextResponse.json({ error: 'Payment could not be verified.' }, { status: 402 });
    }

    // Use the service-role client for the actual write: profiles has no
    // client-facing update policy, so plan changes can only ever happen
    // through trusted server code that has already verified payment.
    const admin = createAdminClient();
    const { error } = await admin
      .from('profiles')
      .update({ plan: 'pro', paypal_customer_or_subscription_id: orderId })
      .eq('id', user.id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('paypal_capture_failed', err);
    return NextResponse.json({ error: 'Payment failed or could not be verified. You have not been charged.' }, { status: 500 });
  }
}
