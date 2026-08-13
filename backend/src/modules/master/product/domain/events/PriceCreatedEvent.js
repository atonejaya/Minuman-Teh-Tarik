'use strict';

const DomainEvent = require('../../../../../domain/events/DomainEvent');

class PriceCreatedEvent extends DomainEvent {
  constructor(priceId, payload, metadata = {}) {
    super(priceId, 'ProductPrice', payload, metadata, 1);
  }
}

module.exports = PriceCreatedEvent;
