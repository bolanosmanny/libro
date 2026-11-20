create extension if not exists btree_gist;

alter table public.room_reservations
  add constraint confirmed_room_time_valid
  check (
    status <> 'confirmed'
    or (
      room_id is not null
      and start_time is not null
      and end_time is not null
      and start_time < end_time
    )
  );

alter table public.room_reservations
  add constraint no_overlapping_confirmed_room_reservations
  exclude using gist (
    room_id with =,
    tstzrange(start_time, end_time, '[)') with &&
  )
  where (status = 'confirmed');