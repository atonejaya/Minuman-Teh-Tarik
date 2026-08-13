'use strict';

const DomainEvent = require('../../../../../domain/events/DomainEvent');

class PaymentCompletedEvent extends DomainEvent {
  constructor(paymentId, payload, metadata = {}) {
    super(paymentId, 'PAYMENT', payload, metadata, 1);
  }
}

module.exports = PaymentCompletedEvent;
