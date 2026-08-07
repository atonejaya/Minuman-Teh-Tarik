const BaseProjector = require('../../../../read-model/projectors/BaseProjector');
const StockCountRecordedEvent = require('../../domain/events/StockCountRecordedEvent');
const OutletParStockUpdatedEvent = require('../../domain/events/OutletParStockUpdatedEvent');
const OutletStockProjectionRepository = require('../../domain/repositories/OutletStockProjectionRepository');

/**
 * OutletInventoryProjector
 * Reconciles OutletStockProjection (Read Model) dari OutletStockLedger
 * (Source of Truth). Di-trigger oleh StockCountRecordedEvent dan
 * OutletParStockUpdatedEvent sebagai safety net agar projection tetap sinkron.
 *
 * Menggunakan optimistic locking (OutletStockProjection.version): event
 * membawa version saat ditulis sinkron; reconcile hanya diterapkan bila
 * version masih sama, sehingga stale event tidak bisa menimpa data terbaru.
 */
class OutletInventoryProjector extends BaseProjector {
  handles() {
    return [StockCountRecordedEvent, OutletParStockUpdatedEvent];
  }

  async project(event, tx) {
    if (event instanceof OutletParStockUpdatedEvent) {
      await this._reconcileParStock(event, tx);
      return;
    }

    if (event instanceof StockCountRecordedEvent) {
      await this._reconcileCount(event, tx);
      return;
    }
  }

  async _reconcileParStock(event, tx) {
    const { warungId, items } = event.payload;
    for (const item of items) {
      const projection = await OutletStockProjectionRepository.findByWarungProduct(tx, Number(warungId), Number(item.productId));
      if (!projection) continue;
      await OutletStockProjectionRepository.updateIfVersion(tx, projection.id, item.version, { par_qty: item.parQty });
    }
  }

  async _reconcileCount(event, tx) {
    const { warungId, items } = event.payload;

    for (const item of items) {
      const productId = Number(item.productId);
      const projection = await OutletStockProjectionRepository.findByWarungProduct(tx, Number(warungId), productId);
      if (!projection) continue;

      const lastLedger = await tx.outletStockLedger.findFirst({
        where: { warung_id: Number(warungId), product_id: productId },
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }]
      });

      const totals = await this._aggregateLedger(tx, Number(warungId), productId);

      const currentStock = lastLedger ? lastLedger.qty_after : 0;
      const parQty = Number(projection.par_qty);
      const requiredRefill = Math.max(0, parQty - currentStock);
      const denom = totals.opening + totals.refill;
      const sellThrough = denom > 0 ? Math.min(100, Math.round((totals.sales / denom) * 10000) / 100) : 0;

      await OutletStockProjectionRepository.updateIfVersion(tx, projection.id, item.version, {
        current_stock: currentStock,
        total_refill: totals.refill,
        total_sales: totals.sales,
        total_return: totals.ret,
        calculated_sales: lastLedger && lastLedger.movement_type === 'SALE' ? Math.abs(lastLedger.qty_change) : 0,
        required_refill: requiredRefill,
        sell_through: sellThrough,
        last_count_at: new Date()
      });
    }
  }

  async _aggregateLedger(tx, warungId, productId) {
    const rows = await tx.outletStockLedger.findMany({
      where: { warung_id: warungId, product_id: productId }
    });

    let opening = 0;
    let refill = 0;
    let sales = 0;
    let ret = 0;

    for (const row of rows) {
      // ISSUE_TO_OUTLET (SPRINT 11.1A): delivery barang ke outlet dihitung
      // sebagai refill/stock-in sehingga reconcile konsisten dengan penulisan
      // sinkron di recordDelivery (current_stock + total_refill).
      if (row.movement_type === 'REFILL' || row.movement_type === 'ISSUE_TO_OUTLET') refill += Number(row.qty_change);
      else if (row.movement_type === 'SALE') sales += Math.abs(Number(row.qty_change));
      else if (row.movement_type === 'RETURN_GOOD' || row.movement_type === 'RETURN_BAD') ret += Number(row.qty_change);
    }

    return { opening, refill, sales, ret };
  }
}

module.exports = OutletInventoryProjector;
