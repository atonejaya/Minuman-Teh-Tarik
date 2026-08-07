const EventEmitter = require('events');

/**
 * Adapter for Node.js EventEmitter
 * Abstracts away the specific implementation of EventEmitter.
 */
class NodeEventEmitterAdapter {
  constructor() {
    this.emitter = new EventEmitter();
    // Allow more listeners if necessary
    this.emitter.setMaxListeners(50);
  }

  on(eventName, listener) {
    this.emitter.on(eventName, listener);
  }

  off(eventName, listener) {
    this.emitter.off(eventName, listener);
  }

  emit(eventName, payload) {
    // Make emission asynchronous
    setImmediate(() => {
      this.emitter.emit(eventName, payload);
    });
  }
  
  listenerCount(eventName) {
    return this.emitter.listenerCount(eventName);
  }
}

module.exports = NodeEventEmitterAdapter;
