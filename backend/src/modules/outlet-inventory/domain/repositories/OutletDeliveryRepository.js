const prisma = require('../../../../config/database');

class OutletDeliveryRepository {
  /**
   * Buat dokumen delivery beserta item (nested create). Status default PENDING.
   */
  async create(client, data) {
    const c = client || prisma;
    return c.outletDelivery.create({
      data: {
        warung_id: data.warung_id,
        delivery_date: data.delivery_date,
        status: data.status || 'PENDING',
        reference_type: data.reference_type,
        reference_id: data.reference_id,
        notes: data.notes,
        performed_by: data.performed_by,
        items: {
          create: data.items.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity
          }))
        }
      },
      include: { items: true }
    });
  }

  /**
   * Idempotency lookup by (reference_type, reference_id).
   */
  async findByReference(client, referenceType, referenceId) {
    const c = client || prisma;
    return c.outletDelivery.findUnique({
      where: {
        reference_type_reference_id: {
          reference_type: String(referenceType),
          reference_id: String(referenceId)
        }
      },
      include: { items: true }
    });
  }

  async findById(client, id) {
    const c = client || prisma;
    return c.outletDelivery.findUnique({
      where: { id: Number(id) },
      include: { items: true }
    });
  }

  async updateStatus(client, id, status, extra = {}) {
    const c = client || prisma;
    return c.outletDelivery.update({
      where: { id: Number(id) },
      data: { status, ...extra }
    });
  }

  async listByWarung(client, warungId, query = {}) {
    const c = client || prisma;
    const { page = 1, pageSize = 20, status } = query;
    const take = Math.min(Number(pageSize) || 20, 100);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

    const where = { warung_id: Number(warungId) };
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      c.outletDelivery.findMany({
        where,
        include: { items: true },
        orderBy: { delivery_date: 'desc' },
        take,
        skip
      }),
      c.outletDelivery.count({ where })
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

module.exports = new OutletDeliveryRepository();
