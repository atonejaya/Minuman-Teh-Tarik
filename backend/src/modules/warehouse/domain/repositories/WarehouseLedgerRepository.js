const prisma = require('../../../../config/database');

class WarehouseLedgerRepository {
  /**
   * Tulis baris ledger gudang (append-only / immutable).
   * balance = total stok gudang produk tsb (sum semua batch) setelah mutasi.
   */
  async create(client, data) {
    const c = client || prisma;
    return c.warehouseLedger.create({
      data: {
        warehouse_id: data.warehouse_id,
        sales_id: data.sales_id,
        product_id: data.product_id,
        movement_type: data.movement_type,
        qty: data.qty,
        balance: data.balance,
        reference_type: data.reference_type,
        reference_id: data.reference_id,
        notes: data.notes,
        created_by: data.created_by,
        transaction_date: data.transaction_date || new Date()
      }
    });
  }

  async list(client, query = {}) {
    const c = client || prisma;
    const { page = 1, pageSize = 20, warehouse_id, sales_id, product_id } = query;
    const take = Math.min(Number(pageSize) || 20, 100);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

    const where = {};
    if (warehouse_id) where.warehouse_id = Number(warehouse_id);
    if (sales_id) where.sales_id = Number(sales_id);
    if (product_id) where.product_id = Number(product_id);

    const [data, total] = await Promise.all([
      c.warehouseLedger.findMany({
        where,
        include: { product: { select: { id: true, name: true, code: true } } },
        orderBy: { created_at: 'desc' },
        take,
        skip
      }),
      c.warehouseLedger.count({ where })
    ]);

    return {
      data,
      pagination: {
        page: Math.max(Number(page) || 1, 1),
        pageSize: take,
        total,
        totalPages: Math.ceil(total / take)
      }
    };
  }
}

module.exports = new WarehouseLedgerRepository();
