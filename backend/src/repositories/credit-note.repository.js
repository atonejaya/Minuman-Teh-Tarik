const prisma = require('../config/database');

class CreditNoteRepository {
  async create(data, tx = prisma) {
    return tx.creditNote.create({ data });
  }

  async findById(id, tx = prisma) {
    return tx.creditNote.findUnique({
      where: { id },
      include: {
        warung: true,
        sales_return: true
      }
    });
  }

  async findMany(filters = {}, tx = prisma) {
    return tx.creditNote.findMany({
      where: filters,
      orderBy: { created_at: 'desc' },
      include: {
        warung: true
      }
    });
  }

  async update(id, data, tx = prisma) {
    return tx.creditNote.update({
      where: { id },
      data
    });
  }
}

module.exports = new CreditNoteRepository();
