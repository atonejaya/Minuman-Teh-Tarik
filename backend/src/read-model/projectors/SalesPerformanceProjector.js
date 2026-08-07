const BaseProjector = require('./BaseProjector');
const InvoiceConfirmedEvent = require('../../domain/events/InvoiceConfirmedEvent');
const PaymentCreatedEvent = require('../../domain/events/PaymentCreatedEvent');
const ReturnConfirmedEvent = require('../../domain/events/ReturnConfirmedEvent');
const SettlementCompletedEvent = require('../../domain/events/SettlementCompletedEvent');

class SalesPerformanceProjector extends BaseProjector {
  handles() {
    return [
      InvoiceConfirmedEvent,
      PaymentCreatedEvent,
      ReturnConfirmedEvent,
      SettlementCompletedEvent
    ];
  }

  async project(event, tx) {
    if (event instanceof InvoiceConfirmedEvent) {
      const { sales_id, grand_total } = event.payload;
      
      await tx.salesPerformanceSummary.upsert({
        where: { sales_id: Number(sales_id) },
        create: {
          sales_id: Number(sales_id),
          total_customer: 1, // simplified assumption, or should use unique customer check
          total_invoice: 1,
          total_sales: Number(grand_total)
        },
        update: {
          total_invoice: { increment: 1 },
          total_sales: { increment: Number(grand_total) }
          // total_customer omitted for update unless we check distinct warung_id
        }
      });
    } 
    else if (event instanceof PaymentCreatedEvent) {
      const { sales_id, amount } = event.payload;
      
      await tx.salesPerformanceSummary.upsert({
        where: { sales_id: Number(sales_id) },
        create: {
          sales_id: Number(sales_id),
          total_collection: Number(amount)
        },
        update: {
          total_collection: { increment: Number(amount) }
        }
      });
    }
    else if (event instanceof ReturnConfirmedEvent) {
      const { sales_id, total_amount } = event.payload;
      
      await tx.salesPerformanceSummary.upsert({
        where: { sales_id: Number(sales_id) },
        create: {
          sales_id: Number(sales_id),
          total_return: Number(total_amount)
        },
        update: {
          total_return: { increment: Number(total_amount) }
        }
      });
    }
    else if (event instanceof SettlementCompletedEvent) {
      const { sales_id } = event.payload;
      
      await tx.salesPerformanceSummary.upsert({
        where: { sales_id: Number(sales_id) },
        create: {
          sales_id: Number(sales_id),
          total_settlement: 1
        },
        update: {
          total_settlement: { increment: 1 }
        }
      });
    }
  }
}

module.exports = SalesPerformanceProjector;
