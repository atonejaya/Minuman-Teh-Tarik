const prisma = require('../../../../config/database');
const AuditLogService = require('../../../../services/audit-log.service');

class ProductPriceService {
  async getPricesByProductId(productId) {
    return await prisma.productPrice.findMany({
      where: { product_id: parseInt(productId) },
      include: { price_level: true }
    });
  }

  async createPrice(productId, data, userId) {
    return await prisma.$transaction(async (tx) => {
      const price = await tx.productPrice.create({
        data: {
          ...data,
          product_id: parseInt(productId),
          created_by: userId ? parseInt(userId) : null
        },
        include: { price_level: true }
      });

      if (userId) {
        await AuditLogService.log(userId, 'CREATE', 'ProductPrice', price.id, price, tx);
      }

      await tx.outboxEvent.create({
        data: {
          aggregate_id: price.id.toString(),
          aggregate_type: 'ProductPrice',
          event_name: 'PriceCreated',
          payload: price,
          status: 'PENDING'
        }
      });

      return price;
    });
  }

  async updatePrice(productId, priceId, data, userId) {
    const existing = await prisma.productPrice.findFirst({
      where: { id: parseInt(priceId), product_id: parseInt(productId) }
    });
    if (!existing) throw new Error('Product price not found');

    return await prisma.$transaction(async (tx) => {
      const price = await tx.productPrice.update({
        where: { id: parseInt(priceId) },
        data: {
          ...data,
          updated_by: userId ? parseInt(userId) : null
        },
        include: { price_level: true }
      });

      if (userId) {
        await AuditLogService.log(userId, 'UPDATE', 'ProductPrice', price.id, price, tx);
      }

      await tx.outboxEvent.create({
        data: {
          aggregate_id: price.id.toString(),
          aggregate_type: 'ProductPrice',
          event_name: 'PriceUpdated',
          payload: price,
          status: 'PENDING'
        }
      });

      return price;
    });
  }

  async updatePriceStatus(productId, priceId, status, userId) {
    const existing = await prisma.productPrice.findFirst({
      where: { id: parseInt(priceId), product_id: parseInt(productId) }
    });
    if (!existing) throw new Error('Product price not found');

    return await prisma.$transaction(async (tx) => {
      const price = await tx.productPrice.update({
        where: { id: parseInt(priceId) },
        data: {
          status,
          updated_by: userId ? parseInt(userId) : null
        },
        include: { price_level: true }
      });

      if (userId) {
        await AuditLogService.log(userId, 'UPDATE_STATUS', 'ProductPrice', price.id, { status }, tx);
      }

      const eventName = status === 'ACTIVE' ? 'PriceActivated' : (status === 'EXPIRED' ? 'PriceExpired' : 'PriceStatusUpdated');

      await tx.outboxEvent.create({
        data: {
          aggregate_id: price.id.toString(),
          aggregate_type: 'ProductPrice',
          event_name: eventName,
          payload: price,
          status: 'PENDING'
        }
      });

      return price;
    });
  }
}

module.exports = new ProductPriceService();
