const MovementType = require('../value-objects/MovementType');

/**
 * AutoSalesEngine (Domain Service)
 * Menghitung penjualan otomatis dari selisih saldo stok dengan hasil counting fisik.
 *
 * Formula: Sales = Current Balance - Physical Count
 *
 * Engine menghasilkan movement SALE yang akan ditulis ke Ledger.
 */
class AutoSalesEngine {
  /**
   * @param {Object} params
   * @param {number} params.currentBalance Saldo stok outlet saat ini (current_stock)
   * @param {number} params.physicalQty   Stok fisik hasil counting
   * @returns {{ calculatedSales: number, ledgerEntry: Object }}
   */
  static calculate({ currentBalance, physicalQty }) {
    if (!Number.isInteger(currentBalance) || currentBalance < 0) {
      throw new Error('currentBalance harus bilangan bulat >= 0');
    }
    if (!Number.isInteger(physicalQty) || physicalQty < 0) {
      throw new Error('physicalQty harus bilangan bulat >= 0');
    }

    const calculatedSales = Math.max(0, currentBalance - physicalQty);

    return {
      calculatedSales,
      ledgerEntry: {
        movementType: MovementType.SALE,
        qtyBefore: currentBalance,
        qtyChange: -calculatedSales,
        qtyAfter: physicalQty
      }
    };
  }
}

module.exports = AutoSalesEngine;
