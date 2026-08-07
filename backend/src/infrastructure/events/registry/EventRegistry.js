const InvoiceConfirmedEvent = require('../../../domain/events/InvoiceConfirmedEvent');
const PaymentCreatedEvent = require('../../../domain/events/PaymentCreatedEvent');
const CollectionCompletedEvent = require('../../../domain/events/CollectionCompletedEvent');
const ReturnConfirmedEvent = require('../../../domain/events/ReturnConfirmedEvent');
const SettlementCompletedEvent = require('../../../domain/events/SettlementCompletedEvent');
const SalesStockIssuedEvent = require('../../../domain/events/SalesStockIssuedEvent');
const SalesStockConfirmedEvent = require('../../../domain/events/SalesStockConfirmedEvent');
const SalesStockClosedEvent = require('../../../domain/events/SalesStockClosedEvent');

/**
 * Event Registry
 * Holds references to all available Domain Events in the system.
 */
const EventRegistry = {
  InvoiceConfirmedEvent,
  PaymentCreatedEvent,
  CollectionCompletedEvent,
  ReturnConfirmedEvent,
  SettlementCompletedEvent,
  SalesStockIssuedEvent,
  SalesStockConfirmedEvent,
  SalesStockClosedEvent
};

module.exports = EventRegistry;
