const ReportingService = require('../../reporting/services/ReportingService');
const QueryCache = require('../../../infrastructure/cache/QueryCache');
const DashboardDto = require('../dto/dashboard.dto');

class DashboardService {
  async getSummary(filters) {
    const cacheKey = QueryCache.generateKey('dashboard_summary', filters);
    const cachedData = await QueryCache.get(cacheKey);
    if (cachedData) return cachedData;

    // Fetch data using ReportingService which uses Read Models
    // For Dashboard Summary, we might pull from DailySales and CustomerLedger
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [dailySalesResult, monthlySalesResult, ledgerResult, productResult] = await Promise.all([
      ReportingService.getDailySales({ date_from: startOfDay.toISOString() }, { page: 1, limit: 100 }),
      ReportingService.getDailySales({ date_from: startOfMonth.toISOString() }, { page: 1, limit: 100 }),
      ReportingService.getCustomerLedger({ outstanding_only: true }, { page: 1, limit: 1000 }),
      ReportingService.getProductSales({}, { page: 1, limit: 1, sort: 'net_sales_qty', order: 'desc' })
    ]);

    const dailySummary = dailySalesResult.summary;
    const monthlySummary = monthlySalesResult.summary;
    const ledgerSummary = ledgerResult.summary;
    const topProduct = productResult.data[0]?.product_id || null; // In real app, we might join with product name or keep it as ID

    const data = {
      omzet_hari_ini: dailySummary.total_sales,
      omzet_bulan_berjalan: monthlySummary.total_sales,
      total_invoice_hari_ini: dailySummary.total_invoice,
      invoice_belum_lunas: dailySummary.outstanding > 0 ? 1 : 0, // Placeholder mapping, real logic might count invoices
      total_piutang: ledgerSummary.total_ar,
      total_credit_note: ledgerSummary.credit_note,
      customer_aktif: ledgerResult.total, // Count of customers with outstanding
      produk_terjual_hari_ini: dailySummary.total_invoice, // Placeholder if qty not in daily summary
      top_selling_product: topProduct,
      last_synchronization_time: new Date().toISOString()
    };

    const formatted = DashboardDto.formatSummary(data);
    await QueryCache.set(cacheKey, formatted, 60);
    return formatted;
  }

  async getSalesAnalytics(filters) {
    const cacheKey = QueryCache.generateKey('dashboard_sales_analytics', filters);
    const cachedData = await QueryCache.get(cacheKey);
    if (cachedData) return cachedData;

    const result = await ReportingService.getDailySales(filters, { page: 1, limit: filters.limit || 30, sort: 'date', order: 'asc' });
    
    // Transform reporting data into analytics trends
    const data = {
      daily_sales_trend: result.data.map(r => ({ date: r.date, sales: r.sales_amount })),
      weekly_sales_trend: [], // Example aggregation logic
      monthly_sales_trend: [], 
      invoice_trend: result.data.map(r => ({ date: r.date, count: r.invoice_count })),
      payment_trend: result.data.map(r => ({ date: r.date, payment: r.paid_amount })),
      average_transaction_value: result.summary.total_invoice > 0 ? (result.summary.total_sales / result.summary.total_invoice) : 0
    };

    const formatted = DashboardDto.formatSalesAnalytics(data);
    await QueryCache.set(cacheKey, formatted, 60);
    return formatted;
  }

  async getProductAnalytics(filters) {
    const cacheKey = QueryCache.generateKey('dashboard_product_analytics', filters);
    const cachedData = await QueryCache.get(cacheKey);
    if (cachedData) return cachedData;

    const result = await ReportingService.getProductSales(filters, { page: filters.page || 1, limit: filters.top || 10, sort: 'net_sales_qty', order: 'desc' });
    
    const data = {
      top_10_product: result.data.map(r => ({ product_id: r.product_id, qty: r.net_sales_qty })),
      slow_moving_product: [], // Requires a different sort order
      revenue_per_product: result.data.map(r => ({ product_id: r.product_id, revenue: r.sales_value })),
      qty_sold: result.summary.qty_sold,
      average_selling_price: result.summary.average_price
    };

    const formatted = DashboardDto.formatProductAnalytics(data);
    await QueryCache.set(cacheKey, formatted, 60);
    return formatted;
  }

  async getCustomerAnalytics(filters) {
    const cacheKey = QueryCache.generateKey('dashboard_customer_analytics', filters);
    const cachedData = await QueryCache.get(cacheKey);
    if (cachedData) return cachedData;

    const result = await ReportingService.getCustomerLedger(filters, { page: filters.page || 1, limit: filters.top || 10, sort: 'receivable', order: 'desc' });
    
    const data = {
      top_customer: result.data.map(r => ({ customer_id: r.customer_id, ar: r.receivable })),
      outstanding_customer: result.data.map(r => ({ customer_id: r.customer_id, outstanding: r.outstanding })),
      customer_purchase_frequency: [],
      new_customer: 0,
      active_customer: result.total
    };

    const formatted = DashboardDto.formatCustomerAnalytics(data);
    await QueryCache.set(cacheKey, formatted, 60);
    return formatted;
  }

  async getReceivableAnalytics(filters) {
    const cacheKey = QueryCache.generateKey('dashboard_receivable_analytics', filters);
    const cachedData = await QueryCache.get(cacheKey);
    if (cachedData) return cachedData;

    const result = await ReportingService.getCustomerLedger(filters, { page: 1, limit: 1000 });
    
    const data = {
      total_outstanding: result.summary.outstanding,
      aging_receivable: [],
      collection_rate: result.summary.total_ar > 0 ? (result.summary.paid / result.summary.total_ar) * 100 : 0,
      credit_note_summary: result.summary.credit_note,
      outstanding_by_customer: result.data.slice(0, 10).map(r => ({ customer_id: r.customer_id, outstanding: r.outstanding }))
    };

    const formatted = DashboardDto.formatReceivableAnalytics(data);
    await QueryCache.set(cacheKey, formatted, 60);
    return formatted;
  }
}

module.exports = new DashboardService();
