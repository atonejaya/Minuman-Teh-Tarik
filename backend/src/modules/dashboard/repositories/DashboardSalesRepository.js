const prisma = require('../../../config/database');
const dayjs = require('dayjs');

class DashboardSalesRepository {
  async getSummary(salesId, date) {
    const startOfDay = dayjs(date).startOf('day').toDate();
    const endOfDay = dayjs(date).endOf('day').toDate();
    
    const parsedSalesId = Number(salesId);

    // Omzet & Kas Masuk for this Sales
    const dailySales = await prisma.dailySalesSummary.aggregate({
      where: {
        sales_id: parsedSalesId,
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      _sum: {
        sales_amount: true,
        paid_amount: true
      }
    });

    // Barang Direfill for this Sales
    // We need to trace this back to the sales rep.
    // In OutletStockLedger, we don't have sales_id directly. We usually have warung_id.
    // However, the dashboard logic allows checking Visit or we can query SalesVisit related to the refill.
    // Let's check how OutletStockLedger relates to Sales. It has a reference_id and reference_type.
    // If reference_type === 'SALES_VISIT', reference_id is Visit ID. 
    // Wait, the Scope Gate says: "refill -> hanya refill yang attributable ke Sales tersebut".
    // I need to join with SalesVisit to filter by sales_id, or just use the Visit table.
    
    // First, let's find the visits for this sales today
    const visitsToday = await prisma.salesVisit.findMany({
      where: {
        sales_id: parsedSalesId,
        visit_date: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      select: { id: true }
    });
    
    const visitIds = visitsToday.map(v => v.id);

    let barang_direfill = 0;
    if (visitIds.length > 0) {
      const refillLedger = await prisma.outletStockLedger.aggregate({
        where: {
          movement_type: { in: ['REFILL', 'ISSUE_TO_OUTLET'] },
          reference_type: 'SALES_VISIT',
          reference_id: { in: visitIds },
          created_at: {
            gte: startOfDay,
            lte: endOfDay
          }
        },
        _sum: {
          qty_change: true
        }
      });
      barang_direfill = Number(refillLedger._sum.qty_change || 0);
    }

    return {
      omzet: Number(dailySales._sum.sales_amount || 0),
      kas_masuk: Number(dailySales._sum.paid_amount || 0),
      barang_direfill
    };
  }

  async getVisits(salesId, date) {
    const startOfDay = dayjs(date).startOf('day').toDate();
    const endOfDay = dayjs(date).endOf('day').toDate();

    const visits = await prisma.salesVisit.groupBy({
      by: ['status'],
      where: {
        sales_id: Number(salesId),
        visit_date: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      _count: true
    });

    let completed = 0;
    let planned = 0;

    for (const v of visits) {
      if (v.status === 'COMPLETED') completed += v._count;
      else if (v.status === 'PLANNED') planned += v._count;
    }

    return { completed, planned };
  }

  async getInventory(salesId) {
    const items = await prisma.mobileStock.findMany({
      where: {
        sales_id: Number(salesId),
        qty_available: { gt: 0 }
      },
      include: {
        product: { select: { name: true, sku: true } }
      }
    });

    return { items };
  }
}

module.exports = new DashboardSalesRepository();
