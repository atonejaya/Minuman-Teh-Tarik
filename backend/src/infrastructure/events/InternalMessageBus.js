const EventPublisher = require('./EventPublisher');

/**
 * Internal Message Bus Implementation
 * Connects the domain events to the EventDispatcher using an adapter.
 */
class InternalMessageBus extends EventPublisher {
  constructor(adapter, dispatcher) {
    super();
    this.adapter = adapter;
    this.dispatcher = dispatcher;
    this.subscribers = new Set();
  }

  /**
   * Register a subscriber to the bus.
   * Subscriber must implement `handles()` returning array of Event class names,
   * and `handle(event)` to process the event.
   */
  register(subscriber) {
    if (this.subscribers.has(subscriber)) {
      throw new Error(`Subscriber already registered: ${subscriber.constructor.name}`);
    }
    
    const eventsToHandle = subscriber.handles();
    if (!Array.isArray(eventsToHandle)) {
      throw new Error(`Subscriber ${subscriber.constructor.name} must return an array of event names from handles()`);
    }

    eventsToHandle.forEach(EventClass => {
      const eventName = typeof EventClass === 'function' ? EventClass.name : EventClass;
      // We pass the event name and the subscriber to the adapter via dispatcher bound function
      this.adapter.on(eventName, (event) => {
        this.dispatcher.dispatch(subscriber, event);
      });
    });

    this.subscribers.add(subscriber);
  }

  async publish(event) {
    if (!event || !event.eventName) {
      throw new Error('Invalid event published.');
    }
    
    // Log EVENT_PUBLISHED
    if (this._logger) {
      this._logger('info', 'EVENT_PUBLISHED', {
        eventName: event.eventName,
        aggregateId: event.aggregateId,
        occurredAt: event.occurredAt,
        correlationId: event.correlationId
      });
    } else {
      console.info(JSON.stringify({
        type: 'EVENT_PUBLISHED',
        eventName: event.eventName,
        aggregateId: event.aggregateId,
        occurredAt: event.occurredAt,
        correlationId: event.correlationId
      }));
    }

    // Delegate actual firing to adapter
    this.adapter.emit(event.eventName, event);
  }

  async publishMany(events) {
    if (!Array.isArray(events)) {
      throw new Error('publishMany expects an array of events.');
    }
    for (const event of events) {
      await this.publish(event);
    }
  }
}

module.exports = InternalMessageBus;
