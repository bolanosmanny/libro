-- Base tables used by Libro. Later migrations add book details,
-- room waitlists, overlap protection, and equipment inventory.

create table if not exists public.libraries (
  id uuid primary key default gen_random_uuid(),
  name varchar(255) not null,
  location varchar(255),
  opening_time time without time zone default '08:00:00',
  closing_time time without time zone default '22:00:00',
  created_at timestamptz default now()
);

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title varchar(255) not null,
  author varchar(255),
  isbn varchar(20),
  is_available boolean default true,
  created_at timestamptz default now(),
  thumbnail_url text
);

create table if not exists public.study_rooms (
  id uuid primary key default gen_random_uuid(),
  library_id uuid references public.libraries(id) on delete cascade,
  room_number varchar(50) not null,
  capacity integer not null,
  has_whiteboard boolean default true,
  has_display boolean default true,
  is_wheelchair_accessible boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.book_loans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  book_id uuid references public.books(id) on delete cascade,
  checkout_date timestamptz default now(),
  due_date timestamptz not null,
  returned_date timestamptz,
  status varchar(50) default 'checked_out',
  created_at timestamptz default now()
);

create table if not exists public.room_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  room_id uuid references public.study_rooms(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status varchar(50) default 'confirmed',
  created_at timestamptz default now()
);

alter table public.libraries enable row level security;
alter table public.books enable row level security;
alter table public.study_rooms enable row level security;
alter table public.book_loans enable row level security;
alter table public.room_reservations enable row level security;

revoke all on table
  public.libraries,
  public.books,
  public.study_rooms,
  public.book_loans,
  public.room_reservations
from public, anon, authenticated;

grant select on table
  public.libraries,
  public.books,
  public.study_rooms
to anon, authenticated;

grant select, insert, update, delete on table
  public.libraries,
  public.books,
  public.study_rooms,
  public.book_loans,
  public.room_reservations
to service_role;

drop policy if exists "Anyone can view libraries" on public.libraries;
create policy "Anyone can view libraries"
  on public.libraries for select
  to anon, authenticated
  using (true);

drop policy if exists "Anyone can view books" on public.books;
create policy "Anyone can view books"
  on public.books for select
  to anon, authenticated
  using (true);

drop policy if exists "Anyone can view study rooms" on public.study_rooms;
create policy "Anyone can view study rooms"
  on public.study_rooms for select
  to anon, authenticated
  using (true);