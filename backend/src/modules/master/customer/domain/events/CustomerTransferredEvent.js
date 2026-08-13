'use strict';

const DomainEvent = require('../../../../../domain/events/DomainEvent');

class CustomerTransferredEvent extends DomainEvent {
  constructor(customerId, payload, metadata = {}) {
    super(customerId, 'Customer', payload, metadata, 1);
  }
}

module.exports = CustomerTransferredEvent;
