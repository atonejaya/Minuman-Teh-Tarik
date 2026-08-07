const EventRegistry = require('../registry/EventRegistry');

/**
 * Event Factory
 * Reconstructs DomainEvent instances from OutboxEvent records.
 * Uses EventRegistry to avoid switch-case and follow Open/Closed Principle.
 */
class EventFactory {
  /**
   * Create a DomainEvent instance from an Outbox record.
   * @param {Object} outboxRecord The OutboxEvent record from the database.
   * @returns {DomainEvent}
   */
  static fromOutbox(outboxRecord) {
    const EventClass = EventRegistry[outboxRecord.event_name];
    
    if (!EventClass) {
      throw new Error(`Event constructor for '${outboxRecord.event_name}' not found in EventRegistry.`);
    }

    const metadata = outboxRecord.metadata || {};
    metadata.correlationId = outboxRecord.correlation_id;
    metadata.causationId = outboxRecord.causation_id;
    metadata._eventId = outboxRecord.id;
    
    // Convert to ISO string in case it's a JS Date object from Prisma
    metadata._occurredAt = outboxRecord.occurred_at instanceof Date 
        ? outboxRecord.occurred_at.toISOString() 
        : outboxRecord.occurred_at;

    // Construct the event
    const event = new EventClass(
      outboxRecord.aggregate_id,
      outboxRecord.payload,
      metadata
    );

    return event;
  }
}

module.exports = EventFactory;
