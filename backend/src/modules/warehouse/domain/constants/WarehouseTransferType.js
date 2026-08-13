'use strict';

/**
 * Tipe dokumen WarehouseTransfer (SPRINT 11.2A).
 * Mencerminkan enum "WarehouseTransferType" pada database.
 *  - ISSUE  : gudang mengeluarkan stok ke sales (Warehouse -> Sales)
 *  - RETURN : sales mengembalikan stok ke gudang (Sales -> Warehouse)
 */
const WarehouseTransferType = {
  ISSUE: 'ISSUE',
  RETURN: 'RETURN'
};

module.exports = { WarehouseTransferType };
