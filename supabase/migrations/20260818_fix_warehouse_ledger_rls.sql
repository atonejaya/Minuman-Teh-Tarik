-- Fix: Tambah RLS policy SELECT untuk SALES di WarehouseLedger
-- Sebelumnya hanya OWNER yang bisa baca, sehingga menu Mutasi & Retur
-- tidak menampilkan data untuk user dengan role SALES.

drop policy if exists p_WarehouseLedger_sales_select on public."WarehouseLedger";
create policy p_WarehouseLedger_sales_select on public."WarehouseLedger"
  for select to authenticated
  using (
    public.current_user_role() = 'OWNER'
    or sales_id = public.current_user_id()
  );
