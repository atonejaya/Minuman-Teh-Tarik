-- ============================================================================
-- Minuman @One - Create sales user (auth + profile)
-- Date: 2026-08-16
-- Applies via: Supabase SQL Editor.
--
-- Perbaikan bug "null value in column password_hash of relation User violates
-- not-null constraint" saat OWNER menambah sales baru. Form lama hanya insert
-- public."User" tanpa password_hash dan tanpa membuat entri auth (login app
-- memakai Supabase Auth via email '<username>@tehtarik.local', lihat
-- AuthContext.jsx). RPC ini:
--   1. Membuat auth.users (email + bcrypt password) sehingga bisa login.
--   2. Membuat auth.identities (email provider) agar login berfungsi.
--   3. Membuat public."User" lengkap dengan auth_id, role, password_hash.
-- SECURITY DEFINER: hanya OWNER yang boleh memanggil.
--
-- CATATAN: crypt/gen_salt berasal dari ekstensi pgcrypto. Supabase modern
-- menginstal ekstensi ke schema "extensions", jadi search_path fungsi harus
-- menyertakannya (selain public).
-- ============================================================================

create extension if not exists pgcrypto;

drop function if exists public.create_sales_user(text, text, text, text, text, int, boolean);

create or replace function public.create_sales_user(
  p_username text,
  p_password text,
  p_name text,
  p_role text default 'SALES',
  p_phone text default null,
  p_area_id int default null,
  p_is_active boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_email     text;
  v_auth_id   uuid := gen_random_uuid();
  v_encrypted text;
  v_user_id   int;
begin
  if public.current_user_role() <> 'OWNER' then
    raise exception 'Not authorized';
  end if;
  if p_username is null or trim(p_username) = '' then
    raise exception 'Username wajib diisi';
  end if;
  if p_password is null or length(p_password) < 6 then
    raise exception 'Password minimal 6 karakter';
  end if;
  if p_name is null or trim(p_name) = '' then
    raise exception 'Nama wajib diisi';
  end if;
  if p_role not in ('SALES', 'OWNER') then
    raise exception 'Role tidak valid';
  end if;

  v_email := trim(p_username) || '@tehtarik.local';

  if exists (select 1 from public."User" where username = trim(p_username)) then
    raise exception 'Username sudah digunakan';
  end if;
  if exists (select 1 from auth.users where email = v_email) then
    raise exception 'Username sudah digunakan';
  end if;

  v_encrypted := crypt(p_password, gen_salt('bf'));

  insert into auth.users
    (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
     raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values
    ('00000000-0000-0000-0000-000000000000', v_auth_id, 'authenticated', 'authenticated',
     v_email, v_encrypted, now(),
     '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());

  insert into auth.identities
    (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values
    (v_auth_id, v_auth_id, v_auth_id,
     jsonb_build_object('sub', v_auth_id::text, 'email', v_email), 'email',
     now(), now(), now());

  insert into public."User"
    (auth_id, username, name, role, phone, area_id, is_active, password_hash, updated_at)
  values
    (v_auth_id, trim(p_username), trim(p_name), p_role::public."UserRole",
     nullif(trim(p_phone), ''), p_area_id, coalesce(p_is_active, true), v_encrypted, now())
  returning id into v_user_id;

  return jsonb_build_object('success', true, 'user_id', v_user_id);
exception
  when others then
    raise exception 'create_sales_user failed: %', SQLERRM;
end;
$$;

revoke execute on function public.create_sales_user(text, text, text, text, text, int, boolean) from public, anon;
grant execute on function public.create_sales_user(text, text, text, text, text, int, boolean) to authenticated;
