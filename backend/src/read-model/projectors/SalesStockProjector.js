const BaseProjector = require('./BaseProjector');
const SalesStockConfirmedEvent = require('../../domain/events/SalesStockConfirmedEvent');

/**
 * SalesStockProjector
 * Reconciles SalesStockProjection from SalesStockLedger (Source of Truth).
 * Triggered asynchronously by SalesStockConfirmedEvent as a safety net to keep
 * the projection in sync with the ledger.
 */
class SalesStockProjector extends BaseProjector {
  handles() {
    return [SalesStockConfirmedEvent];
  }

  async project(event, tx) {
    if (!(event instanceof SalesStockConfirmedEvent)) return;

    const { salesId, items } = event.payload;

    for (const item of items) {
      const productId = Number(item.productId);

      const lastLedger = await tx.salesStockLedger.findFirst({
        where: {
          sales_id: Number(salesId),
          product_id: productId
        },
        orderBy: [{ transaction_date: 'desc' }, { created_at: 'desc' }, { id: 'desc' }]
      });

      const qtyAvailable = lastLedger ? lastLedger.balance : 0;

      await tx.salesStockProjection.upsert({
        where: {
          sales_id_product_id: {
            sales_id: Number(salesId),
            product_id: productId
          }
        },
        create: {
          sales_id: Number(salesId),
          product_id: productId,
          qty_available: qtyAvailable
        },
        update: {
          qty_available: qtyAvailable,
          last_update: new Date()
        }
      });
    }
  }
}

module.exports = SalesStockProjector;
