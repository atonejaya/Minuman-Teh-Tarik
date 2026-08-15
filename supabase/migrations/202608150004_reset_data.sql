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
  delete from public."PaymentAllocation";
  delete from public."SalesTransactionItem";
  delete from public."SalesStockIssueItem";
  delete from public."SalesStockIssueHistory";
  delete from public."SalesVisitActivity";
  delete from public."OutletStockCountItem";
  delete from public."OutletStockCount";
  delete from public."SalesVisitPhoto";
  delete from public."SalesReturnItem";
  delete from public."ARLedger";
  delete from public."CustomerARProjection";
  delete from public."AccountsReceivableProjection";
  delete from public."Payment";
  delete from public."SalesReturn";
  delete from public."OutletStockLedger";
  delete from public."OutletStockProjection";
  delete from public."SalesStockLedger";
  delete from public."CollectionItem";
  delete from public."Collection";
  delete from public."SalesStockProjection";
  delete from public."SalesStockIssue";
  delete from public."WarehouseLedger";
  delete from public."WarehouseStock";
  delete from public."WarehouseStockInItem";
  delete from public."WarehouseStockIn";
  delete from public."ProductBatch";
  delete from public."FinanceIdempotencyKey";
  delete from public."NumberSequence";
  delete from public."SalesTransaction";
  delete from public."SalesVisit";

  -- hapus foto kunjungan dari storage
  delete from storage.objects where bucket_id = 'visit-photos';

  return jsonb_build_object('success', true, 'message', 'Semua data operasional berhasil direset');
exception
  when others then
    raise exception 'admin_reset_data failed: %', SQLERRM;
end;
$$;

revoke execute on function public.admin_reset_data(text) from public, anon;
grant execute on function public.admin_reset_data(text) to authenticated;
