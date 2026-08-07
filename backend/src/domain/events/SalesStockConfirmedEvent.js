const DomainEvent = require('./DomainEvent');

class SalesStockConfirmedEvent extends DomainEvent {
  constructor(issueId, payload, metadata = {}) {
    super(issueId, 'SalesStockIssue', payload, metadata, 1);
  }
}

module.exports = SalesStockConfirmedEvent;
