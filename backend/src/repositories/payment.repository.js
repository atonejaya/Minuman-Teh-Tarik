const prisma = require('../config/database');

class PaymentRepository {
  async create(data, tx = prisma) {
    return tx.payment.create({
      data,
      include: {
        transaction: true,
        creator: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    });
  }

  async findById(id, tx = prisma) {
    return tx.payment.findUnique({
      where: { id: Number(id) },
      include: {
        transaction: true,
        creator: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    });
  }

  async findByTransaction(transactionId, tx = prisma) {
    return tx.payment.findMany({
      where: { transaction_id: Number(transactionId) },
      orderBy: { payment_date: 'asc' },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    });
  }

  async findMany(tx = prisma) {
    return tx.payment.findMany({
      orderBy: { payment_date: 'desc' },
      include: {
        transaction: {
          select: {
            id: true,
            code: true,
            status: true
          }
        },
        creator: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    });
  }
}

module.exports = new PaymentRepository();
