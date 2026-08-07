const DomainEvent = require('./DomainEvent');

class SalesStockIssuedEvent extends DomainEvent {
  constructor(issueId, payload, metadata = {}) {
    super(issueId, 'SalesStockIssue', payload, metadata, 1);
  }
}

module.exports = SalesStockIssuedEvent;
