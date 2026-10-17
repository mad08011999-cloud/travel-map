create table if not exists public.travel_status(
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  place_id text not null, wishlist boolean not null default false, visited boolean not null default false,
  trip_order int, updated_at timestamptz not null default now(), primary key(user_id,place_id));
alter table public.travel_status enable row level security;
create policy "own rows select" on public.travel_status for select using (auth.uid()=user_id);
create policy "own rows insert" on public.travel_status for insert with check (auth.uid()=user_id);
create policy "own rows update" on public.travel_status for update using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "own rows delete" on public.travel_status for delete using (auth.uid()=user_id);
