create or replace function public.reserve_room(
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
  v_reservation_id uuid;
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
      and status = 'confirmed'
      and start_time < p_end_time
      and end_time > p_start_time
  ) then
    raise exception 'Room is already reserved for this time'
      using errcode = '23P01';
  end if;

  insert into public.room_reservations (
    user_id, room_id, start_time, end_time, status
  )
  values (
    p_user_id, p_room_id, p_start_time, p_end_time, 'confirmed'
  )
  returning id into v_reservation_id;

  return v_reservation_id;
end;
$$;

revoke all on function public.reserve_room(
  uuid, uuid, timestamptz, timestamptz
) from public, anon, authenticated;

grant execute on function public.reserve_room(
  uuid, uuid, timestamptz, timestamptz
) to service_role;