const prisma = require('../config/database');

class ProductRepository {
  async create(data, tx = prisma) {
    return tx.product.create({ data });
  }

  async update(id, data, tx = prisma) {
    return tx.product.update({
      where: { id },
      data
    });
  }

  async findById(id, tx = prisma) {
    return tx.product.findUnique({
      where: { id },
      include: { prices: { include: { price_level: true } } }
    });
  }

  async findAll(options = {}, tx = prisma) {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      is_active,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = options;

    const skip = (page - 1) * limit;
    
    // Build where clause
    const where = {};
    
    // Default to active only unless specified
    if (is_active !== undefined) {
      where.is_active = is_active === 'true' || is_active === true;
    } else {
      where.is_active = true;
    }

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Build orderBy clause
    const allowedSortFields = ['display_order', 'name', 'created_at'];
    const orderByField = allowedSortFields.includes(sort_by) ? sort_by : 'created_at';
    const orderByDirection = sort_order.toLowerCase() === 'asc' ? 'asc' : 'desc';

    const [total, data] = await Promise.all([
      tx.product.count({ where }),
      tx.product.findMany({
        where,
        skip: Number(skip),
        take: Number(limit),
        orderBy: {
          [orderByField]: orderByDirection
        }
      })
    ]);

    const total_pages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        total_pages,
        has_next: page < total_pages,
        has_previous: page > 1
      }
    };
  }

  async softDelete(id, tx = prisma) {
    return tx.product.update({
      where: { id },
      data: {
        is_active: false,
        deleted_at: new Date()
      }
    });
  }

  async restore(id, tx = prisma) {
    return tx.product.update({
      where: { id },
      data: {
        is_active: true,
        deleted_at: null
      }
    });
  }

  async existsByCode(code, excludeId = null, tx = prisma) {
    const where = { code };
    if (excludeId) {
      where.id = { not: excludeId };
    }
    const count = await tx.product.count({ where });
    return count > 0;
  }

  async existsByName(name, excludeId = null, tx = prisma) {
    const where = { name };
    if (excludeId) {
      where.id = { not: excludeId };
    }
    const count = await tx.product.count({ where });
    return count > 0;
  }
}

module.exports = new ProductRepository();
