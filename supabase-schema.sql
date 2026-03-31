-- ============================================================
-- GIGTAB — Supabase Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- BUSINESSES
-- ============================================================
create table public.businesses (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  pin text not null,
  default_rate numeric(10,2) default 15.00,
  pay_schedule text default 'friday',
  created_at timestamptz default now()
);

-- ============================================================
-- BUSINESS MEMBERS (role-based access)
-- ============================================================
create table public.business_members (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references public.businesses(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'manager')),
  name text not null,
  email text,
  can_pay boolean default false,
  created_at timestamptz default now(),
  unique(business_id, user_id)
);

-- ============================================================
-- WORKERS
-- ============================================================
create table public.workers (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  hourly_rate numeric(10,2) default 15.00,
  payment_methods jsonb default '[]'::jsonb,
  preferred_method text,
  marketplace jsonb default '{"enabled": false, "radius": 10, "categories": [], "bio": "", "minRate": 12, "zip": ""}'::jsonb,
  created_at timestamptz default now()
);

-- ============================================================
-- WORKER <-> BUSINESS connections
-- ============================================================
create table public.worker_businesses (
  id uuid primary key default uuid_generate_v4(),
  worker_id uuid references public.workers(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete cascade,
  created_at timestamptz default now(),
  unique(worker_id, business_id)
);

-- ============================================================
-- SHIFTS
-- ============================================================
create table public.shifts (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references public.businesses(id) on delete cascade,
  title text not null,
  location text,
  category text default 'presale',
  date date not null,
  start_time text,
  end_time text,
  hourly_rate numeric(10,2) default 15.00,
  invite_code text unique default substr(md5(random()::text), 1, 8),
  created_at timestamptz default now()
);

-- ============================================================
-- SHIFT ASSIGNMENTS
-- ============================================================
create table public.shift_assignments (
  id uuid primary key default uuid_generate_v4(),
  shift_id uuid references public.shifts(id) on delete cascade,
  worker_id uuid references public.workers(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'clocked-in', 'submitted', 'approved', 'paid', 'declined')),
  source text default 'direct' check (source in ('direct', 'marketplace')),
  hours_logged numeric(10,2),
  clock_in timestamptz,
  clock_out timestamptz,
  approved_at timestamptz,
  created_at timestamptz default now(),
  unique(shift_id, worker_id)
);

-- ============================================================
-- PAYMENTS
-- ============================================================
create table public.payments (
  id uuid primary key default uuid_generate_v4(),
  assignment_id uuid references public.shift_assignments(id),
  worker_id uuid references public.workers(id),
  shift_id uuid references public.shifts(id),
  business_id uuid references public.businesses(id),
  amount numeric(10,2) not null,
  method text,
  paid_at timestamptz default now(),
  created_at timestamptz default now()
);

-- ============================================================
-- INVITE LINKS (for shift invites and worker onboarding)
-- ============================================================
create table public.invites (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null default substr(md5(random()::text), 1, 8),
  business_id uuid references public.businesses(id) on delete cascade,
  shift_id uuid references public.shifts(id) on delete cascade,
  created_by uuid references auth.users(id),
  used_by uuid references auth.users(id),
  used_at timestamptz,
  expires_at timestamptz default (now() + interval '30 days'),
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.workers enable row level security;
alter table public.worker_businesses enable row level security;
alter table public.shifts enable row level security;
alter table public.shift_assignments enable row level security;
alter table public.payments enable row level security;
alter table public.invites enable row level security;

-- Businesses: members can read their own business
create policy "Members can view their business" on public.businesses
  for select using (
    id in (select business_id from public.business_members where user_id = auth.uid())
  );

create policy "Anyone can create a business" on public.businesses
  for insert with check (true);

-- Business members: can view co-members
create policy "Members can view business members" on public.business_members
  for select using (
    business_id in (select business_id from public.business_members where user_id = auth.uid())
  );

create policy "Admins can insert members" on public.business_members
  for insert with check (true);

-- Workers: own profile + businesses they work for can see them
create policy "Workers can view own profile" on public.workers
  for select using (user_id = auth.uid());

create policy "Workers can update own profile" on public.workers
  for update using (user_id = auth.uid());

create policy "Anyone can create worker profile" on public.workers
  for insert with check (true);

create policy "Businesses can view connected workers" on public.workers
  for select using (
    id in (
      select worker_id from public.worker_businesses
      where business_id in (select business_id from public.business_members where user_id = auth.uid())
    )
  );

-- Marketplace: businesses can see marketplace-enabled workers
create policy "Businesses can view marketplace workers" on public.workers
  for select using (
    (marketplace->>'enabled')::boolean = true
  );

-- Worker businesses
create policy "Workers can view own connections" on public.worker_businesses
  for select using (
    worker_id in (select id from public.workers where user_id = auth.uid())
  );

create policy "Anyone can create connection" on public.worker_businesses
  for insert with check (true);

create policy "Business members can view connections" on public.worker_businesses
  for select using (
    business_id in (select business_id from public.business_members where user_id = auth.uid())
  );

-- Shifts: business members can CRUD, assigned workers can read
create policy "Business members can view shifts" on public.shifts
  for select using (
    business_id in (select business_id from public.business_members where user_id = auth.uid())
  );

create policy "Workers can view assigned shifts" on public.shifts
  for select using (
    id in (
      select shift_id from public.shift_assignments
      where worker_id in (select id from public.workers where user_id = auth.uid())
    )
  );

create policy "Business members can create shifts" on public.shifts
  for insert with check (
    business_id in (select business_id from public.business_members where user_id = auth.uid())
  );

create policy "Business members can delete shifts" on public.shifts
  for delete using (
    business_id in (select business_id from public.business_members where user_id = auth.uid())
  );

-- Shift assignments
create policy "Business members can view assignments" on public.shift_assignments
  for select using (
    shift_id in (
      select id from public.shifts
      where business_id in (select business_id from public.business_members where user_id = auth.uid())
    )
  );

create policy "Workers can view own assignments" on public.shift_assignments
  for select using (
    worker_id in (select id from public.workers where user_id = auth.uid())
  );

create policy "Business members can create assignments" on public.shift_assignments
  for insert with check (true);

create policy "Business members can update assignments" on public.shift_assignments
  for update using (
    shift_id in (
      select id from public.shifts
      where business_id in (select business_id from public.business_members where user_id = auth.uid())
    )
  );

create policy "Workers can update own assignments" on public.shift_assignments
  for update using (
    worker_id in (select id from public.workers where user_id = auth.uid())
  );

-- Payments
create policy "Business members can view payments" on public.payments
  for select using (
    business_id in (select business_id from public.business_members where user_id = auth.uid())
  );

create policy "Workers can view own payments" on public.payments
  for select using (
    worker_id in (select id from public.workers where user_id = auth.uid())
  );

create policy "Business members can create payments" on public.payments
  for insert with check (
    business_id in (select business_id from public.business_members where user_id = auth.uid())
  );

-- Invites: anyone can read (needed for invite links), business members can create
create policy "Anyone can read invites" on public.invites
  for select using (true);

create policy "Business members can create invites" on public.invites
  for insert with check (true);

create policy "Anyone can update invites" on public.invites
  for update using (true);

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_business_members_user on public.business_members(user_id);
create index idx_business_members_biz on public.business_members(business_id);
create index idx_workers_user on public.workers(user_id);
create index idx_worker_businesses_worker on public.worker_businesses(worker_id);
create index idx_worker_businesses_biz on public.worker_businesses(business_id);
create index idx_shifts_biz on public.shifts(business_id);
create index idx_shift_assignments_shift on public.shift_assignments(shift_id);
create index idx_shift_assignments_worker on public.shift_assignments(worker_id);
create index idx_payments_biz on public.payments(business_id);
create index idx_payments_worker on public.payments(worker_id);
create index idx_invites_code on public.invites(code);
