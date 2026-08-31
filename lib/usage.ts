import { SupabaseClient } from '@supabase/supabase-js';

export const FREE_DAILY_LIMIT = 3;

// Returns true if this user is still allowed to run an explanation today.
// Pro users always pass. Free users are capped by counting today's
// successful usage rows — simple, no separate credits table.
export async function canExplain(
  supabase: SupabaseClient,
  userId: string,
  plan: string
): Promise<boolean> {
  if (plan === 'pro') return true;

  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from('usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'success')
    .gte('created_at', startOfDay.toISOString());

  if (error) throw error;
  return (count ?? 0) < FREE_DAILY_LIMIT;
}

export async function logUsage(
  supabase: SupabaseClient,
  userId: string,
  status: 'success' | 'error'
) {
  await supabase.from('usage').insert({ user_id: userId, status });
}
