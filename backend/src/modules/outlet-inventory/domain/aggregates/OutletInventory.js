const AutoSalesEngine = require('../services/AutoSalesEngine');
const AutoRefillEngine = require('../services/AutoRefillEngine');

/**
 * OutletInventory aggregate
 * Mewakili persediaan satu outlet. Memegang aturan bisnis inti:
 * - Sales = Current Balance - Physical Count (AutoSalesEngine)
 * - Required Refill = max(0, Par Stock - Physical Stock) (AutoRefillEngine)
 *
 * Aggregate TIDAK menyentuh database. Persistensi dilakukan oleh
 * application service (transaction boundary).
 */
class OutletInventory {
  /**
   * @param {number} warungId
   */
  constructor(warungId) {
    this.warungId = Number(warungId);
  }

  /**
   * Menghitung penjualan & kebutuhan refill untuk satu baris stock count.
   * @param {Object} params
   * @param {number} params.productId
   * @param {number} params.physicalQty
   * @param {number} params.currentBalance Saldo stok outlet sebelum counting
   * @param {number} params.parQty         Target par stock produk
   * @param {number} params.denominator    Jumlah barang tersedia untuk sell-through (opening + refill)
   * @returns {Object} hasil perhitungan domain
   */
  processItem({ productId, physicalQty, currentBalance = 0, parQty = 0, denominator = null }) {
    const salesResult = AutoSalesEngine.calculate({ currentBalance, physicalQty });
    const refillResult = AutoRefillEngine.calculate({ parQty, physicalQty });

    const sellThroughDenom = denominator === null ? currentBalance : denominator;
    const sellThrough = sellThroughDenom > 0
      ? Math.min(100, Math.round((salesResult.calculatedSales / sellThroughDenom) * 10000) / 100)
      : 0;

    return {
      productId: Number(productId),
      physicalQty,
      currentBalance,
      parQty,
      calculatedSales: salesResult.calculatedSales,
      requiredRefill: refillResult.requiredRefill,
      sellThrough,
      ledgerEntry: salesResult.ledgerEntry
    };
  }

  /**
   * Menghitung seluruh items sekaligus.
   * @param {Array<{productId, physicalQty, currentBalance, parQty, denominator}>} items
   * @returns {Array} hasil per produk
   */
  processItems(items) {
    return items.map(item => this.processItem(item));
  }
}

module.exports = OutletInventory;
