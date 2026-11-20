alter table public.books
  add column if not exists description text,
  add column if not exists categories text[] not null default '{}'::text[],
  add column if not exists average_rating numeric(3,2),
  add column if not exists ratings_count integer;