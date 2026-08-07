const DomainEvent = require('../../../../domain/events/DomainEvent');

class OutletProjectionUpdatedEvent extends DomainEvent {
  constructor(warungId, payload, metadata = {}) {
    super(warungId, 'OutletInventory', payload, metadata, 1);
  }
}

module.exports = OutletProjectionUpdatedEvent;
