/**
 * AutoRefillEngine (Domain Service)
 * Menghitung kebutuhan refill untuk mengembalikan stok outlet ke Par Stock.
 *
 * Formula: Required Refill = max(0, Par Stock - Physical Stock)
 *
 * Engine HANYA menghitung kebutuhan refill.
 * Belum mengurangi stok Sales (eksekusi refill di luar sprint ini).
 */
class AutoRefillEngine {
  /**
   * @param {Object} params
   * @param {number} params.parQty      Target par stock produk di outlet
   * @param {number} params.physicalQty Stok fisik hasil counting
   * @returns {{ requiredRefill: number }}
   */
  static calculate({ parQty, physicalQty }) {
    if (!Number.isInteger(parQty) || parQty < 0) {
      throw new Error('parQty harus bilangan bulat >= 0');
    }
    if (!Number.isInteger(physicalQty) || physicalQty < 0) {
      throw new Error('physicalQty harus bilangan bulat >= 0');
    }

    return {
      requiredRefill: Math.max(0, parQty - physicalQty)
    };
  }
}

module.exports = AutoRefillEngine;
