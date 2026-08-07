const prisma = require('../../../../config/database');

class WarehouseTransferRepository {
  /**
   * Buat dokumen transfer beserta item (nested create). Status default PENDING.
   */
  async create(client, data) {
    const c = client || prisma;
    return c.warehouseTransfer.create({
      data: {
        transfer_number: data.transfer_number,
        type: data.type,
        warehouse_id: data.warehouse_id,
        sales_id: data.sales_id,
        transaction_date: data.transaction_date,
        status: data.status || 'PENDING',
        reference_type: data.reference_type,
        reference_id: data.reference_id,
        notes: data.notes,
        created_by: data.created_by,
        items: {
          create: data.items.map(item => ({
            product_id: item.product_id,
            qty: item.qty,
            batch_id: item.batch_id || null
          }))
        }
      },
      include: { items: true }
    });
  }

  /**
   * Idempotency lookup by (type, reference_type, reference_id).
   */
  async findByReference(client, type, referenceType, referenceId) {
    const c = client || prisma;
    return c.warehouseTransfer.findUnique({
      where: {
        type_reference_type_reference_id: {
          type: String(type),
          reference_type: String(referenceType),
          reference_id: String(referenceId)
        }
      },
      include: { items: true }
    });
  }

  async findById(client, id) {
    const c = client || prisma;
    return c.warehouseTransfer.findUnique({
      where: { id: Number(id) },
      include: { items: true }
    });
  }

  async updateStatus(client, id, status, extra = {}) {
    const c = client || prisma;
    return c.warehouseTransfer.update({
      where: { id: Number(id) },
      data: { status, ...extra }
    });
  }

  async list(client, query = {}) {
    const c = client || prisma;
    const { page = 1, pageSize = 20, type, status, warehouse_id, sales_id } = query;
    const take = Math.min(Number(pageSize) || 20, 100);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

    const where = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (warehouse_id) where.warehouse_id = Number(warehouse_id);
    if (sales_id) where.sales_id = Number(sales_id);

    const [data, total] = await Promise.all([
      c.warehouseTransfer.findMany({
        where,
        include: {
          items: true,
          warehouse: { select: { id: true, name: true } },
          sales: { select: { id: true, name: true } }
        },
        orderBy: { transaction_date: 'desc' },
        take,
        skip
      }),
      c.warehouseTransfer.count({ where })
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

module.exports = new WarehouseTransferRepository();
