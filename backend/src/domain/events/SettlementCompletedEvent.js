const DomainEvent = require('./DomainEvent');

class SettlementCompletedEvent extends DomainEvent {
  constructor(settlementId, payload, metadata = {}) {
    super(settlementId, 'WarehouseSettlement', payload, metadata, 1);
  }
}

module.exports = SettlementCompletedEvent;
