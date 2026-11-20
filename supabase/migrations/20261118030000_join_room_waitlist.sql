-- The server role needs to lock a room and inspect its reservations.
grant select, update on public.study_rooms to service_role;
grant select on public.room_reservations to service_role;

create or replace function public.join_room_waitlist(
  p_user_id uuid,
  p_room_id uuid,
  p_start_time timestamptz,
  p_end_time timestamptz
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_waitlist_id uuid;
begin
  if p_user_id is null
     or p_room_id is null
     or p_start_time is null
     or p_end_time is null
     or p_start_time <= now()
     or p_start_time >= p_end_time then
    raise exception 'Choose a valid future room and time'
      using errcode = '22023';
  end if;

  -- Later cancellation and reservation operations will use this same lock.
  perform 1
  from public.study_rooms
  where id = p_room_id
  for update;

  if not found then
    raise exception 'Room not found' using errcode = 'P0002';
  end if;

  if exists (
    select 1
    from public.room_reservations
    where room_id = p_room_id
      and user_id = p_user_id
      and status = 'confirmed'
      and start_time < p_end_time
      and end_time > p_start_time
  ) then
    raise exception 'You already reserved this room and time'
      using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.room_reservations
    where room_id = p_room_id
      and status = 'confirmed'
      and start_time < p_end_time
      and end_time > p_start_time
  ) then
    raise exception 'Room is available; reserve it instead'
      using errcode = 'P0001';
  end if;

  -- Repeating the same request returns the existing place in line.
  select id into v_waitlist_id
  from public.room_waitlist
  where user_id = p_user_id
    and room_id = p_room_id
    and start_time = p_start_time
    and end_time = p_end_time
    and status = 'waiting';

  if v_waitlist_id is not null then
    return v_waitlist_id;
  end if;

  insert into public.room_waitlist (
    user_id, room_id, start_time, end_time
  )
  values (
    p_user_id, p_room_id, p_start_time, p_end_time
  )
  returning id into v_waitlist_id;

  return v_waitlist_id;
end;
$$;

revoke all on function public.join_room_waitlist(
  uuid, uuid, timestamptz, timestamptz
) from public, anon, authenticated;

grant execute on function public.join_room_waitlist(
  uuid, uuid, timestamptz, timestamptz
) to service_role;