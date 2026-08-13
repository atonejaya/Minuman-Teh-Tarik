'use strict';

const DomainEvent = require('../../../../../domain/events/DomainEvent');

class PriceExpiredEvent extends DomainEvent {
  constructor(priceId, payload, metadata = {}) {
    super(priceId, 'ProductPrice', payload, metadata, 1);
  }
}

module.exports = PriceExpiredEvent;
