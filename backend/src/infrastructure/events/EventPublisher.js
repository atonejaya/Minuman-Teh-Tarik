/**
 * Interface for Event Publisher
 * Application layer should only depend on this interface to publish events.
 */
class EventPublisher {
  /**
   * Publish a single event
   * @param {DomainEvent} event 
   */
  async publish(event) {
    throw new Error('Method not implemented.');
  }

  /**
   * Publish multiple events
   * @param {DomainEvent[]} events 
   */
  async publishMany(events) {
    throw new Error('Method not implemented.');
  }
}

module.exports = EventPublisher;
