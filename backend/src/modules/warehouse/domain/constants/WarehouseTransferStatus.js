'use strict';

/**
 * Status dokumen WarehouseTransfer (SPRINT 11.2A).
 * Mencerminkan enum "WarehouseTransferStatus" pada database.
 *  - PENDING : transfer dibuat, belum diposting ke stok gudang/sales
 *  - POSTED  : WarehouseLedger + stok sudah dimutasi (idempotent, tidak di-post ulang)
 *  - FAILED  : posting gagal; hanya status ini yang boleh dicoba ulang (retry)
 */
const WarehouseTransferStatus = {
  PENDING: 'PENDING',
  POSTED: 'POSTED',
  FAILED: 'FAILED'
};

const RETRYABLE_STATUSES = [WarehouseTransferStatus.PENDING, WarehouseTransferStatus.FAILED];

module.exports = { WarehouseTransferStatus, RETRYABLE_STATUSES };
