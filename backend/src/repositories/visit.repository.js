const prisma = require('../config/database');

class VisitRepository {
  static async create(data, tx = prisma) {
    return tx.visit.create({ data });
  }

  static async update(id, data, tx = prisma) {
    return tx.visit.update({
      where: { id },
      data
    });
  }

  static async findById(id, tx = prisma) {
    return tx.visit.findUnique({
      where: { id },
      include: {
        warung: true,
        sales: true
      }
    });
  }

  static async findActiveVisitBySalesId(salesId, tx = prisma) {
    // Only one active visit per sales allowed
    return tx.visit.findFirst({
      where: {
        sales_id: salesId,
        status: {
          in: ['CHECKED_IN', 'SELLING', 'CHECKED_OUT']
        }
      },
      include: {
        warung: true
      }
    });
  }

  static async findTodayVisitsBySalesId(salesId, date, tx = prisma) {
    // Fetch visits for a specific date
    // ensure date is isolated to the current day in DB Date
    // Note: Since Prisma's db.Date compares date precisely, we might need a range or use it directly
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    return tx.visit.findMany({
      where: {
        sales_id: salesId,
        visit_date: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      include: {
        warung: true
      },
      orderBy: {
        planned_sequence: 'asc'
      }
    });
  }

  static async findMany(where = {}, tx = prisma) {
    return tx.visit.findMany({
      where,
      include: {
        warung: true,
        sales: true
      }
    });
  }

  static async count(where = {}, tx = prisma) {
    return tx.visit.count({ where });
  }
}

module.exports = VisitRepository;
