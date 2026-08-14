-- ============================================================================
-- Minuman @One - App Settings, Company Branding & Logo Storage migration
-- Date: 2026-08-15
-- Applies via: Supabase SQL Editor (run AFTER 202608140001..005 in order).
--
-- Contents:
--   1. Storage bucket `company-assets` (public) + RLS policies so the app can
--      upload/read the company logo entirely from the Settings page.
--   2. Public SELECT policy on `Setting` so the login screen can show the
--      company name & logo before the user is authenticated.
--   3. Seed default settings (company profile, payroll, numbering) - inserted
--      only if the key does not already exist.
-- ============================================================================

-- 1. Storage bucket untuk logo & aset perusahaan
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'company-assets',
  'company-assets',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do nothing;

-- 2. Kebijakan akses storage (public read; upload/edit/del untuk user login)
drop policy if exists "company_assets_read_anyone" on storage.objects;
create policy "company_assets_read_anyone"
  on storage.objects for select
  using (bucket_id = 'company-assets');

drop policy if exists "company_assets_insert_auth" on storage.objects;
create policy "company_assets_insert_auth"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'company-assets');

drop policy if exists "company_assets_update_auth" on storage.objects;
create policy "company_assets_update_auth"
  on storage.objects for update to authenticated
  using (bucket_id = 'company-assets')
  with check (bucket_id = 'company-assets');

drop policy if exists "company_assets_delete_auth" on storage.objects;
create policy "company_assets_delete_auth"
  on storage.objects for delete to authenticated
  using (bucket_id = 'company-assets');

-- 3. Setting tabel: izinkan baca publik (untuk login & branding)
alter table "Setting" enable row level security;

drop policy if exists "setting_read_public" on "Setting";
create policy "setting_read_public"
  on "Setting" for select
  using (true);

drop policy if exists "setting_write_owner" on "Setting";
create policy "setting_write_owner"
  on "Setting" for all to authenticated
  using (public.current_user_role() = 'OWNER')
  with check (public.current_user_role() = 'OWNER');

-- 4. Pastikan updated_at punya default agar insert seed tidak gagal
alter table "Setting" alter column updated_at set default now();

-- 5. Seed default settings (hanya jika key belum ada)
do $$
begin
  if not exists (select 1 from "Setting" where "key" = 'company_name') then
    insert into "Setting" ("key", "value", "type") values ('company_name', 'AtoneJaya', 'text');
  end if;
  if not exists (select 1 from "Setting" where "key" = 'company_tagline') then
    insert into "Setting" ("key", "value", "type") values ('company_tagline', 'Sistem Penjualan Konsinyasi', 'text');
  end if;
  if not exists (select 1 from "Setting" where "key" = 'company_address') then
    insert into "Setting" ("key", "value", "type") values ('company_address', '', 'text');
  end if;
  if not exists (select 1 from "Setting" where "key" = 'company_phone') then
    insert into "Setting" ("key", "value", "type") values ('company_phone', '', 'text');
  end if;
  if not exists (select 1 from "Setting" where "key" = 'company_logo_url') then
    insert into "Setting" ("key", "value", "type") values ('company_logo_url', '', 'text');
  end if;
  if not exists (select 1 from "Setting" where "key" = 'commission_per_cup') then
    insert into "Setting" ("key", "value", "type") values ('commission_per_cup', '500', 'number');
  end if;
  if not exists (select 1 from "Setting" where "key" = 'fuel_allowance') then
    insert into "Setting" ("key", "value", "type") values ('fuel_allowance', '10000', 'number');
  end if;
  if not exists (select 1 from "Setting" where "key" = 'numbering_faktur') then
    insert into "Setting" ("key", "value", "type") values ('numbering_faktur', 'SO-[YYYYMM]-NNN', 'text');
  end if;
  if not exists (select 1 from "Setting" where "key" = 'numbering_payment') then
    insert into "Setting" ("key", "value", "type") values ('numbering_payment', 'PAY-[YYYYMM]-NNN', 'text');
  end if;
  if not exists (select 1 from "Setting" where "key" = 'numbering_visit') then
    insert into "Setting" ("key", "value", "type") values ('numbering_visit', 'VIS-[YYYYMM]-NNN', 'text');
  end if;
  if not exists (select 1 from "Setting" where "key" = 'numbering_return') then
    insert into "Setting" ("key", "value", "type") values ('numbering_return', 'RET-[YYYYMM]-NNN', 'text');
  end if;
  if not exists (select 1 from "Setting" where "key" = 'numbering_setoran') then
    insert into "Setting" ("key", "value", "type") values ('numbering_setoran', 'SET-[YYYYMM]-NNN', 'text');
  end if;
  if not exists (select 1 from "Setting" where "key" = 'numbering_stock_issue') then
    insert into "Setting" ("key", "value", "type") values ('numbering_stock_issue', 'LOD-[YYYYMM]-NNN', 'text');
  end if;
end $$;
