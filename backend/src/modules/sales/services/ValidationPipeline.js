/**
 * Validation Pipeline for Sales Module
 * Sprint 11.0A
 */

function validateCustomer(customer) {
  if (!customer) {
    throw new Error('Customer is required');
  }
  // Basic sanity checks
  if (customer.status && customer.status === 'INACTIVE') {
    throw new Error('Customer is inactive');
  }
}

function validateProduct(product) {
  if (!product) {
    throw new Error('Product is required');
  }
}

function validatePricing(priceData) {
  if (!priceData) {
    throw new Error('Price data is required');
  }
  if (typeof priceData.unit_price !== 'undefined' && priceData.unit_price < 0) {
    throw new Error('Unit price cannot be negative');
  }
}

function validateInventory(inventory, qty) {
  if (!inventory) {
    throw new Error('Inventory is required');
  }
  if (typeof qty !== 'number' || qty <= 0) {
    throw new Error('Quantity must be greater than zero');
  }
  if (inventory.stock < qty) {
    throw new Error('Insufficient stock');
  }
}

function validatePayment(payment, outstanding) {
  if (!payment) {
    throw new Error('Payment is required');
  }
  if (payment.amount < 0) {
    throw new Error('Payment amount cannot be negative');
  }
}

module.exports = {
  validateCustomer,
  validateProduct,
  validatePricing,
  validateInventory,
  validatePayment
};
