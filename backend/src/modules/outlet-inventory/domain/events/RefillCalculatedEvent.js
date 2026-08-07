const DomainEvent = require('../../../../domain/events/DomainEvent');

class RefillCalculatedEvent extends DomainEvent {
  constructor(warungId, payload, metadata = {}) {
    super(warungId, 'OutletInventory', payload, metadata, 1);
  }
}

module.exports = RefillCalculatedEvent;
