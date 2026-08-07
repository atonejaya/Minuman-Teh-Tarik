/**
 * Event Dispatcher
 * Responsible for routing the event to the subscriber, logging, and error isolation.
 */
class EventDispatcher {
  async dispatch(subscriber, event) {
    const subscriberName = subscriber.constructor.name;
    
    try {
      // Log EVENT_RECEIVED
      this._log('info', 'EVENT_RECEIVED', {
        subscriber: subscriberName,
        eventName: event.eventName,
        eventId: event.eventId,
        correlationId: event.correlationId
      });

      // Call the subscriber asynchronously to isolate execution
      await subscriber.handle(event);

    } catch (error) {
      // Isolate error so it doesn't crash the publisher or other subscribers
      this._log('error', 'EVENT_FAILED', {
        subscriber: subscriberName,
        eventName: event.eventName,
        eventId: event.eventId,
        error: error.message,
        stacktrace: error.stack
      });
    }
  }

  _log(level, type, data) {
    console[level](JSON.stringify({ type, ...data }));
  }
}

module.exports = EventDispatcher;
