const prisma = require('../config/database');

class SalesTransactionRepository {
  /**
   * Create SalesTransaction and its Items atomically
   */
  async create(data, tx = prisma) {
    return tx.salesTransaction.create({
      data: {
        code: data.code,
        visit_id: data.visit_id,
        sales_id: data.sales_id,
        warung_id: data.warung_id,
        payment_method: data.payment_method,
        payment_status: data.payment_status || 'UNPAID',
        status: data.status || 'DRAFT',
        subtotal: data.subtotal,
        item_discount: data.item_discount,
        transaction_discount: data.transaction_discount,
        tax: data.tax,
        grand_total: data.grand_total,
        notes: data.notes,
        items: {
          create: data.items.map(item => ({
            product_id: item.product_id,
            batch_id: item.batch_id,
            qty: item.qty,
            unit: item.unit,
            category: item.category,
            selling_price: item.selling_price,
            discount: item.discount,
            subtotal: item.subtotal,
            product_code: item.product_code,
            product_name: item.product_name,
            batch_number: item.batch_number,
            expired_at: item.expired_at
          }))
        }
      },
      include: {
        items: true,
        visit: true,
        sales: {
          select: { id: true, name: true, role: true }
        },
        warung: {
          select: { id: true, name: true, code: true }
        }
      }
    });
  }

  async findById(id, tx = prisma) {
    return tx.salesTransaction.findUnique({
      where: { id: Number(id) },
      include: {
        items: true,
        visit: true,
        sales: {
          select: { id: true, name: true, role: true }
        },
        warung: {
          select: { id: true, name: true, code: true }
        }
      }
    });
  }

  async findByCode(code, tx = prisma) {
    return tx.salesTransaction.findUnique({
      where: { code },
      include: {
        items: true,
        visit: true,
        sales: {
          select: { id: true, name: true, role: true }
        },
        warung: {
          select: { id: true, name: true, code: true }
        }
      }
    });
  }

  async updateStatus(id, status, tx = prisma) {
    return tx.salesTransaction.update({
      where: { id: Number(id) },
      data: { status },
      include: {
        items: true,
        visit: true,
        sales: {
          select: { id: true, name: true, role: true }
        },
        warung: {
          select: { id: true, name: true, code: true }
        }
      }
    });
  }

  async list(filters = {}, tx = prisma) {
    return tx.salesTransaction.findMany({
      where: filters,
      include: {
        items: true,
        visit: true,
        sales: {
          select: { id: true, name: true, role: true }
        },
        warung: {
          select: { id: true, name: true, code: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });
  }
}

module.exports = new SalesTransactionRepository();
