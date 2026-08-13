'use strict';

const DomainEvent = require('../../../../../domain/events/DomainEvent');

class CustomerCategoryChangedEvent extends DomainEvent {
  constructor(customerId, payload, metadata = {}) {
    super(customerId, 'Customer', payload, metadata, 1);
  }
}

module.exports = CustomerCategoryChangedEvent;
