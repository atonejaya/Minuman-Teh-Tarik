/**
 * Interface for Event Subscribers
 * Application layer implementations should extend or implement this to receive events.
 */
class EventSubscriber {
  /**
   * Returns an array of Event classes (or event names) that this subscriber handles.
   * @returns {Array<Function|string>}
   */
  handles() {
    throw new Error('Method not implemented.');
  }

  /**
   * Processes the published event.
   * @param {DomainEvent} event 
   */
  async handle(event) {
    throw new Error('Method not implemented.');
  }
}

module.exports = EventSubscriber;
