const prisma = require('../../../config/database');

class CustomerLedgerReportRepository {
  async getCustomerLedger(filters, pagination) {
    const { customer_id, outstanding_only } = filters;
    const { page, limit, sort, order } = pagination;

    const where = {};
    if (customer_id) where.customer_id = customer_id;
    
    const skip = (page - 1) * limit;

    let dataQuery = prisma.customerLedgerSummary.findMany({
      where,
      skip,
      take: limit,
    });
    
    let countQuery = prisma.customerLedgerSummary.count({ where });

    // For outstanding_only we can filter where receivable - paid - credit_note > 0
    // But since it's Prisma, we might need raw query if we want to filter on calculated field, or we filter in memory if not large.
    // However, if we assume outstanding = receivable - paid - credit_note, we can just fetch and filter in JS if not natively supported, 
    // OR we can just return all if Prisma can't easily do it without raw. Let's use raw for outstanding_only if true, or just native for simplicity.
    // To be perfectly safe with Prisma, let's just do a native Prisma query first.

    let data = [];
    let total = 0;

    if (outstanding_only) {
      // Prisma doesn't easily support WHERE column1 - column2 > 0 without queryRaw.
      const rawWhere = customer_id ? `WHERE customer_id = ${Number(customer_id)} AND (receivable - paid - credit_note) > 0` : `WHERE (receivable - paid - credit_note) > 0`;
      const rawOrder = sort ? `ORDER BY ${sort} ${order}` : `ORDER BY last_transaction_date DESC`;
      
      data = await prisma.$queryRawUnsafe(`
        SELECT * FROM "CustomerLedgerSummary"
        ${rawWhere}
        ${rawOrder}
        LIMIT ${limit} OFFSET ${skip}
      `);
      
      const countRes = await prisma.$queryRawUnsafe(`
        SELECT count(*) as total FROM "CustomerLedgerSummary"
        ${rawWhere}
      `);
      total = Number(countRes[0].total);
    } else {
      const orderBy = {};
      if (sort) {
        orderBy[sort] = order;
      } else {
        orderBy.last_transaction_date = 'desc';
      }

      data = await prisma.customerLedgerSummary.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      });
      total = await prisma.customerLedgerSummary.count({ where });
    }

    // Calculate Summary
    const summaryData = await prisma.customerLedgerSummary.aggregate({
      where,
      _sum: {
        receivable: true,
        credit_note: true,
        paid: true,
      }
    });

    const total_ar = Number(summaryData._sum.receivable || 0);
    const credit_note = Number(summaryData._sum.credit_note || 0);
    const paid = Number(summaryData._sum.paid || 0);
    const outstanding = total_ar - credit_note - paid;

    return {
      data,
      total,
      summary: {
        total_ar,
        credit_note,
        outstanding,
      }
    };
  }
}

module.exports = new CustomerLedgerReportRepository();
