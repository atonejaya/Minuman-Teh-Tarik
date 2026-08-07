const prisma = require('../../../../config/database');

class CustomerService {
  async generateCustomerCode() {
    return await prisma.$transaction(async (tx) => {
      const seq = await tx.numberSequence.upsert({
        where: { id: 'CUSTOMER' },
        update: { last_value: { increment: 1 } },
        create: { id: 'CUSTOMER', last_value: 1 }
      });
      return `WRG-${String(seq.last_value).padStart(6, '0')}`;
    });
  }

  async getAll(query = {}) {
    const where = {};
    if (query.is_active !== undefined) {
      where.status = query.is_active === 'true' ? 'ACTIVE' : 'INACTIVE';
    }
    
    // Search by name, code, phone, owner
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { owner_name: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
        { whatsapp: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    
    if (query.sales_id) where.assigned_sales_id = parseInt(query.sales_id);
    if (query.area_id) where.area_id = parseInt(query.area_id);
    if (query.route_id) where.route_id = parseInt(query.route_id);
    if (query.status) where.status = query.status;
    if (query.visit_day) where.visit_day = query.visit_day;
    if (query.category_id) where.category_id = parseInt(query.category_id);

    return await prisma.warung.findMany({
      where,
      include: {
        assignedSales: true,
        category: true,
        area: { include: { regional: true } },
        route: true
      },
      orderBy: { name: 'asc' }
    });
  }

  async getById(id) {
    return await prisma.warung.findUnique({
      where: { id: parseInt(id) },
      include: {
        assignedSales: true,
        category: true,
        area: { include: { regional: true } },
        route: true
      }
    });
  }

  async create(data, createdBy) {
    return await prisma.$transaction(async (tx) => {
      const code = await this.generateCustomerCode();
      const warung = await tx.warung.create({
        data: {
          code,
          name: data.name,
          owner_name: data.owner_name,
          phone: data.phone,
          whatsapp: data.whatsapp,
          email: data.email,
          address: data.address,
          province: data.province,
          city: data.city,
          district: data.district,
          village: data.village,
          postal_code: data.postal_code,
          latitude: data.latitude,
          longitude: data.longitude,
          visit_day: data.visit_day,
          visit_week: data.visit_week,
          visit_order: data.visit_order,
          payment_term: data.payment_term,
          credit_limit: data.credit_limit,
          status: data.status || 'ACTIVE',
          assigned_sales_id: data.assigned_sales_id,
          category_id: data.category_id,
          area_id: data.area_id,
          route_id: data.route_id
        }
      });
      
      // Emit event
      await tx.outboxEvent.create({
        data: {
          event_name: 'CustomerCreatedEvent',
          aggregate_id: warung.id.toString(),
          aggregate_type: 'Customer',
          correlation_id: warung.id.toString(),
          causation_id: warung.id.toString(),
          payload: warung,
          metadata: { created_by: createdBy },
          occurred_at: new Date()
        }
      });
      
      return warung;
    });
  }

  async update(id, data, updatedBy) {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.warung.findUnique({ where: { id: parseInt(id) } });
      if (!existing) throw new Error('Customer not found');

      // Check for sales transfer
      if (data.assigned_sales_id && data.assigned_sales_id !== existing.assigned_sales_id) {
        // Validation: outstanding > 0 ?
        if (!data.override_transfer_restriction) {
          const ledger = await tx.customerLedgerSummary.findUnique({ where: { customer_id: existing.id } });
          if (ledger && Number(ledger.receivable) > 0) {
            throw new Error('Cannot transfer customer with outstanding balance > 0 unless override is true');
          }
        }
        
        // Log history
        await tx.customerSalesHistory.create({
          data: {
            customer_id: existing.id,
            old_sales_id: existing.assigned_sales_id,
            new_sales_id: data.assigned_sales_id,
            old_route_id: existing.route_id,
            new_route_id: data.route_id || existing.route_id,
            reason: data.transfer_reason || 'Manual update',
            transfer_type: 'MANUAL',
            created_by: updatedBy,
            effective_from: new Date()
          }
        });
      }

      // Ensure code is immutable
      delete data.code;
      delete data.override_transfer_restriction;
      delete data.transfer_reason;

      const updated = await tx.warung.update({
        where: { id: parseInt(id) },
        data
      });
      
      // Emit Event
      await tx.outboxEvent.create({
        data: {
          event_name: 'CustomerUpdatedEvent',
          aggregate_id: updated.id.toString(),
          aggregate_type: 'Customer',
          correlation_id: updated.id.toString(),
          causation_id: updated.id.toString(),
          payload: updated,
          metadata: { updated_by: updatedBy },
          occurred_at: new Date()
        }
      });
      
      return updated;
    });
  }

  async getDashboardSummary(id) {
    const customer = await this.getById(id);
    if (!customer) throw new Error('Customer not found');
    
    const ledger = await prisma.customerLedgerSummary.findUnique({ where: { customer_id: parseInt(id) } });
    
    const aggregates = await prisma.customerTransactionProjection.aggregate({
      where: { customer_id: parseInt(id) },
      _count: { id: true },
      _sum: { amount: true }
    });
    
    const invoices = await prisma.customerTransactionProjection.count({
      where: { customer_id: parseInt(id), type: 'INVOICE' }
    });
    const total_invoice = invoices;
    
    const payments = await prisma.customerTransactionProjection.aggregate({
      where: { customer_id: parseInt(id), type: 'PAYMENT' },
      _sum: { amount: true },
      _count: { id: true }
    });
    
    const returns = await prisma.customerTransactionProjection.aggregate({
      where: { customer_id: parseInt(id), type: 'RETURN' },
      _sum: { amount: true },
      _count: { id: true }
    });
    
    return {
      customer_info: customer,
      outstanding: ledger ? Number(ledger.receivable) : 0,
      credit_note: ledger ? Number(ledger.credit_note) : 0,
      lifetime_value: aggregates._sum.amount ? Number(aggregates._sum.amount) : 0,
      total_invoice: total_invoice,
      total_payment: payments._sum.amount ? Number(payments._sum.amount) : 0,
      total_return: returns._sum.amount ? Number(returns._sum.amount) : 0,
      average_invoice: total_invoice > 0 ? (aggregates._sum.amount ? Number(aggregates._sum.amount)/total_invoice : 0) : 0,
      last_visit: customer.last_visit_date,
      last_invoice: customer.last_invoice_date,
      last_payment: customer.last_payment_date,
      last_return: customer.last_return_date
    };
  }
}

module.exports = new CustomerService();
