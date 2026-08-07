const BaseProjector = require('./BaseProjector');
const InvoiceConfirmedEvent = require('../../domain/events/InvoiceConfirmedEvent');
const ReturnConfirmedEvent = require('../../domain/events/ReturnConfirmedEvent');

class ProductSalesProjector extends BaseProjector {
  handles() {
    return [
      InvoiceConfirmedEvent,
      ReturnConfirmedEvent
    ];
  }

  async project(event, tx) {
    if (event instanceof InvoiceConfirmedEvent) {
      const { items } = event.payload;
      if (!items || items.length === 0) return;

      for (const item of items) {
        await tx.productSalesSummary.upsert({
          where: { product_id: Number(item.product_id) },
          create: {
            product_id: Number(item.product_id),
            sales_qty: Number(item.qty),
            net_sales_qty: Number(item.qty),
            sales_value: Number(item.subtotal)
          },
          update: {
            sales_qty: { increment: Number(item.qty) },
            net_sales_qty: { increment: Number(item.qty) },
            sales_value: { increment: Number(item.subtotal) }
          }
        });
      }
    } 
    else if (event instanceof ReturnConfirmedEvent) {
      const { items } = event.payload;
      if (!items || items.length === 0) return;

      for (const item of items) {
        await tx.productSalesSummary.upsert({
          where: { product_id: Number(item.product_id) },
          create: {
            product_id: Number(item.product_id),
            return_qty: Number(item.qty),
            net_sales_qty: -Number(item.qty),
            sales_value: -Number(item.subtotal)
          },
          update: {
            return_qty: { increment: Number(item.qty) },
            net_sales_qty: { decrement: Number(item.qty) },
            sales_value: { decrement: Number(item.subtotal) }
          }
        });
      }
    }
  }
}

module.exports = ProductSalesProjector;
