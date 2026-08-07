const DomainEvent = require('./DomainEvent');

class CollectionCompletedEvent extends DomainEvent {
  constructor(collectionId, payload, metadata = {}) {
    super(collectionId, 'Collection', payload, metadata, 1);
  }
}

module.exports = CollectionCompletedEvent;
