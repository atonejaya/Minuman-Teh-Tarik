const prisma = require('../../../../config/database');
const ApiError = require('../../../../exceptions/api-error');

const getAgingBucketStr = (maxAgingDays) => {
  if (maxAgingDays <= 0) return 'CURRENT';
  if (maxAgingDays <= 7) return '1_7_DAYS';
  if (maxAgingDays <= 14) return '8_14_DAYS';
  if (maxAgingDays <= 30) return '15_30_DAYS';
  return 'OVER_30_DAYS';
};

class ARQueryService {
  async getSalesOutletAR(warungId, salesId, role) {
    // 1. Lookup Warung
    const warung = await prisma.warung.findUnique({
      where: { id: parseInt(warungId, 10) },
      select: { code: true, assigned_sales_id: true }
    });

    if (!warung) {
      throw new ApiError(404, 'Warung not found');
    }

    // 2. Authorization
    if (role === 'SALES' && warung.assigned_sales_id !== salesId) {
      throw new ApiError(403, 'Forbidden');
    }

    // 3. Query CustomerARProjection
    const customerAR = await prisma.customerARProjection.findUnique({
      where: { customer_code: warung.code }
    });

    if (!customerAR) {
      return {
        total_outstanding: 0,
        total_invoice: 0,
        overdue_amount: 0,
        has_overdue: false,
        last_payment_date: null
      };
    }

    return {
      total_outstanding: Number(customerAR.total_outstanding),
      total_invoice: customerAR.total_invoice,
      overdue_amount: Number(customerAR.overdue_amount),
      has_overdue: Number(customerAR.overdue_amount) > 0,
      last_payment_date: customerAR.last_payment_date
    };
  }

  async getOwnerCollectionAR(params) {
    const { aging_bucket, min_outstanding, warung_id, sort_by, sort_dir, page = 1, limit = 10 } = params;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const groupByResult = await prisma.accountsReceivableProjection.groupBy({
      by: ['customer_code', 'customer_name'],
      where: {
        outstanding_amount: { gt: 0 },
        ...(warung_id ? { customer_code: warung_id } : {}) 
      },
      _sum: {
        outstanding_amount: true,
      },
      _max: {
        aging_days: true
      },
      _min: {
        due_date: true
      }
    });

    let collections = groupByResult.map(item => {
      const maxAging = item._max.aging_days || 0;
      return {
        outlet_code: item.customer_code,
        outlet_name: item.customer_name,
        total_outstanding: Number(item._sum.outstanding_amount || 0),
        max_aging_days: maxAging,
        aging_bucket: getAgingBucketStr(maxAging),
        oldest_due_date: item._min.due_date
      };
    });
    
    if (collections.length > 0) {
      const customerCodes = collections.map(c => c.outlet_code);
      const customerProjections = await prisma.customerARProjection.findMany({
        where: { customer_code: { in: customerCodes } },
        select: { customer_code: true, overdue_amount: true }
      });
      
      const overdueMap = {};
      customerProjections.forEach(p => {
        overdueMap[p.customer_code] = Number(p.overdue_amount);
      });

      collections = collections.map(c => ({
        ...c,
        overdue_amount: overdueMap[c.outlet_code] || 0
      }));
    }

    if (aging_bucket) {
      collections = collections.filter(c => c.aging_bucket === aging_bucket);
    }
    if (min_outstanding !== undefined) {
      const minVal = Number(min_outstanding);
      collections = collections.filter(c => c.total_outstanding >= minVal);
    }

    if (sort_by) {
      const dir = sort_dir === 'asc' ? 1 : -1;
      collections.sort((a, b) => {
        let valA = a[sort_by];
        let valB = b[sort_by];
        
        if (sort_by === 'due_date') {
          valA = a.oldest_due_date ? new Date(a.oldest_due_date).getTime() : 0;
          valB = b.oldest_due_date ? new Date(b.oldest_due_date).getTime() : 0;
        } else if (sort_by === 'outstanding') {
          valA = a.total_outstanding;
          valB = b.total_outstanding;
        } else if (sort_by === 'overdue') {
          valA = a.overdue_amount;
          valB = b.overdue_amount;
        }

        if (valA < valB) return -1 * dir;
        if (valA > valB) return 1 * dir;
        return 0;
      });
    } else {
      collections.sort((a, b) => b.total_outstanding - a.total_outstanding);
    }

    const totalRows = collections.length;
    const paginated = collections.slice(skip, skip + take);

    return {
      data: paginated,
      meta: {
        total_rows: totalRows,
        page: parseInt(page, 10),
        limit: take
      }
    };
  }
}

module.exports = new ARQueryService();
