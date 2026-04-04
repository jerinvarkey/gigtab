-- ============================================================
-- GIGTAB v5 — NUKE & REBUILD
-- Step 1: Run the DROP block
-- Step 2: Run everything below it
-- ============================================================

-- NUKE EVERYTHING (run this first)
drop table if exists payments, event_participants, events, job_workers, jobs, contacts, users cascade;
drop table if exists shift_assignments, shifts, invites, worker_businesses, business_members, workers, businesses cascade;

-- ============================================================
-- FRESH SCHEMA
-- ============================================================
create extension if not exists "uuid-ossp";

-- Users
create table public.users (
  id uuid primary key default uuid_generate_v4(),
  auth_id uuid unique references auth.users(id) on delete cascade,
  slug text unique,
  name text not null,
  email text,
  phone text,
  payment_methods jsonb default '[]'::jsonb,
  preferred_method text,
  payer_names text[] default '{}',
  created_at timestamptz default now()
);

-- Contacts (people you've interacted with)
create table public.contacts (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references public.users(id) on delete cascade,
  contact_id uuid references public.users(id) on delete cascade,
  nickname text,
  created_at timestamptz default now(),
  unique(owner_id, contact_id)
);

-- Jobs (work assignments with hours/pay tracking)
create table public.jobs (
  id uuid primary key default uuid_generate_v4(),
  created_by uuid references public.users(id) on delete cascade,
  payer_name text not null,
  title text not null,
  location text,
  job_date date,
  start_time text,
  end_time text,
  hourly_rate numeric(10,2),
  notes text,
  invite_code text unique default substr(md5(random()::text), 1, 8),
  status text default 'active',
  created_at timestamptz default now()
);

-- Job Workers (many workers per job)
create table public.job_workers (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid references public.jobs(id) on delete cascade,
  worker_id uuid references public.users(id) on delete cascade,
  status text default 'pending' check (status in ('pending','accepted','hours_submitted','approved','paid','declined')),
  hours_logged numeric(10,2),
  approved_at timestamptz,
  created_at timestamptz default now(),
  unique(job_id, worker_id)
);

-- Events (shareable payment requests like "basketball $9")
create table public.events (
  id uuid primary key default uuid_generate_v4(),
  created_by uuid references public.users(id) on delete cascade,
  title text not null,
  amount numeric(10,2) not null,
  notes text,
  invite_code text unique default substr(md5(random()::text), 1, 8),
  created_at timestamptz default now()
);

-- Event Participants
create table public.event_participants (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid references public.events(id) on delete cascade,
  user_id uuid references public.users(id),
  name text,
  status text default 'unpaid' check (status in ('unpaid','paid')),
  paid_at timestamptz,
  created_at timestamptz default now()
);

-- Payments
create table public.payments (
  id uuid primary key default uuid_generate_v4(),
  payer_id uuid references public.users(id),
  receiver_id uuid references public.users(id),
  job_worker_id uuid references public.job_workers(id),
  event_participant_id uuid references public.event_participants(id),
  payer_name text,
  amount numeric(10,2) not null,
  method text,
  note text,
  paid_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Open RLS for MVP
alter table public.users enable row level security;
alter table public.contacts enable row level security;
alter table public.jobs enable row level security;
alter table public.job_workers enable row level security;
alter table public.events enable row level security;
alter table public.event_participants enable row level security;
alter table public.payments enable row level security;
create policy "open" on public.users for all using (true) with check (true);
create policy "open" on public.contacts for all using (true) with check (true);
create policy "open" on public.jobs for all using (true) with check (true);
create policy "open" on public.job_workers for all using (true) with check (true);
create policy "open" on public.events for all using (true) with check (true);
create policy "open" on public.event_participants for all using (true) with check (true);
create policy "open" on public.payments for all using (true) with check (true);

-- Indexes
create index idx_users_auth on public.users(auth_id);
create index idx_users_slug on public.users(slug);
create index idx_users_email on public.users(email);
create index idx_contacts_owner on public.contacts(owner_id);
create index idx_jobs_created on public.jobs(created_by);
create index idx_jobs_invite on public.jobs(invite_code);
create index idx_jw_job on public.job_workers(job_id);
create index idx_jw_worker on public.job_workers(worker_id);
create index idx_events_created on public.events(created_by);
create index idx_events_invite on public.events(invite_code);
create index idx_ep_event on public.event_participants(event_id);
create index idx_payments_payer on public.payments(payer_id);
create index idx_payments_receiver on public.payments(receiver_id);
