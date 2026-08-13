/**
 * OutletMovementType value object.
 * Ledger hanya menyimpan MUTASI stok (Source of Truth).
 * Observasi fisik (stock count) BUKAN sebuah movement.
 */
module.exports = Object.freeze({
  ISSUE_TO_OUTLET: 'ISSUE_TO_OUTLET',
  REFILL: 'REFILL',
  SALE: 'SALE',
  RETURN_GOOD: 'RETURN_GOOD',
  RETURN_BAD: 'RETURN_BAD',
  ADJUSTMENT: 'ADJUSTMENT'
});
