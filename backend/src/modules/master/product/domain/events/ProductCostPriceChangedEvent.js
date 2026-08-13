'use strict';

const DomainEvent = require('../../../../../domain/events/DomainEvent');

class ProductCostPriceChangedEvent extends DomainEvent {
  constructor(productId, payload, metadata = {}) {
    super(productId, 'Product', payload, metadata, 1);
  }
}

module.exports = ProductCostPriceChangedEvent;
