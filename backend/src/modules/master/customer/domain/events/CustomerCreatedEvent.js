'use strict';

const DomainEvent = require('../../../../../domain/events/DomainEvent');

class CustomerCreatedEvent extends DomainEvent {
  constructor(customerId, payload, metadata = {}) {
    super(customerId, 'Customer', payload, metadata, 1);
  }
}

module.exports = CustomerCreatedEvent;
