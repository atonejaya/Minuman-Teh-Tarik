const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class InventoryService {
  /**
   * Record inventory movement and explicitly update ProductInventoryProjection
   * @param {Object} data - The movement data payload
   * @param {number} userId - The ID of the user performing the action
   * @returns {Promise<Object>} The created inventory movement
   */
  async recordMovement(data, userId) {
    const {
      movement_type,
      source_type,
      source_id,
      destination_type,
      destination_id,
      qty_before,
      qty_change,
      qty_after,
      reference_document,
      reference_type,
      product_id,
      batch_id,
      batch_number,
      expired_at
    } = data;

    return await prisma.$transaction(async (tx) => {
      // 1. Write exactly to prisma.inventoryMovement
      const movementNumber = `MOV-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

      const movement = await tx.inventoryMovement.create({
        data: {
          movement_number: data.movement_number || movementNumber,
          movement_type,
          source_type,
          source_id,
          destination_type,
          destination_id,
          qty_before,
          qty_change,
          qty_after,
          reference_document,
          reference_type,
          product_id,
          batch_id,
          batch_number,
          expired_at: new Date(expired_at),
          created_by: userId
        }
      });

      // 2. Explicitly update ProductInventoryProjection
      // (adjusting available_stock and reserved_stock)
      const projection = await tx.productInventoryProjection.findUnique({
        where: { product_id }
      });

      let availableStockAdj = 0;
      let reservedStockAdj = 0;

      // Basic determination of adjustment based on movement type
      // Expandable depending on exact business rules for reserved vs available
      if (['STOCK_IN', 'ADJUSTMENT_IN', 'RETURN', 'SALE_RETURN_GOOD'].includes(movement_type)) {
        availableStockAdj = qty_change;
      } else if (['SALE', 'LOAD_OUT', 'ADJUSTMENT_OUT'].includes(movement_type)) {
        availableStockAdj = -qty_change;
      }

      if (projection) {
        await tx.productInventoryProjection.update({
          where: { product_id },
          data: {
            available_stock: { increment: availableStockAdj },
            reserved_stock: { increment: reservedStockAdj },
            last_stock_update: new Date()
          }
        });
      } else {
        // Create if it doesn't exist
        await tx.productInventoryProjection.create({
          data: {
            product_id,
            available_stock: availableStockAdj,
            reserved_stock: reservedStockAdj,
            last_stock_update: new Date()
          }
        });
      }

      // DO NOT manually update Product.current_stock

      return movement;
    });
  }
}

module.exports = new InventoryService();
