'use strict';

/**
 * Movement WarehouseLedger (SPRINT 11.2A).
 * Mencerminkan enum "WarehouseMovementType" pada database.
 * Ledger gudang hanya mencatat mutasi stok dari perspektif gudang:
 *  - ISSUE_TO_SALES  : stok gudang berkurang (keluar ke sales)
 *  - RETURN_FROM_SALES : stok gudang bertambah (masuk kembali dari sales)
 */
const WarehouseMovementType = {
  ISSUE_TO_SALES: 'ISSUE_TO_SALES',
  RETURN_FROM_SALES: 'RETURN_FROM_SALES'
};

module.exports = { WarehouseMovementType };
