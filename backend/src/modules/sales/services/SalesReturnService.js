const prisma = require('../../../config/database');

class SalesReturnService {
  async _generateCode(tx) {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const prefix = `SR-${dateStr}-`;
    
    const lastReturn = await tx.salesReturn.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { code: 'desc' }
    });

    let seq = 1;
    if (lastReturn && lastReturn.code) {
      const lastSeq = parseInt(lastReturn.code.split('-')[2], 10);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }
    
    return `${prefix}${seq.toString().padStart(4, '0')}`;
  }

  async _emitDomainEvent(tx, eventName, aggregateId, payload) {
    await tx.outboxEvent.create({
      data: {
        event_name: eventName,
        aggregate_id: aggregateId.toString(),
        aggregate_type: 'SalesReturn',
        correlation_id: aggregateId.toString(),
        causation_id: aggregateId.toString(),
        payload: payload,
        occurred_at: new Date()
      }
    });
  }

  async createDraft(data, userId) {
    return await prisma.$transaction(async (tx) => {
      const code = await this._generateCode(tx);
      
      const salesReturn = await tx.salesReturn.create({
        data: {
          code,
          reference_type: data.reference_type || 'SALES',
          transaction_id: data.reference_type === 'SALES' ? data.transaction_id : null,
          delivery_id: data.reference_type === 'DELIVERY' ? data.delivery_id : null,
          visit_id: data.visit_id,
          sales_id: data.sales_id || userId,
          warung_id: data.warung_id,
          status: 'DRAFT',
          return_date: data.return_date ? new Date(data.return_date) : new Date(),
          total_amount: data.total_amount || 0,
          notes: data.notes,
          items: {
            create: (data.items || []).map(item => ({
              product_id: item.product_id,
              batch_id: item.batch_id,
              qty: item.qty,
              condition: item.condition,
              reason: item.reason,
              item_price: item.item_price || 0,
              subtotal: item.subtotal || 0,
              return_type: item.return_type
            }))
          }
        },
        include: { items: true }
      });

      return salesReturn;
    });
  }

  async checkReturn(id) {
    const updated = await prisma.salesReturn.update({
      where: { id: Number(id) },
      data: { status: 'CHECKED' },
      include: { items: true }
    });
    return updated;
  }

  async approveReturn(id) {
    return await prisma.$transaction(async (tx) => {
      const updated = await tx.salesReturn.update({
        where: { id: Number(id) },
        data: { status: 'APPROVED' },
        include: { items: true }
      });

      await this._emitDomainEvent(tx, 'SalesReturnApproved', updated.id, updated);
      
      return updated;
    });
  }

  async completeReturn(id) {
    const updated = await prisma.salesReturn.update({
      where: { id: Number(id) },
      data: { status: 'COMPLETED' },
      include: { items: true }
    });
    return updated;
  }

  async cancelReturn(id) {
    const updated = await prisma.salesReturn.update({
      where: { id: Number(id) },
      data: { status: 'CANCELLED' },
      include: { items: true }
    });
    return updated;
  }

  async getAll() {
    return await prisma.salesReturn.findMany({
      include: {
        items: true,
        sales: { select: { id: true, name: true } },
        warung: { select: { id: true, name: true } }
      },
      orderBy: { created_at: 'desc' }
    });
  }

  async getById(id) {
    return await prisma.salesReturn.findUnique({
      where: { id: Number(id) },
      include: {
        items: true,
        sales: { select: { id: true, name: true } },
        warung: { select: { id: true, name: true } }
      }
    });
  }
}

module.exports = new SalesReturnService();
