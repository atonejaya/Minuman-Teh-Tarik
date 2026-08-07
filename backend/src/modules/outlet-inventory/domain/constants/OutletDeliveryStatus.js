'use strict';

/**
 * Status dokumen OutletDelivery (SPRINT 11.1A).
 * Mencerminkan enum "OutletDeliveryStatus" pada database.
 *  - PENDING : delivery dibuat, belum diposting ke stok outlet
 *  - POSTED  : ledger + projection sudah diperbarui (idempotent, tidak di-post ulang)
 *  - FAILED  : posting gagal; hanya status ini yang boleh dicoba ulang (retry)
 */
const OutletDeliveryStatus = {
  PENDING: 'PENDING',
  POSTED: 'POSTED',
  FAILED: 'FAILED'
};

const RETRYABLE_STATUSES = [OutletDeliveryStatus.PENDING, OutletDeliveryStatus.FAILED];

module.exports = { OutletDeliveryStatus, RETRYABLE_STATUSES };
