const InvoiceConfirmedEvent = require('../../../domain/events/InvoiceConfirmedEvent');
const PaymentCreatedEvent = require('../../../domain/events/PaymentCreatedEvent');
const CollectionCompletedEvent = require('../../../domain/events/CollectionCompletedEvent');
const ReturnConfirmedEvent = require('../../../domain/events/ReturnConfirmedEvent');
const SettlementCompletedEvent = require('../../../domain/events/SettlementCompletedEvent');

/**
 * Event Registry
 * Holds references to all available Domain Events in the system.
 */
const EventRegistry = {
  InvoiceConfirmedEvent,
  PaymentCreatedEvent,
  CollectionCompletedEvent,
  ReturnConfirmedEvent,
  SettlementCompletedEvent
};

module.exports = EventRegistry;
