const prisma = require('../config/database');

class WarehouseSettlementRepository {
  /**
   * Create a new WarehouseSettlement transaction
   * @param {Object} settlementData 
   * @param {Array} itemsData 
   * @param {Object} tx (Optional) Prisma transaction client
   * @returns {Object} Created settlement
   */
  async create(settlementData, itemsData, tx = prisma) {
    return tx.warehouseSettlement.create({
      data: {
        ...settlementData,
        items: {
          create: itemsData
        }
      },
      include: {
        items: true
      }
    });
  }

  /**
   * Find settlement by ID
   * @param {number} id 
   * @param {Object} tx (Optional) Prisma transaction client
   * @returns {Object} Settlement
   */
  async findById(id, tx = prisma) {
    return tx.warehouseSettlement.findUnique({
      where: { id },
      include: {
        items: true,
        differences: true,
        sales: {
          select: { name: true }
        }
      }
    });
  }

  /**
   * Update settlement status
   * @param {number} id 
   * @param {String} status 
   * @param {Object} tx (Optional) Prisma transaction client
   * @returns {Object} Updated settlement
   */
  async updateStatus(id, status, tx = prisma) {
    return tx.warehouseSettlement.update({
      where: { id },
      data: { status }
    });
  }

  /**
   * Update settlement with verification data
   * @param {number} id 
   * @param {Object} verificationData 
   * @param {Array} updatedItemsData 
   * @param {Array} differencesData 
   * @param {Object} tx (Optional) Prisma transaction client
   */
  async verify(id, verificationData, updatedItemsData, differencesData, tx = prisma) {
    // We update the main settlement, then update items, then create differences
    await tx.warehouseSettlement.update({
      where: { id },
      data: verificationData
    });

    for (const item of updatedItemsData) {
      await tx.warehouseSettlementItem.update({
        where: { id: item.id },
        data: {
          qty_actual: item.qty_actual,
          qty_difference: item.qty_difference
        }
      });
    }

    if (differencesData && differencesData.length > 0) {
      await tx.settlementDifference.createMany({
        data: differencesData
      });
    }

    return this.findById(id, tx);
  }

  /**
   * Check if sales user has an OPEN settlement
   * @param {number} salesId 
   * @returns {Boolean}
   */
  async hasOpenSettlement(salesId) {
    const count = await prisma.warehouseSettlement.count({
      where: {
        sales_id: salesId,
        status: {
          in: ['DRAFT', 'COUNTING', 'VERIFIED']
        }
      }
    });
    return count > 0;
  }
}

module.exports = new WarehouseSettlementRepository();
