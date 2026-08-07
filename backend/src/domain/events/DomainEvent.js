const crypto = require('crypto');
const deepFreeze = require('../../utils/deepFreeze');

class DomainEvent {
  constructor(aggregateId, aggregateType, payload, metadata = {}, version = 1) {
    if (new.target === DomainEvent) {
      throw new TypeError('Cannot construct DomainEvent instances directly');
    }

    const eventName = this.constructor.name;
    
    // Naming convention check: <Aggregate><PastTense>Event
    if (!eventName.endsWith('Event')) {
      throw new Error(`Event name '${eventName}' must end with 'Event'`);
    }

    this.eventId = metadata._eventId || crypto.randomUUID();
    this.eventName = eventName;
    this.aggregateId = aggregateId;
    this.aggregateType = aggregateType;
    this.occurredAt = metadata._occurredAt || new Date().toISOString(); // ISO-8601 UTC
    this.correlationId = metadata.correlationId || crypto.randomUUID();
    this.causationId = metadata.causationId || this.eventId;
    this.version = version;
    this.payload = payload;
    
    this.metadata = {
      userId: metadata.userId || null,
      source: metadata.source || 'system',
      ip: metadata.ip || null,
      userAgent: metadata.userAgent || null,
      ...metadata
    };

    // Make the entire event immutable
    deepFreeze(this);
  }
}

module.exports = DomainEvent;
