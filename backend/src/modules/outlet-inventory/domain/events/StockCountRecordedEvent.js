const DomainEvent = require('../../../../domain/events/DomainEvent');

class StockCountRecordedEvent extends DomainEvent {
  constructor(countId, payload, metadata = {}) {
    super(countId, 'OutletInventory', payload, metadata, 1);
  }
}

module.exports = StockCountRecordedEvent;
