import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createOrder } from '@/lib/paypal';

export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Please log in to continue.' }, { status: 401 });
  }

  try {
    const { id, approveUrl } = await createOrder(user.id);
    return NextResponse.json({ orderId: id, approveUrl });
  } catch (err) {
    console.error('paypal_create_order_failed', err);
    return NextResponse.json({ error: 'Payment couldn\u2019t be started. Please try again.' }, { status: 500 });
  }
}
