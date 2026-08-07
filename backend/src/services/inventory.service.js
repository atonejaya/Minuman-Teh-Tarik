const prisma = require('../config/database');
const { ConflictError, NotFoundError } = require('../exceptions/api-error');
const NumberGeneratorService = require('./number-generator.service');

class InventoryService {
  /**
   * Mengurangi stok gudang secara atomik dengan optimistic locking
   */
  async decreaseWarehouseStock(warehouseId, productId, batchId, qty, condition = 'GOOD', tx = prisma) {
    if (qty <= 0) throw new Error('Quantity must be greater than 0');

    // Cek ketersediaan stok
    const stock = await tx.warehouseStock.findUnique({
      where: {
        warehouse_id_product_id_batch_id_condition: {
          warehouse_id: warehouseId,
          product_id: productId,
          batch_id: batchId,
          condition
        }
      },
      include: {
        batch: true
      }
    });

    if (!stock) {
      throw new NotFoundError('STOCK_NOT_FOUND', 'Stok gudang tidak ditemukan');
    }

    if (stock.qty_available < qty) {
      throw new ConflictError('INSUFFICIENT_STOCK', 'Stok gudang tidak mencukupi');
    }

    const updated = await tx.$executeRaw`
      UPDATE "WarehouseStock" 
      SET qty_available = qty_available - ${qty}, version = version + 1, updated_at = NOW()
      WHERE id = ${stock.id} AND version = ${stock.version}
    `;

    console.log('[DEBUG] decreaseWarehouseStock => stock.id:', stock.id, 'stock.version:', stock.version, 'updated:', updated, typeof updated);

    if (updated === 0 || updated === 0n) {
      throw new ConflictError('CONCURRENT_MODIFICATION', 'Data stok telah diubah oleh transaksi lain');
    }

    return {
      stock_id: stock.id,
      qty_before: stock.qty_available,
      qty_change: -qty,
      qty_after: stock.qty_available - qty,
      batch_number: stock.batch.batch_number,
      expired_at: stock.batch.expired_at
    };
  }

  /**
   * Menambah stok gudang secara atomik dengan optimistic locking
   */
  async increaseWarehouseStock(warehouseId, productId, batchId, qty, condition = 'GOOD', tx = prisma) {
    if (qty <= 0) throw new Error('Quantity must be greater than 0');

    const stock = await tx.warehouseStock.findUnique({
      where: {
        warehouse_id_product_id_batch_id_condition: {
          warehouse_id: warehouseId,
          product_id: productId,
          batch_id: batchId,
          condition
        }
      },
      include: {
        batch: true
      }
    });

    if (stock) {
      const updated = await tx.$executeRaw`
        UPDATE "WarehouseStock" 
        SET qty_available = qty_available + ${qty}, version = version + 1, updated_at = NOW()
        WHERE id = ${stock.id} AND version = ${stock.version}
      `;

      if (updated === 0) {
        throw new ConflictError('CONCURRENT_MODIFICATION', 'Data stok telah diubah oleh transaksi lain');
      }

      return {
        stock_id: stock.id,
        qty_before: stock.qty_available,
        qty_change: qty,
        qty_after: stock.qty_available + qty,
        batch_number: stock.batch.batch_number,
        expired_at: stock.batch.expired_at
      };
    } else {
      // Upsert fallback jika belum ada
      const newStock = await tx.warehouseStock.create({
        data: {
          warehouse_id: warehouseId,
          product_id: productId,
          batch_id: batchId,
          qty_available: qty,
          condition: condition,
          version: 1
        },
        include: {
          batch: true
        }
      });
      return {
        stock_id: newStock.id,
        qty_before: 0,
        qty_change: qty,
        qty_after: qty,
        batch_number: newStock.batch.batch_number,
        expired_at: newStock.batch.expired_at
      };
    }
  }

  /**
   * Mengurangi stok mobile secara atomik dengan optimistic locking
   */
  async decreaseMobileStock(salesId, productId, batchId, qty, condition = 'GOOD', tx = prisma) {
    if (qty <= 0) throw new Error('Quantity must be greater than 0');

    const stock = await tx.mobileStock.findUnique({
      where: {
        sales_id_product_id_batch_id_condition: {
          sales_id: salesId,
          product_id: productId,
          batch_id: batchId,
          condition
        }
      },
      include: {
        batch: true
      }
    });

    if (!stock) {
      throw new NotFoundError('STOCK_NOT_FOUND', 'Stok mobile tidak ditemukan');
    }

    if (stock.qty_available < qty) {
      throw new ConflictError('INSUFFICIENT_STOCK', 'Stok mobile tidak mencukupi');
    }

    const updated = await tx.$executeRaw`
      UPDATE "MobileStock" 
      SET qty_available = qty_available - ${qty}, version = version + 1, updated_at = NOW()
      WHERE id = ${stock.id} AND version = ${stock.version}
    `;

    if (updated === 0) {
      throw new ConflictError('CONCURRENT_MODIFICATION', 'Data stok telah diubah oleh transaksi lain');
    }

    return {
      stock_id: stock.id,
      qty_before: stock.qty_available,
      qty_change: -qty,
      qty_after: stock.qty_available - qty,
      batch_number: stock.batch.batch_number,
      expired_at: stock.batch.expired_at
    };
  }

  /**
   * Menambah stok mobile secara atomik dengan optimistic locking
   */
  async increaseMobileStock(salesId, productId, batchId, qty, condition = 'GOOD', tx = prisma) {
    if (qty <= 0) throw new Error('Quantity must be greater than 0');

    const stock = await tx.mobileStock.findUnique({
      where: {
        sales_id_product_id_batch_id_condition: {
          sales_id: salesId,
          product_id: productId,
          batch_id: batchId,
          condition
        }
      },
      include: {
        batch: true
      }
    });

    if (stock) {
      const updated = await tx.$executeRaw`
        UPDATE "MobileStock" 
        SET qty_available = qty_available + ${qty}, version = version + 1, updated_at = NOW()
        WHERE id = ${stock.id} AND version = ${stock.version}
      `;

      if (updated === 0) {
        throw new ConflictError('CONCURRENT_MODIFICATION', 'Data stok telah diubah oleh transaksi lain');
      }

      return {
        stock_id: stock.id,
        qty_before: stock.qty_available,
        qty_change: qty,
        qty_after: stock.qty_available + qty,
        batch_number: stock.batch.batch_number,
        expired_at: stock.batch.expired_at
      };
    } else {
      const newStock = await tx.mobileStock.create({
        data: {
          sales_id: salesId,
          product_id: productId,
          batch_id: batchId,
          qty_available: qty,
          condition: condition,
          version: 1
        },
        include: {
          batch: true
        }
      });
      return {
        stock_id: newStock.id,
        qty_before: 0,
        qty_change: qty,
        qty_after: qty,
        batch_number: newStock.batch.batch_number,
        expired_at: newStock.batch.expired_at
      };
    }
  }

  /**
   * Mencatat mutasi ledger (Inventory Movement)
   */
  async createInventoryMovement(data, tx = prisma) {
    const movementNumber = await NumberGeneratorService.generateCode('MOV', new Date(), tx);

    return tx.inventoryMovement.create({
      data: {
        movement_number: movementNumber,
        movement_type: data.movement_type,
        source_type: data.source_type,
        source_id: data.source_id,
        destination_type: data.destination_type,
        destination_id: data.destination_id,
        qty_before: data.qty_before,
        qty_change: data.qty_change,
        qty_after: data.qty_after,
        reference_document: data.reference_document,
        reference_type: data.reference_type,
        product_id: data.product_id,
        batch_id: data.batch_id,
        batch_number: data.batch_number,
        expired_at: data.expired_at,
        created_by: data.created_by
      }
    });
  }

  /**
   * Mengambil batch berdasarkan FEFO (First Expired First Out)
   */
  async getAvailableBatchFEFO(productId, warehouseId, tx = prisma) {
    return tx.warehouseStock.findMany({
      where: {
        product_id: productId,
        warehouse_id: warehouseId,
        qty_available: { gt: 0 },
        condition: 'GOOD'
      },
      include: {
        batch: true
      },
      orderBy: [
        { batch: { expired_at: 'asc' } },
        { batch: { production_date: 'asc' } },
        { batch: { batch_number: 'asc' } }
      ]
    });
  }

  /**
   * Reserve batch FEFO untuk mutasi (contoh: Penjualan)
   */
  async reserveBatchFEFO(productId, warehouseId, requiredQty, tx = prisma) {
    const availableBatches = await this.getAvailableBatchFEFO(productId, warehouseId, tx);
    
    let remainingToReserve = requiredQty;
    const reservedBatches = [];

    for (const stock of availableBatches) {
      if (remainingToReserve <= 0) break;

      const reserveQty = Math.min(stock.qty_available, remainingToReserve);
      reservedBatches.push({
        batch_id: stock.batch_id,
        batch_number: stock.batch.batch_number,
        qty: reserveQty
      });

      remainingToReserve -= reserveQty;
    }

    if (remainingToReserve > 0) {
      throw new ConflictError('INSUFFICIENT_STOCK', `Stok untuk produk ID ${productId} tidak mencukupi. Kurang: ${remainingToReserve}`);
    }

    return reservedBatches;
  }
  /**
   * Mengambil batch berdasarkan FEFO (First Expired First Out) untuk Mobile Stock
   */
  async getAvailableMobileBatchFEFO(productId, salesId, tx = prisma) {
    return tx.mobileStock.findMany({
      where: {
        product_id: productId,
        sales_id: salesId,
        qty_available: { gt: 0 },
        condition: 'GOOD'
      },
      include: {
        batch: true
      },
      orderBy: [
        { batch: { expired_at: 'asc' } },
        { batch: { production_date: 'asc' } },
        { batch: { batch_number: 'asc' } }
      ]
    });
  }

  /**
   * Reserve batch FEFO untuk mutasi dari Mobile Stock (contoh: Penjualan oleh Sales)
   */
  async reserveMobileBatchFEFO(productId, salesId, requiredQty, tx = prisma) {
    const availableBatches = await this.getAvailableMobileBatchFEFO(productId, salesId, tx);
    
    let remainingToReserve = requiredQty;
    const reservedBatches = [];

    for (const stock of availableBatches) {
      if (remainingToReserve <= 0) break;

      const reserveQty = Math.min(stock.qty_available, remainingToReserve);
      reservedBatches.push({
        batch_id: stock.batch_id,
        batch_number: stock.batch.batch_number,
        expired_at: stock.batch.expired_at,
        qty: reserveQty
      });

      remainingToReserve -= reserveQty;
    }

    if (remainingToReserve > 0) {
      throw new ConflictError('INSUFFICIENT_STOCK', `Stok Mobile untuk produk ID ${productId} tidak mencukupi. Kurang: ${remainingToReserve}`);
    }

    return reservedBatches;
  }
}
module.exports = new InventoryService();
