-- ============================================================================
-- 1. Notification System
-- ============================================================================

create table if not exists public."Notification" (
  id uuid primary key default gen_random_uuid(),
  user_id int references public."User"(id) on delete cascade,
  target_role public."UserRole",
  title text not null,
  message text not null,
  link text,
  is_read boolean not null default false,
  created_at timestamp with time zone not null default now()
);

-- RLS
alter table public."Notification" enable row level security;

drop policy if exists p_Notification_select on public."Notification";
create policy p_Notification_select on public."Notification"
  for select to authenticated
  using (
    (user_id is not null and user_id = public.current_user_id()) or
    (target_role is not null and target_role::text = public.current_user_role())
  );

drop policy if exists p_Notification_insert on public."Notification";
create policy p_Notification_insert on public."Notification"
  for insert to authenticated
  with check (true);

drop policy if exists p_Notification_update on public."Notification";
create policy p_Notification_update on public."Notification"
  for update to authenticated
  using (
    (user_id is not null and user_id = public.current_user_id()) or
    (target_role is not null and target_role::text = public.current_user_role())
  )
  with check (
    (user_id is not null and user_id = public.current_user_id()) or
    (target_role is not null and target_role::text = public.current_user_role())
  );

-- Enable Realtime
-- Use 'do' block to ignore if publication already has the table
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'Notification'
  ) then
    alter publication supabase_realtime add table public."Notification";
  end if;
end;
$$;
