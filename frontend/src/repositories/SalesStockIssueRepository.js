import api from '../services/api';

const SalesStockIssueRepository = {
  async getSalesStockIssues(params) {
    const response = await api.get('/sales/stock-issues', { params });
    return response.data;
  },

  async getSalesStockIssue(id) {
    const response = await api.get(`/sales/stock-issues/${id}`);
    return response.data;
  },

  async createSalesStockIssue(data) {
    const response = await api.post('/sales/stock-issues', data);
    return response.data;
  },

  async confirmSalesStockIssue(id) {
    const response = await api.post(`/sales/stock-issues/${id}/confirm`);
    return response.data;
  },

  async closeSalesStockIssue(id) {
    const response = await api.post(`/sales/stock-issues/${id}/close`);
    return response.data;
  }
};

export default SalesStockIssueRepository;
