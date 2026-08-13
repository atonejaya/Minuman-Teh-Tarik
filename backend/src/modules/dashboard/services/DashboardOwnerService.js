const QueryCache = require('../../../infrastructure/cache/QueryCache');
const DashboardOwnerRepository = require('../repositories/DashboardOwnerRepository');
const DashboardDto = require('../dto/dashboard.dto');
const dayjs = require('dayjs');

class DashboardOwnerService {
  async getSummary(dateParam) {
    const date = dateParam || new Date();
    const dateStr = dayjs(date).format('YYYY-MM-DD');
    const cacheKey = QueryCache.generateKey('owner:summary', { date: dateStr });
    
    const cachedData = await QueryCache.get(cacheKey);
    if (cachedData) {
      return DashboardDto.formatResponse(DashboardDto.formatOwnerSummary(cachedData));
    }

    const data = await DashboardOwnerRepository.getSummary(date);
    await QueryCache.set(cacheKey, data, 60);

    return DashboardDto.formatResponse(DashboardDto.formatOwnerSummary(data));
  }

  async getProducts(dateParam) {
    const date = dateParam || new Date();
    const dateStr = dayjs(date).format('YYYY-MM-DD');
    const cacheKey = QueryCache.generateKey('owner:products', { date: dateStr });
    
    const cachedData = await QueryCache.get(cacheKey);
    if (cachedData) {
      return DashboardDto.formatResponse(DashboardDto.formatOwnerProducts(cachedData));
    }

    const data = await DashboardOwnerRepository.getProducts(date);
    await QueryCache.set(cacheKey, data, 60);

    return DashboardDto.formatResponse(DashboardDto.formatOwnerProducts(data));
  }

  async getVisits(dateParam) {
    const date = dateParam || new Date();
    const dateStr = dayjs(date).format('YYYY-MM-DD');
    const cacheKey = QueryCache.generateKey('owner:visits', { date: dateStr });
    
    const cachedData = await QueryCache.get(cacheKey);
    if (cachedData) {
      return DashboardDto.formatResponse(DashboardDto.formatVisits(cachedData));
    }

    const data = await DashboardOwnerRepository.getVisits(date);
    await QueryCache.set(cacheKey, data, 60);

    return DashboardDto.formatResponse(DashboardDto.formatVisits(data));
  }
}

module.exports = new DashboardOwnerService();
