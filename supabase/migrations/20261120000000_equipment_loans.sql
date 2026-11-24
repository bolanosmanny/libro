create table if not exists public.equipment_loans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  equipment_id uuid not null
    references public.equipment_inventory(id) on delete restrict,
  checked_out_at timestamptz not null default now(),
  returned_at timestamptz,
  constraint equipment_loans_return_order
    check (returned_at is null or returned_at >= checked_out_at)
);

create unique index if not exists equipment_loans_one_active_per_user_item
  on public.equipment_loans (user_id, equipment_id)
  where returned_at is null;

create index if not exists equipment_loans_active_by_user
  on public.equipment_loans (user_id, checked_out_at desc)
  where returned_at is null;

alter table public.equipment_loans enable row level security;

revoke all on public.equipment_loans from public, anon, authenticated;
grant select, insert, update, delete
  on public.equipment_loans to service_role;

create or replace function public.checkout_equipment(
  p_user_id uuid,
  p_equipment_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_loan_id uuid;
begin
  if p_user_id is null or p_equipment_id is null then
    raise exception 'Choose an equipment item'
      using errcode = '22023';
  end if;

  perform 1
  from public.equipment_inventory
  where id = p_equipment_id
  for update;

  if not found then
    raise exception 'Equipment item not found'
      using errcode = 'P0002';
  end if;

  if exists (
    select 1
    from public.equipment_loans
    where user_id = p_user_id
      and equipment_id = p_equipment_id
      and returned_at is null
  ) then
    raise exception 'You already have this equipment checked out'
      using errcode = 'P0001';
  end if;

  update public.equipment_inventory
  set available_count = available_count - 1
  where id = p_equipment_id
    and available_count > 0;

  if not found then
    raise exception 'No equipment is currently available'
      using errcode = 'P0001';
  end if;

  insert into public.equipment_loans (user_id, equipment_id)
  values (p_user_id, p_equipment_id)
  returning id into v_loan_id;

  return v_loan_id;
end;
$$;

revoke all on function public.checkout_equipment(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.checkout_equipment(uuid, uuid)
  to service_role;

create or replace function public.return_equipment(
  p_user_id uuid,
  p_loan_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_equipment_id uuid;
  v_returned_id uuid;
begin
  if p_user_id is null or p_loan_id is null then
    raise exception 'Choose an equipment loan'
      using errcode = '22023';
  end if;

  select equipment_id into v_equipment_id
  from public.equipment_loans
  where id = p_loan_id
    and user_id = p_user_id
    and returned_at is null;

  if not found then
    raise exception 'Active equipment loan not found'
      using errcode = 'P0002';
  end if;

  perform 1
  from public.equipment_inventory
  where id = v_equipment_id
  for update;

  if not found then
    raise exception 'Equipment item not found'
      using errcode = 'P0002';
  end if;

  update public.equipment_loans
  set returned_at = now()
  where id = p_loan_id
    and user_id = p_user_id
    and returned_at is null
  returning id into v_returned_id;

  if not found then
    raise exception 'Active equipment loan not found'
      using errcode = 'P0002';
  end if;

  update public.equipment_inventory
  set available_count = available_count + 1
  where id = v_equipment_id
    and available_count < total_count;

  if not found then
    raise exception 'Equipment inventory count is inconsistent'
      using errcode = 'P0001';
  end if;

  return v_returned_id;
end;
$$;

revoke all on function public.return_equipment(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.return_equipment(uuid, uuid)
  to service_role;