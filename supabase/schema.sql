-- Explain This: minimal schema. Run this in the Supabase SQL editor.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  paypal_customer_or_subscription_id text,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  plan_interval text check (plan_interval in ('monthly', 'yearly')),
  created_at timestamptz not null default now()
);

-- If you already ran this file before the PayPal subscriptions update,
-- just run this one line to add the new column to your existing table:
-- alter table public.profiles add column if not exists plan_interval text check (plan_interval in ('monthly', 'yearly'));

create index if not exists profiles_paypal_sub_idx on public.profiles (paypal_customer_or_subscription_id);

create table if not exists public.usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  status text not null check (status in ('success', 'error'))
);

create index if not exists usage_user_created_idx on public.usage (user_id, created_at);

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Row Level Security: users can only see/change their own rows.
-- Writes to profiles.plan happen only via the service-role key from the
-- server (PayPal capture/webhook routes), never from the client.
alter table public.profiles enable row level security;
alter table public.usage enable row level security;

create policy "profiles: read own" on public.profiles
  for select using (auth.uid() = id);

create policy "usage: read own" on public.usage
  for select using (auth.uid() = user_id);

create policy "usage: insert own" on public.usage
  for insert with check (auth.uid() = user_id);
