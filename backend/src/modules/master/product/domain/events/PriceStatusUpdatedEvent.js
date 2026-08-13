'use strict';

const DomainEvent = require('../../../../../domain/events/DomainEvent');

class PriceStatusUpdatedEvent extends DomainEvent {
  constructor(priceId, payload, metadata = {}) {
    super(priceId, 'ProductPrice', payload, metadata, 1);
  }
}

module.exports = PriceStatusUpdatedEvent;
