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
const OutletDeliveryRecordedEvent = require('../../../modules/outlet-inventory/domain/events/OutletDeliveryRecordedEvent');
const SalesVisitPlannedEvent = require('../../../modules/sales-visit/domain/events/SalesVisitPlannedEvent');
const SalesVisitCheckedInEvent = require('../../../modules/sales-visit/domain/events/SalesVisitCheckedInEvent');
const SalesVisitStockCountedEvent = require('../../../modules/sales-visit/domain/events/SalesVisitStockCountedEvent');
const SalesVisitOrderCreatedEvent = require('../../../modules/sales-visit/domain/events/SalesVisitOrderCreatedEvent');
const SalesVisitDeliveredEvent = require('../../../modules/sales-visit/domain/events/SalesVisitDeliveredEvent');
const SalesVisitCheckedOutEvent = require('../../../modules/sales-visit/domain/events/SalesVisitCheckedOutEvent');
const SalesVisitCompletedEvent = require('../../../modules/sales-visit/domain/events/SalesVisitCompletedEvent');
const SalesVisitCancelledEvent = require('../../../modules/sales-visit/domain/events/SalesVisitCancelledEvent');
const SalesReturnApprovedEvent = require('../../../modules/sales/domain/events/SalesReturnApprovedEvent');
const WarehouseTransferPostedEvent = require('../../../modules/warehouse/domain/events/WarehouseTransferPostedEvent');
const WarehouseReturnReceivedEvent = require('../../../modules/warehouse/domain/events/WarehouseReturnReceivedEvent');
const SalesDayClosedEvent = require('../../../modules/warehouse/domain/events/SalesDayClosedEvent');
const PaymentReceivedEvent = require('../../../modules/sales/domain/events/PaymentReceivedEvent');
const PaymentCompletedEvent = require('../../../modules/finance/payment/domain/events/PaymentCompletedEvent');

// Master Customer Events
const CustomerAreaChangedEvent = require('../../../modules/master/customer/domain/events/CustomerAreaChangedEvent');
const CustomerCategoryChangedEvent = require('../../../modules/master/customer/domain/events/CustomerCategoryChangedEvent');
const CustomerCreatedEvent = require('../../../modules/master/customer/domain/events/CustomerCreatedEvent');
const CustomerStatusChangedEvent = require('../../../modules/master/customer/domain/events/CustomerStatusChangedEvent');
const CustomerTransferredEvent = require('../../../modules/master/customer/domain/events/CustomerTransferredEvent');
const CustomerUpdatedEvent = require('../../../modules/master/customer/domain/events/CustomerUpdatedEvent');

// Master Product Events
const PriceActivatedEvent = require('../../../modules/master/product/domain/events/PriceActivatedEvent');
const PriceCreatedEvent = require('../../../modules/master/product/domain/events/PriceCreatedEvent');
const PriceExpiredEvent = require('../../../modules/master/product/domain/events/PriceExpiredEvent');
const PriceStatusUpdatedEvent = require('../../../modules/master/product/domain/events/PriceStatusUpdatedEvent');
const PriceUpdatedEvent = require('../../../modules/master/product/domain/events/PriceUpdatedEvent');
const ProductActivatedEvent = require('../../../modules/master/product/domain/events/ProductActivatedEvent');
const ProductCategoryChangedEvent = require('../../../modules/master/product/domain/events/ProductCategoryChangedEvent');
const ProductCostPriceChangedEvent = require('../../../modules/master/product/domain/events/ProductCostPriceChangedEvent');
const ProductCreatedEvent = require('../../../modules/master/product/domain/events/ProductCreatedEvent');
const ProductDeactivatedEvent = require('../../../modules/master/product/domain/events/ProductDeactivatedEvent');
const ProductUpdatedEvent = require('../../../modules/master/product/domain/events/ProductUpdatedEvent');

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
  OutletProjectionUpdatedEvent,
  OutletDeliveryRecordedEvent,
  SalesVisitPlannedEvent,
  SalesVisitCheckedInEvent,
  SalesVisitStockCountedEvent,
  SalesVisitOrderCreatedEvent,
  SalesVisitDeliveredEvent,
  SalesVisitCheckedOutEvent,
  SalesVisitCompletedEvent,
  SalesVisitCancelledEvent,
  SalesReturnApprovedEvent,
  WarehouseTransferPostedEvent,
  WarehouseReturnReceivedEvent,
  SalesDayClosedEvent,

  // Master Customer Events
  CustomerAreaChangedEvent,
  CustomerCategoryChangedEvent,
  CustomerCreatedEvent,
  CustomerStatusChangedEvent,
  CustomerTransferredEvent,
  CustomerUpdatedEvent,

  // Master Product Events
  PriceActivatedEvent,
  PriceCreatedEvent,
  PriceExpiredEvent,
  PriceStatusUpdatedEvent,
  PriceUpdatedEvent,
  ProductActivatedEvent,
  ProductCategoryChangedEvent,
  ProductCostPriceChangedEvent,
  ProductCreatedEvent,
  ProductDeactivatedEvent,
  ProductUpdatedEvent,

  // Legacy Aliases for pre-existing outbox rows that used non-standard names
  ProductCreated: ProductCreatedEvent,
  ProductUpdated: ProductUpdatedEvent,
  ProductActivated: ProductActivatedEvent,
  ProductDeactivated: ProductDeactivatedEvent,
  ProductCostPriceChanged: ProductCostPriceChangedEvent,
  ProductCategoryChanged: ProductCategoryChangedEvent,
  PriceCreated: PriceCreatedEvent,
  PriceUpdated: PriceUpdatedEvent,
  PaymentReceived: PaymentReceivedEvent,
  PAYMENT_COMPLETED: PaymentCompletedEvent,
};

module.exports = EventRegistry;
