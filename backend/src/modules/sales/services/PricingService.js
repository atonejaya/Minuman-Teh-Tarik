const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class PricingService {
  /**
   * Calculate active price for a customer and product on a specific date.
   * Hierarchy: 
   * 1. Query Customer (Warung) -> get category_id (or PriceLevel mapping)
   * 2. Query ProductPrice for product_id matching price_level_id and date within effective_from/effective_until. 
   * 3. If not found, fallback to the lowest priority PriceLevel (e.g. Retail).
   * 
   * @param {number} customerId - The Warung ID
   * @param {number} productId - The Product ID
   * @param {Date} date - The date to check for effective price
   * @returns {Promise<number>} - The active price
   */
  async calculateActivePrice(customerId, productId, date = new Date()) {
    // 1. Query Customer (Warung) -> get category_id
    const customer = await prisma.warung.findUnique({
      where: { id: customerId },
      include: { category: true }
    });

    let targetPriceLevelId = null;

    if (customer && customer.category) {
      // Map category to PriceLevel (assuming code or name match for mapping)
      const priceLevel = await prisma.priceLevel.findFirst({
        where: {
          OR: [
            { code: customer.category.code },
            { name: customer.category.name }
          ],
          status: 'ACTIVE'
        }
      });
      if (priceLevel) {
        targetPriceLevelId = priceLevel.id;
      }
    }

    // Helper to find price for a specific level
    const findPriceForLevel = async (levelId) => {
      const priceRecord = await prisma.productPrice.findFirst({
        where: {
          product_id: productId,
          price_level_id: levelId,
          status: 'ACTIVE',
          OR: [
            { effective_from: null, effective_until: null },
            { effective_from: { lte: date }, effective_until: null },
            { effective_from: null, effective_until: { gte: date } },
            { effective_from: { lte: date }, effective_until: { gte: date } }
          ]
        },
        orderBy: { created_at: 'desc' }
      });
      return priceRecord;
    };

    // 2. Query ProductPrice for product_id matching price_level_id and date
    if (targetPriceLevelId) {
      const specificPrice = await findPriceForLevel(targetPriceLevelId);
      if (specificPrice) {
        return parseFloat(specificPrice.price);
      }
    }

    // 3. Fallback to the lowest priority PriceLevel
    const fallbackPriceLevel = await prisma.priceLevel.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { priority: 'asc' } // Lowest priority value
    });

    if (fallbackPriceLevel) {
      const fallbackPrice = await findPriceForLevel(fallbackPriceLevel.id);
      if (fallbackPrice) {
        return parseFloat(fallbackPrice.price);
      }
    }

    // Ultimate fallback to product's cost_price if no prices are defined
    const baseProduct = await prisma.product.findUnique({
      where: { id: productId }
    });

    return baseProduct ? parseFloat(baseProduct.cost_price) : 0;
  }
}

module.exports = new PricingService();
