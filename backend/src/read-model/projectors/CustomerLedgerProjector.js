const BaseProjector = require('./BaseProjector');
const InvoiceConfirmedEvent = require('../../domain/events/InvoiceConfirmedEvent');
const PaymentCreatedEvent = require('../../domain/events/PaymentCreatedEvent');
const ReturnConfirmedEvent = require('../../domain/events/ReturnConfirmedEvent');

class CustomerLedgerProjector extends BaseProjector {
  handles() {
    return [
      InvoiceConfirmedEvent,
      PaymentCreatedEvent,
      ReturnConfirmedEvent
    ];
  }

  async project(event, tx) {
    const last_transaction_date = new Date(event.occurredAt);

    if (event instanceof InvoiceConfirmedEvent) {
      const { warung_id, grand_total } = event.payload;
      
      await tx.customerLedgerSummary.upsert({
        where: { customer_id: Number(warung_id) },
        create: {
          customer_id: Number(warung_id),
          receivable: Number(grand_total),
          last_transaction_date
        },
        update: {
          receivable: { increment: Number(grand_total) },
          last_transaction_date,
          updated_at: new Date()
        }
      });
    }
    else if (event instanceof PaymentCreatedEvent) {
      const { warung_id, amount } = event.payload;
      
      await tx.customerLedgerSummary.upsert({
        where: { customer_id: Number(warung_id) },
        create: {
          customer_id: Number(warung_id),
          paid: Number(amount),
          receivable: -Number(amount), // Just logically, though usually you don't receive payment before invoice
          last_transaction_date
        },
        update: {
          paid: { increment: Number(amount) },
          receivable: { decrement: Number(amount) },
          last_transaction_date,
          updated_at: new Date()
        }
      });
    }
    else if (event instanceof ReturnConfirmedEvent) {
      const { warung_id, total_amount } = event.payload;
      
      await tx.customerLedgerSummary.upsert({
        where: { customer_id: Number(warung_id) },
        create: {
          customer_id: Number(warung_id),
          credit_note: Number(total_amount),
          receivable: -Number(total_amount),
          last_transaction_date
        },
        update: {
          credit_note: { increment: Number(total_amount) },
          receivable: { decrement: Number(total_amount) },
          last_transaction_date,
          updated_at: new Date()
        }
      });
    }
  }
}

module.exports = CustomerLedgerProjector;
