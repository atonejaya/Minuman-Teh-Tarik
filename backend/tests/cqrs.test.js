'use strict';
const chai = require('chai');
const expect = chai.expect;
const crypto = require('crypto');
const prisma = require('../src/config/database');
const NodeEventEmitterAdapter = require('../src/infrastructure/events/NodeEventEmitterAdapter');
const EventDispatcher = require('../src/infrastructure/events/EventDispatcher');
const InternalMessageBus = require('../src/infrastructure/events/InternalMessageBus');

const SalesSummaryProjector = require('../src/read-model/projectors/SalesSummaryProjector');
const CustomerLedgerProjector = require('../src/read-model/projectors/CustomerLedgerProjector');
const ProductSalesProjector = require('../src/read-model/projectors/ProductSalesProjector');
const SalesPerformanceProjector = require('../src/read-model/projectors/SalesPerformanceProjector');

const InvoiceConfirmedEvent = require('../src/domain/events/InvoiceConfirmedEvent');
const PaymentCreatedEvent = require('../src/domain/events/PaymentCreatedEvent');

describe('CQRS Read Model & Projection (Sprint 10.3)', () => {
  let eventBus;

  before(async () => {
    // Clean up projections and idempotency tracker
    await prisma.processedEvent.deleteMany({});
    await prisma.dailySalesSummary.deleteMany({});
    await prisma.customerLedgerSummary.deleteMany({});
    await prisma.productSalesSummary.deleteMany({});
    await prisma.salesPerformanceSummary.deleteMany({});

    // Setup Bus
    const adapter = new NodeEventEmitterAdapter();
    const dispatcher = new EventDispatcher();
    eventBus = new InternalMessageBus(adapter, dispatcher);

    eventBus.register(new SalesSummaryProjector());
    eventBus.register(new CustomerLedgerProjector());
    eventBus.register(new ProductSalesProjector());
    eventBus.register(new SalesPerformanceProjector());
  });

  afterEach(async () => {
    // We won't clean after each because we want to test sequential events 
    // unless we need isolated tests.
  });

  it('should process InvoiceConfirmedEvent and update all projections', async () => {
    const aggregateId = crypto.randomUUID();
    const event = new InvoiceConfirmedEvent(aggregateId, {
      code: 'INV-001',
      sales_id: 1,
      warung_id: 100,
      warehouse_id: 10,
      grand_total: 500000,
      items: [
        { product_id: 5, qty: 10, subtotal: 300000 },
        { product_id: 6, qty: 5, subtotal: 200000 }
      ]
    });

    await eventBus.publish(event);

    // Wait for async projectors to finish since EventEmitter.emit doesn't await promises
    await new Promise(resolve => setTimeout(resolve, 300));

    
    // Check DailySalesSummary
    const dailySales = await prisma.dailySalesSummary.findFirst({
      where: { sales_id: 1, warehouse_id: 10 }
    });
    expect(dailySales).to.exist;
    expect(Number(dailySales.invoice_count)).to.equal(1);
    expect(Number(dailySales.sales_amount)).to.equal(500000);
    expect(Number(dailySales.outstanding_amount)).to.equal(500000);

    // Check CustomerLedgerSummary
    const ledger = await prisma.customerLedgerSummary.findFirst({
      where: { customer_id: 100 }
    });
    expect(ledger).to.exist;
    expect(Number(ledger.receivable)).to.equal(500000);

    // Check ProductSalesSummary
    const product5 = await prisma.productSalesSummary.findUnique({ where: { product_id: 5 }});
    expect(Number(product5.sales_qty)).to.equal(10);
    expect(Number(product5.sales_value)).to.equal(300000);

    // Check SalesPerformance
    const performance = await prisma.salesPerformanceSummary.findUnique({ where: { sales_id: 1 }});
    expect(Number(performance.total_sales)).to.equal(500000);
  });

  it('should be idempotent (processing duplicate event ignores it)', async () => {
    const aggregateId = crypto.randomUUID();
    const event = new InvoiceConfirmedEvent(aggregateId, {
      code: 'INV-002',
      sales_id: 1,
      warung_id: 100,
      warehouse_id: 10,
      grand_total: 100000,
      items: []
    });

    // First process
    await eventBus.publish(event);
    await new Promise(resolve => setTimeout(resolve, 300));

    // Let's get the state after first process
    const dailySalesBefore = await prisma.dailySalesSummary.findFirst({ where: { sales_id: 1 }});
    const expectedSalesAmount = Number(dailySalesBefore.sales_amount); // 500000 + 100000 = 600000

    // Duplicate process
    await eventBus.publish(event);
    await new Promise(resolve => setTimeout(resolve, 300));

    // Get state after duplicate
    const dailySalesAfter = await prisma.dailySalesSummary.findFirst({ where: { sales_id: 1 }});
    expect(Number(dailySalesAfter.sales_amount)).to.equal(expectedSalesAmount); // No change!

    // Verify ProcessedEvent has 4 entries (4 projectors)
    const processedEvents = await prisma.processedEvent.findMany({ where: { event_id: aggregateId }});
    expect(processedEvents.length).to.equal(4);
  });

  it('should process PaymentCreatedEvent and update projections accordingly', async () => {
    const aggregateId = crypto.randomUUID();
    const event = new PaymentCreatedEvent(aggregateId, {
      code: 'PAY-001',
      transaction_id: 99,
      sales_id: 1,
      warung_id: 100,
      warehouse_id: 10,
      amount: 200000,
      payment_method: 'CASH'
    });

    await eventBus.publish(event);

    // Check DailySalesSummary
    const dailySales = await prisma.dailySalesSummary.findFirst({
      where: { sales_id: 1, warehouse_id: 10 }
    });
    // Paid amount should increase by 200000
    expect(Number(dailySales.paid_amount)).to.equal(200000);
    // Outstanding should decrease by 200000 (was 600000)
    expect(Number(dailySales.outstanding_amount)).to.equal(400000);

    // Check CustomerLedgerSummary
    const ledger = await prisma.customerLedgerSummary.findFirst({
      where: { customer_id: 100 }
    });
    expect(Number(ledger.paid)).to.equal(200000);
    expect(Number(ledger.receivable)).to.equal(400000); // 600000 - 200000
  });
});
