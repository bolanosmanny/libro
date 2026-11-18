create table if not exists public.room_waitlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  room_id uuid not null references public.study_rooms(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status varchar(20) not null default 'waiting'
    check (status in ('waiting', 'promoted', 'cancelled', 'expired')),
  created_at timestamptz not null default now(),
  promoted_at timestamptz,
  promoted_reservation_id uuid
    references public.room_reservations(id) on delete set null,
  constraint room_waitlist_time_order check (start_time < end_time)
);

create unique index if not exists room_waitlist_one_active_request
  on public.room_waitlist (user_id, room_id, start_time, end_time)
  where status = 'waiting';

create index if not exists room_waitlist_next_in_line
  on public.room_waitlist (room_id, start_time, end_time, created_at, id)
  where status = 'waiting';

alter table public.room_waitlist enable row level security;