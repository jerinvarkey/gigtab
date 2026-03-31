-- Run this in Supabase SQL Editor
-- Adds slug field for public profile URLs

alter table public.workers add column if not exists slug text unique;

-- Create index for fast slug lookups
create index if not exists idx_workers_slug on public.workers(slug);

-- Allow public (unauthenticated) reads on workers for public profile pages
create policy "Public can view worker profiles by slug" on public.workers
  for select using (slug is not null);
