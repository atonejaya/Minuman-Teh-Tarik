const DomainEvent = require('../../../../domain/events/DomainEvent');

class SalesCalculatedEvent extends DomainEvent {
  constructor(warungId, payload, metadata = {}) {
    super(warungId, 'OutletInventory', payload, metadata, 1);
  }
}

module.exports = SalesCalculatedEvent;
