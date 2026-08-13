/**
 * Pricing Accessor (G2)
 * Resolves pricing using the current ProductPrice contract:
 *   ProductPrice { product_id, price_level_id, price, effective_from, effective_until, status }
 * RETAIL is identified by PriceLevel.code === 'PL-RETAIL' (seeded by Sprint 10.8A migration).
 */
class PricingAccessorService {
  /**
   * Resolve the active RETAIL unit price for a product.
   * @param {Object} tx - Prisma client or transaction client
   * @param {number} productId
   * @returns {Promise<number|null>} unit price as Number, or null when no active RETAIL price exists
   */
  async resolveRetailUnitPrice(tx, productId) {
    const now = new Date();
    const priceRecord = await tx.productPrice.findFirst({
      where: {
        product_id: productId,
        status: 'ACTIVE',
        price_level: { code: 'PL-RETAIL', status: 'ACTIVE' },
        OR: [
          { effective_from: null, effective_until: null },
          { effective_from: { lte: now }, effective_until: null },
          { effective_from: null, effective_until: { gte: now } },
          { effective_from: { lte: now }, effective_until: { gte: now } }
        ]
      },
      orderBy: { created_at: 'desc' }
    });

    if (!priceRecord || priceRecord.status !== 'ACTIVE') return null;

    const unitPrice = parseFloat(priceRecord.price);
    return Number.isFinite(unitPrice) ? unitPrice : null;
  }
}

module.exports = new PricingAccessorService();
