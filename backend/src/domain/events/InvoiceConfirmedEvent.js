const DomainEvent = require('./DomainEvent');

class InvoiceConfirmedEvent extends DomainEvent {
  constructor(invoiceId, payload, metadata = {}) {
    super(invoiceId, 'SalesTransaction', payload, metadata, 1);
  }
}

module.exports = InvoiceConfirmedEvent;
