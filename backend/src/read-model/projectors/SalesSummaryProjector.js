const BaseProjector = require('./BaseProjector');
const InvoiceConfirmedEvent = require('../../domain/events/InvoiceConfirmedEvent');
const PaymentCreatedEvent = require('../../domain/events/PaymentCreatedEvent');
const ReturnConfirmedEvent = require('../../domain/events/ReturnConfirmedEvent');
const SettlementCompletedEvent = require('../../domain/events/SettlementCompletedEvent');
const dayjs = require('dayjs');

class SalesSummaryProjector extends BaseProjector {
  handles() {
    return [
      InvoiceConfirmedEvent,
      PaymentCreatedEvent,
      ReturnConfirmedEvent,
      SettlementCompletedEvent
    ];
  }

  async project(event, tx) {
    const date = dayjs(event.occurredAt).startOf('day').toDate();

    if (event instanceof InvoiceConfirmedEvent) {
      const { sales_id, warehouse_id, grand_total } = event.payload;
      
      await tx.dailySalesSummary.upsert({
        where: {
          date_sales_id_warehouse_id: {
            date,
            sales_id: Number(sales_id),
            warehouse_id: Number(warehouse_id)
          }
        },
        create: {
          date,
          sales_id: Number(sales_id),
          warehouse_id: Number(warehouse_id),
          invoice_count: 1,
          sales_amount: Number(grand_total),
          outstanding_amount: Number(grand_total)
        },
        update: {
          invoice_count: { increment: 1 },
          sales_amount: { increment: Number(grand_total) },
          outstanding_amount: { increment: Number(grand_total) },
          updated_at: new Date()
        }
      });
    } 
    else if (event instanceof PaymentCreatedEvent) {
      const { sales_id, warehouse_id, amount } = event.payload;
      
      await tx.dailySalesSummary.upsert({
        where: {
          date_sales_id_warehouse_id: {
            date,
            sales_id: Number(sales_id),
            warehouse_id: Number(warehouse_id)
          }
        },
        create: {
          date,
          sales_id: Number(sales_id),
          warehouse_id: Number(warehouse_id),
          paid_amount: Number(amount),
          outstanding_amount: -Number(amount)
        },
        update: {
          paid_amount: { increment: Number(amount) },
          outstanding_amount: { decrement: Number(amount) },
          updated_at: new Date()
        }
      });
    }
    else if (event instanceof ReturnConfirmedEvent) {
      const { sales_id, warehouse_id, total_amount } = event.payload;
      
      await tx.dailySalesSummary.upsert({
        where: {
          date_sales_id_warehouse_id: {
            date,
            sales_id: Number(sales_id),
            warehouse_id: Number(warehouse_id)
          }
        },
        create: {
          date,
          sales_id: Number(sales_id),
          warehouse_id: Number(warehouse_id),
          return_amount: Number(total_amount),
          outstanding_amount: -Number(total_amount) // Return decreases outstanding
        },
        update: {
          return_amount: { increment: Number(total_amount) },
          outstanding_amount: { decrement: Number(total_amount) },
          updated_at: new Date()
        }
      });
    }
    else if (event instanceof SettlementCompletedEvent) {
      const { sales_id, warehouse_id } = event.payload;
      // Note: the payload result has total_difference but maybe we want something else.
      // The schema for DailySalesSummary has `settlement_amount`.
      // The prompt mentioned `settlement_amount` but the result of settlement is just the stock difference.
      // Let's assume settlement amount is total cash to be submitted if the business logic requires it, but in our current schema, settlement doesn't track cash amount, just stock.
      // For now, we will just touch the record to update `updated_at`.
      
      await tx.dailySalesSummary.upsert({
        where: {
          date_sales_id_warehouse_id: {
            date,
            sales_id: Number(sales_id),
            warehouse_id: Number(warehouse_id)
          }
        },
        create: {
          date,
          sales_id: Number(sales_id),
          warehouse_id: Number(warehouse_id),
          settlement_amount: 0
        },
        update: {
          updated_at: new Date()
        }
      });
    }
  }
}

module.exports = SalesSummaryProjector;
