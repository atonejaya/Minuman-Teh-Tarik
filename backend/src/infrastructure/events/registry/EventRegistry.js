const InvoiceConfirmedEvent = require('../../../domain/events/InvoiceConfirmedEvent');
const PaymentCreatedEvent = require('../../../domain/events/PaymentCreatedEvent');
const CollectionCompletedEvent = require('../../../domain/events/CollectionCompletedEvent');
const ReturnConfirmedEvent = require('../../../domain/events/ReturnConfirmedEvent');
const SettlementCompletedEvent = require('../../../domain/events/SettlementCompletedEvent');
const SalesStockIssuedEvent = require('../../../domain/events/SalesStockIssuedEvent');
const SalesStockConfirmedEvent = require('../../../domain/events/SalesStockConfirmedEvent');
const SalesStockClosedEvent = require('../../../domain/events/SalesStockClosedEvent');
const OutletParStockUpdatedEvent = require('../../../modules/outlet-inventory/domain/events/OutletParStockUpdatedEvent');
const StockCountRecordedEvent = require('../../../modules/outlet-inventory/domain/events/StockCountRecordedEvent');
const SalesCalculatedEvent = require('../../../modules/outlet-inventory/domain/events/SalesCalculatedEvent');
const RefillCalculatedEvent = require('../../../modules/outlet-inventory/domain/events/RefillCalculatedEvent');
const OutletProjectionUpdatedEvent = require('../../../modules/outlet-inventory/domain/events/OutletProjectionUpdatedEvent');

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
  SalesStockClosedEvent,
  OutletParStockUpdatedEvent,
  StockCountRecordedEvent,
  SalesCalculatedEvent,
  RefillCalculatedEvent,
  OutletProjectionUpdatedEvent
};

module.exports = EventRegistry;
