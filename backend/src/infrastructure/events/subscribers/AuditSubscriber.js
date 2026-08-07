const EventSubscriber = require('./EventSubscriber');
const InvoiceConfirmedEvent = require('../../../domain/events/InvoiceConfirmedEvent');
const PaymentCreatedEvent = require('../../../domain/events/PaymentCreatedEvent');
const CollectionCompletedEvent = require('../../../domain/events/CollectionCompletedEvent');
const ReturnConfirmedEvent = require('../../../domain/events/ReturnConfirmedEvent');
const SettlementCompletedEvent = require('../../../domain/events/SettlementCompletedEvent');

class AuditSubscriber extends EventSubscriber {
  handles() {
    return [
      InvoiceConfirmedEvent,
      PaymentCreatedEvent,
      CollectionCompletedEvent,
      ReturnConfirmedEvent,
      SettlementCompletedEvent
    ];
  }

  async handle(event) {
    // Write simple log to prove it works
    // The EventDispatcher already logs 'EVENT_RECEIVED', so we just do a custom dummy action here.
    console.info(`[AuditSubscriber] Processed event ${event.eventName} for aggregate ${event.aggregateType}#${event.aggregateId}`);
  }
}

module.exports = AuditSubscriber;
