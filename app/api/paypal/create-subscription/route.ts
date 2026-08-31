import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSubscription, type BillingInterval } from '@/lib/paypal';

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Please log in to continue.' }, { status: 401 });
  }

  const { interval } = await req.json().catch(() => ({ interval: null }));
  if (interval !== 'monthly' && interval !== 'yearly') {
    return NextResponse.json({ error: 'Choose Monthly or Yearly.' }, { status: 400 });
  }

  try {
    const { id, approveUrl } = await createSubscription(user.id, interval as BillingInterval);
    return NextResponse.json({ subscriptionId: id, approveUrl });
  } catch (err) {
    console.error('paypal_create_subscription_failed', err);
    return NextResponse.json({ error: 'Payment couldn\u2019t be started. Please try again.' }, { status: 500 });
  }
}
