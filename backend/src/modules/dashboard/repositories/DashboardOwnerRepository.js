const prisma = require('../../../config/database');
const dayjs = require('dayjs');

class DashboardOwnerRepository {
  async getSummary(date) {
    const startOfDay = dayjs(date).startOf('day').toDate();
    const endOfDay = dayjs(date).endOf('day').toDate();

    // Omzet & Kas Masuk
    const dailySales = await prisma.dailySalesSummary.aggregate({
      where: {
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

    // Piutang (Canonical AR)
    const arProjection = await prisma.accountsReceivableProjection.aggregate({
      _sum: {
        outstanding_amount: true
      }
    });

    // Nilai Persediaan
    const warehouseStocks = await prisma.warehouseStock.findMany({
      where: {
        condition: 'GOOD',
        qty_available: { gt: 0 }
      },
      include: {
        product: {
          select: { average_cost: true }
        }
      }
    });
    
    let nilai_persediaan = 0;
    for (const stock of warehouseStocks) {
      if (stock.product && stock.product.average_cost) {
        nilai_persediaan += stock.qty_available * Number(stock.product.average_cost);
      }
    }

    // Barang Direfill
    const refillLedger = await prisma.outletStockLedger.aggregate({
      where: {
        movement_type: { in: ['REFILL', 'ISSUE_TO_OUTLET'] },
        created_at: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      _sum: {
        qty_change: true
      }
    });

    return {
      omzet: Number(dailySales._sum.sales_amount || 0),
      kas_masuk: Number(dailySales._sum.paid_amount || 0),
      piutang: Number(arProjection._sum.outstanding_amount || 0),
      nilai_persediaan,
      barang_direfill: Number(refillLedger._sum.qty_change || 0)
    };
  }

  async getProducts(date) {
    const startOfDay = dayjs(date).startOf('day').toDate();
    
    // Check if ProductSalesSummary has product relation in schema
    // In schema.prisma, ProductSalesSummary does NOT have a relation defined to Product explicitly in the summary model? Wait, it has `product_id`.
    // I will just fetch the summary and map it if needed, but since we just need the data, we'll return it as is or fetch products separately if needed.
    // Let's just fetch without include to be safe from Prisma relation errors if not defined.
    const topSelling = await prisma.productSalesSummary.findMany({
      orderBy: { net_sales_qty: 'desc' },
      take: 10
    });

    const slowMoving = await prisma.productSalesSummary.findMany({
      orderBy: { net_sales_qty: 'asc' },
      take: 10
    });

    const expiringSoon = await prisma.productBatch.findMany({
      where: {
        expired_at: {
          gte: startOfDay,
          lte: dayjs(startOfDay).add(30, 'day').toDate()
        },
        warehouse_stocks: {
          some: { qty_available: { gt: 0 } }
        }
      },
      include: {
        product: { select: { name: true, sku: true } }
      }
    });

    return {
      top_selling: topSelling,
      slow_moving: slowMoving,
      expiring_soon: expiringSoon
    };
  }

  async getVisits(date) {
    const startOfDay = dayjs(date).startOf('day').toDate();
    const endOfDay = dayjs(date).endOf('day').toDate();

    const visits = await prisma.salesVisit.groupBy({
      by: ['status'],
      where: {
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
}

module.exports = new DashboardOwnerRepository();
