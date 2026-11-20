grant select, insert, update on public.room_reservations to service_role;

create or replace function public.cancel_room_and_promote(
  p_reservation_id uuid,
  p_user_id uuid
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_room_id uuid;
  v_start_time timestamptz;
  v_end_time timestamptz;
  v_entry record;
  v_new_reservation_id uuid;
  v_promoted_count integer := 0;
begin
  if p_reservation_id is null or p_user_id is null then
    raise exception 'Reservation and user are required'
      using errcode = '22023';
  end if;

  select room_id into v_room_id
  from public.room_reservations
  where id = p_reservation_id
    and user_id = p_user_id
    and status = 'confirmed';

  if not found then
    raise exception 'Active reservation not found'
      using errcode = 'P0002';
  end if;

  -- Use the same room lock as the waitlist join function.
  perform 1
  from public.study_rooms
  where id = v_room_id
  for update;

  update public.room_reservations
  set status = 'cancelled'
  where id = p_reservation_id
    and user_id = p_user_id
    and status = 'confirmed'
  returning start_time, end_time
    into v_start_time, v_end_time;

  if not found then
    raise exception 'Active reservation not found'
      using errcode = 'P0002';
  end if;

  -- Consider waiting students in the order they joined.
  for v_entry in
    select id, user_id, start_time, end_time
    from public.room_waitlist
    where room_id = v_room_id
      and status = 'waiting'
      and start_time < v_end_time
      and end_time > v_start_time
    order by created_at, id
    for update
  loop
    if v_entry.start_time <= now() then
      update public.room_waitlist
      set status = 'expired'
      where id = v_entry.id;
      continue;
    end if;

    -- The whole requested interval must now be free.
    if exists (
      select 1
      from public.room_reservations
      where room_id = v_room_id
        and status = 'confirmed'
        and start_time < v_entry.end_time
        and end_time > v_entry.start_time
    ) then
      continue;
    end if;

    insert into public.room_reservations (
      user_id, room_id, start_time, end_time, status
    )
    values (
      v_entry.user_id,
      v_room_id,
      v_entry.start_time,
      v_entry.end_time,
      'confirmed'
    )
    returning id into v_new_reservation_id;

    update public.room_waitlist
    set status = 'promoted',
        promoted_at = now(),
        promoted_reservation_id = v_new_reservation_id
    where id = v_entry.id;

    v_promoted_count := v_promoted_count + 1;
  end loop;

  return v_promoted_count;
end;
$$;

revoke all on function public.cancel_room_and_promote(uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.cancel_room_and_promote(uuid, uuid)
  to service_role;