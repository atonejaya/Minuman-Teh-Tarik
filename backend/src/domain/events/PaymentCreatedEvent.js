const DomainEvent = require('./DomainEvent');

class PaymentCreatedEvent extends DomainEvent {
  constructor(paymentId, payload, metadata = {}) {
    super(paymentId, 'Payment', payload, metadata, 1);
  }
}

module.exports = PaymentCreatedEvent;
