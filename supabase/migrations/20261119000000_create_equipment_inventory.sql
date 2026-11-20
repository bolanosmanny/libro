create table public.equipment_inventory (
    id uuid primary key default gen_random_uuid(),
    name text not null check (btrim(name) <> ''),
    location text not null check (btrim(location) <> ''),
    total_count integer not null check (total_count > 0),
    available_count integer not null check (available_count between 0 and total_count),
    unique (name, location)
);

alter table public.equipment_inventory enable row level security;

revoke all on public.equipment_inventory from anon, authenticated;
grant select on public.equipment_inventory to anon, authenticated;
grant select, insert, update, delete on public.equipment_inventory to service_role;

create policy "Anyone can read equipment availability"
on public.equipment_inventory
for select
to anon, authenticated
using (true);
