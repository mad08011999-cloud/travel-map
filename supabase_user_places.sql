-- "My picks": places added by each user on the travel site. Run once in the Supabase SQL editor.
create table if not exists public.user_places(
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  id text not null,                         -- client-generated id, e.g. 'u-<uuid>'
  data jsonb not null default '{}'::jsonb,  -- {name, description(note), category, lat, lng, city, region, country, address, otype, osm, created, updated}
  deleted boolean not null default false,   -- tombstone so deletions sync across devices
  updated_at timestamptz not null default now(),
  primary key (user_id, id));
alter table public.user_places enable row level security;
create policy "own places select" on public.user_places for select using (auth.uid() = user_id);
create policy "own places insert" on public.user_places for insert with check (auth.uid() = user_id);
create policy "own places update" on public.user_places for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own places delete" on public.user_places for delete using (auth.uid() = user_id);
