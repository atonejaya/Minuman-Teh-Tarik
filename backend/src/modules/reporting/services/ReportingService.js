const DailySalesReportRepository = require('../repositories/DailySalesReportRepository');
const CustomerLedgerReportRepository = require('../repositories/CustomerLedgerReportRepository');
const ProductSalesReportRepository = require('../repositories/ProductSalesReportRepository');
const SalesPerformanceReportRepository = require('../repositories/SalesPerformanceReportRepository');
const ReportingDto = require('../dto/reporting.dto');
const QueryCache = require('../../../infrastructure/cache/QueryCache');

class ReportingService {
  async getDailySales(filters, pagination) {
    const cacheKey = QueryCache.generateKey('daily_sales', filters, pagination);
    const cachedResponse = await QueryCache.get(cacheKey);
    if (cachedResponse) return cachedResponse;

    const result = await DailySalesReportRepository.getDailySales(filters, pagination);
    
    const formattedData = result.data.map(ReportingDto.formatDailySales);
    
    const response = ReportingDto.formatResponse(formattedData, result.summary, {
      page: pagination.page,
      limit: pagination.limit,
      total: result.total,
      total_pages: Math.ceil(result.total / pagination.limit),
    });

    await QueryCache.set(cacheKey, response, 60); // Cache for 60 seconds
    return response;
  }

  async getCustomerLedger(filters, pagination) {
    const cacheKey = QueryCache.generateKey('customer_ledger', filters, pagination);
    const cachedResponse = await QueryCache.get(cacheKey);
    if (cachedResponse) return cachedResponse;

    const result = await CustomerLedgerReportRepository.getCustomerLedger(filters, pagination);
    
    const formattedData = result.data.map(ReportingDto.formatCustomerLedger);
    
    const response = ReportingDto.formatResponse(formattedData, result.summary, {
      page: pagination.page,
      limit: pagination.limit,
      total: result.total,
      total_pages: Math.ceil(result.total / pagination.limit),
    });

    await QueryCache.set(cacheKey, response, 60);
    return response;
  }

  async getProductSales(filters, pagination) {
    const cacheKey = QueryCache.generateKey('product_sales', filters, pagination);
    const cachedResponse = await QueryCache.get(cacheKey);
    if (cachedResponse) return cachedResponse;

    const result = await ProductSalesReportRepository.getProductSales(filters, pagination);
    
    const formattedData = result.data.map(ReportingDto.formatProductSales);
    
    const response = ReportingDto.formatResponse(formattedData, result.summary, {
      page: pagination.page,
      limit: pagination.limit,
      total: result.total,
      total_pages: Math.ceil(result.total / pagination.limit),
    });

    await QueryCache.set(cacheKey, response, 60);
    return response;
  }

  async getSalesPerformance(filters, pagination) {
    const cacheKey = QueryCache.generateKey('sales_performance', filters, pagination);
    const cachedResponse = await QueryCache.get(cacheKey);
    if (cachedResponse) return cachedResponse;

    const result = await SalesPerformanceReportRepository.getSalesPerformance(filters, pagination);
    
    const formattedData = result.data.map(ReportingDto.formatSalesPerformance);
    
    const response = ReportingDto.formatResponse(formattedData, result.summary, {
      page: pagination.page,
      limit: pagination.limit,
      total: result.total,
      total_pages: Math.ceil(result.total / pagination.limit),
    });

    await QueryCache.set(cacheKey, response, 60);
    return response;
  }
}

module.exports = new ReportingService();
