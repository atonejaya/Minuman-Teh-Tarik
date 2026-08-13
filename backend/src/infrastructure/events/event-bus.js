const InternalMessageBus = require('./InternalMessageBus');
const NodeEventEmitterAdapter = require('./NodeEventEmitterAdapter');
const EventDispatcher = require('./EventDispatcher');
const AuditSubscriber = require('./subscribers/AuditSubscriber');
const SalesSummaryProjector = require('../../read-model/projectors/SalesSummaryProjector');
const CustomerLedgerProjector = require('../../read-model/projectors/CustomerLedgerProjector');
const ProductSalesProjector = require('../../read-model/projectors/ProductSalesProjector');
const SalesPerformanceProjector = require('../../read-model/projectors/SalesPerformanceProjector');
const SalesStockProjector = require('../../read-model/projectors/SalesStockProjector');
const OutletInventoryProjector = require('../../modules/outlet-inventory/infrastructure/projectors/OutletInventoryProjector');

/**
 * Build the production EventBus composition.
 *
 * Single source of truth for subscriber wiring, shared by `src/app.js` and the
 * outbox reconciliation runner so the replay path can never drift from the
 * production subscriber set.
 *
 * Composition-only: no DB mutation, no timers, no background workers, no HTTP.
 */
function buildEventBus() {
  const adapter = new NodeEventEmitterAdapter();
  const dispatcher = new EventDispatcher();
  const bus = new InternalMessageBus(adapter, dispatcher);

  bus.register(new AuditSubscriber());

  bus.register(new SalesSummaryProjector());
  bus.register(new CustomerLedgerProjector());
  bus.register(new ProductSalesProjector());
  bus.register(new SalesPerformanceProjector());
  bus.register(new SalesStockProjector());
  bus.register(new OutletInventoryProjector());

  return bus;
}

module.exports = buildEventBus;
