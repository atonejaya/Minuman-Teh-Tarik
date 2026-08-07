const prisma = require('../../../../config/database');
const AuditLogService = require('../../../../services/audit-log.service');

class ProductService {
  async generateProductCode() {
    return await prisma.$transaction(async (tx) => {
      const seq = await tx.numberSequence.upsert({
        where: { id: 'PRODUCT' },
        update: { last_value: { increment: 1 } },
        create: { id: 'PRODUCT', last_value: 1 }
      });
      return `PRD-${String(seq.last_value).padStart(6, '0')}`;
    });
  }

  async getAllProducts(query) {
    const { page = 1, limit = 10, search, category_id, brand_id, status } = query;
    const skip = (page - 1) * limit;

    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (category_id) where.category_id = parseInt(category_id);
    if (brand_id) where.brand_id = parseInt(brand_id);
    if (status) where.is_active = status === 'ACTIVE';

    const [total, data] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: {
          category: true,
          brand: true,
          packaging: true,
          unit: true,
          inventory_projection: true
        },
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { created_at: 'desc' }
      })
    ]);

    return { total, page: parseInt(page), limit: parseInt(limit), data };
  }

  async searchProducts(query) {
    const { q, limit = 50 } = query;
    if (!q) return [];
    
    return await prisma.product.findMany({
      where: {
        is_active: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { code: { contains: q, mode: 'insensitive' } },
          { barcode: { contains: q, mode: 'insensitive' } }
        ]
      },
      include: {
        category: true,
        brand: true,
        unit: true,
        prices: true,
        inventory_projection: true
      },
      take: parseInt(limit),
      orderBy: { name: 'asc' }
    });
  }

  async getProductById(id) {
    const product = await prisma.product.findUnique({
      where: { id: parseInt(id) },
      include: {
        category: true,
        brand: true,
        packaging: true,
        unit: true,
        supplier: true,
        tax: true,
        warehouse: true,
        prices: true,
        inventory_projection: true,
        dashboard_projection: true
      }
    });

    if (!product) throw new Error('Product not found');
    return product;
  }

  async createProduct(data, userId) {
    return await prisma.$transaction(async (tx) => {
      const code = await this.generateProductCode();
      
      const product = await tx.product.create({
        data: {
          ...data,
          code,
          inventory_projection: {
            create: { current_stock: 0, available_stock: 0, incoming_stock: 0, outgoing_stock: 0 }
          },
          dashboard_projection: {
            create: { total_sales: 0, total_revenue: 0, total_qty_sold: 0, margin: 0, current_stock: 0, days_of_inventory: 0 }
          }
        },
        include: { category: true, brand: true, unit: true, prices: true }
      });

      await AuditLogService.log(userId, 'CREATE', 'Product', product.id, product, tx);
      
      await tx.outboxEvent.create({
        data: {
          aggregate_id: product.id.toString(),
          aggregate_type: 'Product',
          event_name: 'ProductCreated',
          payload: product,
          status: 'PENDING'
        }
      });
      
      return product;
    });
  }

  async updateProduct(id, data, userId) {
    const product = await prisma.product.findUnique({ where: { id: parseInt(id) } });
    if (!product) throw new Error('Product not found');

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id: parseInt(id) },
        data: data,
        include: { category: true, brand: true, unit: true }
      });

      await AuditLogService.log(userId, 'UPDATE', 'Product', updated.id, updated, tx);

      const eventsToFire = [{
        aggregate_id: updated.id.toString(),
        aggregate_type: 'Product',
        event_name: 'ProductUpdated',
        payload: updated,
        status: 'PENDING'
      }];

      if (data.cost_price && data.cost_price !== product.cost_price) {
        eventsToFire.push({
          aggregate_id: updated.id.toString(),
          aggregate_type: 'Product',
          event_name: 'ProductCostPriceChanged',
          payload: { old_cost_price: product.cost_price, new_cost_price: updated.cost_price },
          status: 'PENDING'
        });
      }
      


      if (data.category_id && data.category_id !== product.category_id) {
        eventsToFire.push({
          aggregate_id: updated.id.toString(),
          aggregate_type: 'Product',
          event_name: 'ProductCategoryChanged',
          payload: { old_category_id: product.category_id, new_category_id: data.category_id },
          status: 'PENDING'
        });
      }

      await tx.outboxEvent.createMany({ data: eventsToFire });

      return updated;
    });
  }

  async updateProductStatus(id, status, userId) {
    const product = await prisma.product.findUnique({ where: { id: parseInt(id) } });
    if (!product) throw new Error('Product not found');

    const is_active = status === 'ACTIVE';
    if (product.is_active === is_active) return product;

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id: parseInt(id) },
        data: { is_active }
      });

      await AuditLogService.log(userId, 'UPDATE_STATUS', 'Product', updated.id, { old_status: product.is_active, new_status: is_active }, tx);
      
      await tx.outboxEvent.create({
        data: {
          aggregate_id: updated.id.toString(),
          aggregate_type: 'Product',
          event_name: is_active ? 'ProductActivated' : 'ProductDeactivated',
          payload: { status: is_active ? 'ACTIVE' : 'INACTIVE' },
          status: 'PENDING'
        }
      });
      
      return updated;
    });
  }
}

module.exports = new ProductService();
