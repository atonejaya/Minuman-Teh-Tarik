-- ============================================================================
-- Minuman @One - Create User table (idempotent)
-- Date: 2026-08-19
--
-- Tabel User sebelumnya dibuat manual di SQL Editor, sehingga PostgREST
-- schema cache tidak otomatis refresh. Migration ini membuat tabel secara
-- idempotent (CREATE TABLE IF NOT EXISTS) supaya bisa dijalankan ulang
-- tanpa error, lalu NOTIFY pgrst agar schema cache refresh.
--
-- CATATAN:
-- - auth_id adalah UUID yang link ke auth.users.id
-- - Tabel ini di-reference oleh ~20 tabel lain via FK
-- - RLS di-enable di foundation migration (202608140001)
-- ============================================================================

-- 1. Buat tabel jika belum ada
CREATE TABLE IF NOT EXISTS public."User" (
  id            serial PRIMARY KEY,
  auth_id       uuid UNIQUE NOT NULL,
  username      text UNIQUE NOT NULL,
  name          text NOT NULL,
  role          text NOT NULL DEFAULT 'SALES',
  phone         text,
  area_id       int,
  is_active     boolean NOT NULL DEFAULT true,
  password_hash text,
  email         text,
  updated_at    timestamp DEFAULT now()
);

-- 2. Kolom area_id harusnya punya FK ke Area (jika tabel Area sudah ada)
--    Cek berdasarkan relasi (kolom + referensi), bukan nama constraint,
--    karena manual SQL Editor mungkin pakai nama berbeda (huruf besar/kecil).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Area'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public."User"'::regclass
        AND contype = 'f'
        AND conkey = ARRAY[
          (SELECT attnum FROM pg_attribute WHERE attrelid = 'public."User"'::regclass AND attname = 'area_id')
        ]
    ) THEN
      ALTER TABLE public."User"
        ADD CONSTRAINT user_area_id_fkey
        FOREIGN KEY (area_id) REFERENCES public."Area"(id);
    END IF;
  END IF;
END $$;

-- 3. Index untuk query login (auth_id) dan lookup by username
CREATE INDEX IF NOT EXISTS idx_user_auth_id ON public."User"(auth_id);
CREATE INDEX IF NOT EXISTS idx_user_username ON public."User"(username);

-- 4. Refresh PostgREST schema cache agar tabel langsung bisa di-query
NOTIFY pgrst, 'reload schema';
