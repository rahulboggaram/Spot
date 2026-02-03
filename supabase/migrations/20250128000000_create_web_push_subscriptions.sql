-- Web Push subscriptions for PWA (iOS home screen) reminders at 12pm and 5pm
create table if not exists public.web_push_subscriptions (
  endpoint text primary key,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now()
);

-- Allow anonymous insert so PWA can subscribe without auth (admin page)
alter table public.web_push_subscriptions enable row level security;

create policy "Allow insert for web push subscription"
  on public.web_push_subscriptions for insert
  with check (true);

create policy "Allow update for web push subscription"
  on public.web_push_subscriptions for update
  using (true)
  with check (true);

create policy "Allow select for service role only"
  on public.web_push_subscriptions for select
  using (auth.role() = 'service_role');

create policy "Allow delete for service role only"
  on public.web_push_subscriptions for delete
  using (auth.role() = 'service_role');
