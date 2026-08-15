-- ============================================================================
-- Minuman @One - Reset data operasional
-- Date: 2026-08-15
-- Applies via: Supabase SQL Editor.
--
-- Menghapus SELURUH data operasional (transaksi, kunjungan, retur, stok
-- masuk/keluar, piutang, setoran, ledger, projection, foto kunjungan, batch,
-- penomoran) dalam SATU transaksi atomik. Data master tetap dipertahankan.
-- Fitur sementara untuk masa development; tombol UI dihapus saat rilis.
-- ============================================================================

drop function if exists public.admin_reset_data(text);

create or replace function public.admin_reset_data(p_confirm text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if public.current_user_role() <> 'OWNER' then
    raise exception 'Not authorized';
  end if;
  if p_confirm is distinct from 'RESET' then
    raise exception 'Konfirmasi tidak sesuai. Ketik RESET untuk melanjutkan.';
  end if;

  -- urutan child -> parent (aman FK), satu transaksi otomatis.
  -- SalesTransaction (terakhir-2) & SalesVisit (terakhir) dihapus paling akhir
  -- karena banyak tabel mereferensikannya (visit_id / sales_transaction_id / last_visit_id).
  -- Semua delete diberi `where true` agar lolos guard pg_safeupdate
  -- (Supabase memblokir DELETE/UPDATE tanpa WHERE).
  delete from public."PaymentAllocation" where true;
  delete from public."SalesTransactionItem" where true;
  delete from public."SalesStockIssueItem" where true;
  delete from public."SalesStockIssueHistory" where true;
  delete from public."SalesVisitActivity" where true;
  delete from public."OutletStockCountItem" where true;
  delete from public."OutletStockCount" where true;
  delete from public."SalesVisitPhoto" where true;
  delete from public."SalesReturnItem" where true;
  delete from public."ARLedger" where true;
  delete from public."CustomerARProjection" where true;
  delete from public."AccountsReceivableProjection" where true;
  delete from public."Payment" where true;
  delete from public."SalesReturn" where true;
  delete from public."OutletStockLedger" where true;
  delete from public."OutletStockProjection" where true;
  delete from public."SalesStockLedger" where true;
  delete from public."CollectionItem" where true;
  delete from public."Collection" where true;
  delete from public."SalesStockProjection" where true;
  delete from public."SalesStockIssue" where true;
  delete from public."WarehouseLedger" where true;
  delete from public."WarehouseStock" where true;
  delete from public."WarehouseStockInItem" where true;
  delete from public."WarehouseStockIn" where true;
  delete from public."ProductBatch" where true;
  delete from public."FinanceIdempotencyKey" where true;
  delete from public."NumberSequence" where true;
  delete from public."SalesTransaction" where true;
  delete from public."SalesVisit" where true;

  -- CATATAN: foto kunjungan TIDAK dihapus di sini.
  -- Supabase memblokir `delete` langsung dari storage.objects
  -- (wajib lewat Storage API). Frontend menghapusnya setelah RPC sukses:
  -- list semua file di bucket visit-photos lalu storage.remove(paths).

  return jsonb_build_object('success', true, 'message', 'Semua data operasional berhasil direset');
exception
  when others then
    raise exception 'admin_reset_data failed: %', SQLERRM;
end;
$$;

revoke execute on function public.admin_reset_data(text) from public, anon;
grant execute on function public.admin_reset_data(text) to authenticated;

-- Izinkan OWNER menghapus objek di bucket visit-photos lewat Storage API.
drop policy if exists p_visit_photos_delete_owner on storage.objects;
create policy p_visit_photos_delete_owner on storage.objects
  for delete to authenticated
  using (bucket_id = 'visit-photos' and public.current_user_role() = 'OWNER');
