import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { FREE_DAILY_LIMIT } from '@/lib/usage';
import ExplainApp from '@/components/ExplainApp';

export default async function AppPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single();

  const plan = profile?.plan ?? 'free';

  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const { count } = await supabase
    .from('usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'success')
    .gte('created_at', startOfDay.toISOString());

  const usedToday = count ?? 0;
  const atLimit = plan !== 'pro' && usedToday >= FREE_DAILY_LIMIT;

  return <ExplainApp email={user.email ?? ''} plan={plan} initialAtLimit={atLimit} />;
}
