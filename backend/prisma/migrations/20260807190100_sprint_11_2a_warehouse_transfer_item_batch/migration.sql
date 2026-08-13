-- Sprint 11.2A (revision) - add batch_id to WarehouseTransferItem
-- batch_id mencatat batch tujuan RETURN (stok gudang per batch) agar
-- retry idempotent memakai dokumen tersimpan tanpa input ulang client.

ALTER TABLE "WarehouseTransferItem" ADD COLUMN "batch_id" INTEGER;

ALTER TABLE "WarehouseTransferItem" ADD CONSTRAINT "WarehouseTransferItem_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "ProductBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
