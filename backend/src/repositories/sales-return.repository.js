const prisma = require('../config/database');

class SalesReturnRepository {
  async create(data, tx = prisma) {
    return tx.salesReturn.create({ data });
  }

  async findById(id, tx = prisma) {
    return tx.salesReturn.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
            batch: true
          }
        },
        credit_note: true,
        transaction: true
      }
    });
  }

  async findMany(filters = {}, tx = prisma) {
    return tx.salesReturn.findMany({
      where: filters,
      orderBy: { created_at: 'desc' },
      include: {
        items: true,
        credit_note: true
      }
    });
  }

  async addItem(data, tx = prisma) {
    return tx.salesReturnItem.create({ data });
  }

  async update(id, data, tx = prisma) {
    return tx.salesReturn.update({
      where: { id },
      data
    });
  }

  async updateItem(id, data, tx = prisma) {
    return tx.salesReturnItem.update({
      where: { id },
      data
    });
  }
}

module.exports = new SalesReturnRepository();
