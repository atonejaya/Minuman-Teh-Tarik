const prisma = require('../config/database');

class BaseRepository {
  constructor(modelName) {
    this.model = prisma[modelName];
  }

  async findById(id, tx = null) {
    const client = tx || this.model;
    return client.findUnique({
      where: { id: Number(id) },
    });
  }

  async findMany(where = {}, orderBy = {}, tx = null) {
    const client = tx || this.model;
    return client.findMany({
      where,
      orderBy,
    });
  }

  async findManyWithPagination(where = {}, page = 1, limit = 20, orderBy = {}) {
    const skip = (page - 1) * limit;
    const [data, total] = await prisma.$transaction([
      this.model.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.model.count({ where }),
    ]);

    return { data, total };
  }

  async create(data, tx = null) {
    const client = tx || this.model;
    return client.create({ data });
  }

  async update(id, data, tx = null) {
    const client = tx || this.model;
    return client.update({
      where: { id: Number(id) },
      data,
    });
  }

  async softDelete(id, tx = null) {
    const client = tx || this.model;
    return client.update({
      where: { id: Number(id) },
      data: { is_active: false },
    });
  }

  async exists(where, tx = null) {
    const client = tx || this.model;
    const count = await client.count({ where });
    return count > 0;
  }
}

module.exports = BaseRepository;
