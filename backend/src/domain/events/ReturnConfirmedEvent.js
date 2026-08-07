const DomainEvent = require('./DomainEvent');

class ReturnConfirmedEvent extends DomainEvent {
  constructor(returnId, payload, metadata = {}) {
    super(returnId, 'SalesReturn', payload, metadata, 1);
  }
}

module.exports = ReturnConfirmedEvent;
