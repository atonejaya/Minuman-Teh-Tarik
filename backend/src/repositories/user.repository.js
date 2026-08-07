const BaseRepository = require('./base.repository');
const prisma = require('../config/database');

class UserRepository extends BaseRepository {
  constructor() {
    super('user');
  }

  async findAll({ page = 1, limit = 20, search = '', sort = 'created_at', order = 'desc', includeInactive = false }) {
    const skip = (page - 1) * limit;
    
    let where = {};
    if (!includeInactive) {
      where.is_active = true;
    }

    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    let orderBy = {};
    if (sort) {
      orderBy[sort] = order;
    }

    const [data, total] = await prisma.$transaction([
      this.model.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy,
      }),
      this.model.count({ where }),
    ]);

    return { data, total, page: Number(page), limit: Number(limit) };
  }
}

module.exports = new UserRepository();
