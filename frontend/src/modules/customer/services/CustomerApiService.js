import api from '../../../services/api';

const CustomerApiService = {
  getCustomers: async (params = {}) => {
    const response = await api.get('/master/customers', { params });
    return response.data;
  },

  searchCustomers: async (query) => {
    const response = await api.get('/master/customers/search', { params: { q: query } });
    return response.data;
  },

  getCustomerById: async (id) => {
    const response = await api.get(`/master/customers/${id}`);
    return response.data;
  },

  createCustomer: async (data) => {
    const response = await api.post('/master/customers', data);
    return response.data;
  },

  updateCustomer: async (id, data) => {
    const response = await api.put(`/master/customers/${id}`, data);
    return response.data;
  },

  updateCustomerStatus: async (id, status) => {
    const response = await api.put(`/master/customers/${id}/status`, { status });
    return response.data;
  },

  getCustomerDashboard: async (id) => {
    const response = await api.get(`/master/customers/${id}/dashboard`);
    return response.data;
  }
};

export default CustomerApiService;
