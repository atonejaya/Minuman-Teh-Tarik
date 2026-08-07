const prisma = require('../config/database');

class CollectionRepository {
  async create(data, tx = prisma) {
    return tx.collection.create({ data });
  }

  async findById(id, tx = prisma) {
    return tx.collection.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            sales_transaction: true
          }
        },
        payments: true
      }
    });
  }

  async findMany(filters = {}) {
    return prisma.collection.findMany({
      where: filters,
      orderBy: { created_at: 'desc' },
      include: {
        items: true,
        payments: true
      }
    });
  }

  async addItem(data, tx = prisma) {
    return tx.collectionItem.create({ data });
  }

  async updateItem(id, data, tx = prisma) {
    return tx.collectionItem.update({
      where: { id },
      data
    });
  }

  async updateCollection(id, data, tx = prisma) {
    return tx.collection.update({
      where: { id },
      data
    });
  }
}

module.exports = new CollectionRepository();
