const QueryCache = require('../../../infrastructure/cache/QueryCache');
const DashboardSalesRepository = require('../repositories/DashboardSalesRepository');
const DashboardDto = require('../dto/dashboard.dto');
const dayjs = require('dayjs');

class DashboardSalesService {
  async getSummary(salesId, dateParam) {
    const date = dateParam || new Date();
    const dateStr = dayjs(date).format('YYYY-MM-DD');
    const cacheKey = QueryCache.generateKey('sales:summary', { sales_id: salesId, date: dateStr });
    
    const cachedData = await QueryCache.get(cacheKey);
    if (cachedData) {
      return DashboardDto.formatResponse(DashboardDto.formatSalesSummary(cachedData));
    }

    const data = await DashboardSalesRepository.getSummary(salesId, date);
    await QueryCache.set(cacheKey, data, 60);

    return DashboardDto.formatResponse(DashboardDto.formatSalesSummary(data));
  }

  async getVisits(salesId, dateParam) {
    const date = dateParam || new Date();
    const dateStr = dayjs(date).format('YYYY-MM-DD');
    const cacheKey = QueryCache.generateKey('sales:visits', { sales_id: salesId, date: dateStr });
    
    const cachedData = await QueryCache.get(cacheKey);
    if (cachedData) {
      return DashboardDto.formatResponse(DashboardDto.formatVisits(cachedData));
    }

    const data = await DashboardSalesRepository.getVisits(salesId, date);
    await QueryCache.set(cacheKey, data, 60);

    return DashboardDto.formatResponse(DashboardDto.formatVisits(data));
  }

  async getInventory(salesId) {
    const cacheKey = QueryCache.generateKey('sales:inventory', { sales_id: salesId });
    
    const cachedData = await QueryCache.get(cacheKey);
    if (cachedData) {
      return DashboardDto.formatResponse(DashboardDto.formatSalesInventory(cachedData));
    }

    const data = await DashboardSalesRepository.getInventory(salesId);
    await QueryCache.set(cacheKey, data, 60);

    return DashboardDto.formatResponse(DashboardDto.formatSalesInventory(data));
  }
}

module.exports = new DashboardSalesService();
