'use strict';

const DomainEvent = require('../../../../domain/events/DomainEvent');

class PaymentReceivedEvent extends DomainEvent {
  constructor(transactionId, payload, metadata = {}) {
    super(transactionId, 'SalesTransaction', payload, metadata, 1);
  }
}

module.exports = PaymentReceivedEvent;
