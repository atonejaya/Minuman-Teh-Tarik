-- Sprint 11.2A (revision) - add TRANSFER to ReferenceType enum
-- InventoryMovement.reference_type dipakai dokumen WarehouseTransfer
-- (issue/return) untuk audit stok gudang, additive pada enum yang ada.

ALTER TYPE "ReferenceType" ADD VALUE IF NOT EXISTS 'TRANSFER';
