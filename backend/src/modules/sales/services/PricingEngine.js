/**
 * Pricing Engine for Sales Module
 * Sprint 10.9 (Enterprise Certified)
 */

/**
 * Resolves the price for a product based on customer and date.
 * Hierarchy: Customer -> PriceLevel -> ProductPrice
 * Fallback: RETAIL
 * 
 * @param {Object} customer - Customer object with price_level_id
 * @param {Object} product - Product object
 * @param {Date} date - Date for price resolution
 * @returns {Object} Resolved price data
 */
function resolvePrice(customer, product, date) {
  const defaultResponse = {
    unit_price: product && typeof product.base_price === 'number' ? product.base_price : 0,
    price_source: 'RETAIL',
    price_level_id: null,
    price_level_name: null
  };

  if (!customer || !customer.price_level_id || !product || !product.price_levels) {
    return defaultResponse;
  }

  const levelPrice = product.price_levels[customer.price_level_id];
  if (levelPrice !== undefined && levelPrice !== null) {
    return {
      unit_price: typeof levelPrice.price === 'number' ? levelPrice.price : levelPrice,
      price_source: 'PRICE_LEVEL',
      price_level_id: customer.price_level_id,
      price_level_name: customer.price_level_name || null
    };
  }

  return defaultResponse;
}

/**
 * Resolves promotion for a product based on date.
 * 
 * @param {Object} product - Product object
 * @param {Date} date - Date for promotion resolution
 * @returns {Object|null}
 */
function resolvePromotion(product, date) {
  return null;
}

module.exports = {
  resolvePrice,
  resolvePromotion
};
