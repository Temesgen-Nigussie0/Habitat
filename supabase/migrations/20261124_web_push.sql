-- Habitat Background Web Push Schema
-- Run this in Supabase SQL Editor (or via `supabase db push`).

create extension if not exists pgcrypto;

create table if not exists public.push_subscriptions (
  device_id text primary key,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  timezone text not null default 'UTC',
  updated_at timestamptz not null default now()
);

create table if not exists public.scheduled_reminders (
  id uuid primary key default gen_random_uuid(),
  device_id text not null references public.push_subscriptions(device_id) on delete cascade,
  kind text not null check (kind in ('task', 'habit')),
  item_key text not null,
  title text not null,
  body text not null,
  notify_at timestamptz not null,
  local_time text,
  timezone text not null default 'UTC',
  sent boolean not null default false,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (device_id, kind, item_key)
);

create index if not exists idx_scheduled_reminders_due
  on public.scheduled_reminders (sent, notify_at)
  where sent = false;

alter table public.push_subscriptions enable row level security;
alter table public.scheduled_reminders enable row level security;

-- Allow the PWA client (anon key) to register its device subscription & reminders
drop policy if exists "Allow anon upsert push_subscriptions" on public.push_subscriptions;
create policy "Allow anon upsert push_subscriptions"
  on public.push_subscriptions
  for all
  to anon
  using (true)
  with check (true);

drop policy if exists "Allow anon manage scheduled_reminders" on public.scheduled_reminders;
create policy "Allow anon manage scheduled_reminders"
  on public.scheduled_reminders
  for all
  to anon
  using (true)
  with check (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- Optional: Schedule `send-due-reminders` every minute using pg_cron + pg_net.
-- Enable `pg_cron` and `pg_net` in Supabase Dashboard -> Database -> Extensions,
-- then replace YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY and run:
--
-- select cron.schedule(
--   'habitat-send-due-reminders',
--   '* * * * *',
--   $$
--   select net.http_post(
--     url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-due-reminders',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );
-- ─────────────────────────────────────────────────────────────────────────────
