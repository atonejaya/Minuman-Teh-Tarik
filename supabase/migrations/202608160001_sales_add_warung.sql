-- ============================================================================
-- Minuman @One - Sales dapat menambah Warung (dengan GPS otomatis)
-- Date: 2026-08-16
-- Applies via: Supabase SQL Editor (atau `npx supabase db push` setelah login).
--
-- Contents:
--   1. Kolom created_by pada Warung (jika belum ada) utk melacak pendaftar
--   2. Warung SELECT diperketat: OWNER lihat semua, SALES hanya warung sendiri
--   3. Warung INSERT untuk SALES (area & rute terkunci sesuai akun)
-- ============================================================================

alter table public."Warung"
  add column if not exists created_by integer references public."User"(id);

drop policy if exists p_Warung_select_auth on public."Warung";
create policy p_Warung_select_auth on public."Warung"
  for select to authenticated
  using (
    public.current_user_role() = 'OWNER'
    or assigned_sales_id = public.current_user_id()
  );

drop policy if exists p_Warung_insert_sales on public."Warung";
create policy p_Warung_insert_sales on public."Warung"
  for insert to authenticated
  with check (
    public.current_user_role() = 'OWNER'
    or (
      public.current_user_role() = 'SALES'
      and assigned_sales_id = public.current_user_id()
      and created_by = public.current_user_id()
      and area_id = (select u.area_id from public."User" u where u.id = public.current_user_id())
      and (
        route_id is null
        or exists (
          select 1 from public."Route" r
          where r.id = route_id and r.area_id = area_id
        )
      )
    )
  );

-- Catatan: jika User.area_id akun Sales NULL, area_id = (select ...) bernilai
-- NULL -> INSERT ditolak RLS; Task 4 mencegahnya di frontend.
