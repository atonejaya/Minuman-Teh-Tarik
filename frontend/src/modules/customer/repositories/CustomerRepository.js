import CustomerApiService from '../services/CustomerApiService';

class CustomerRepository {
  static async getAll(params) {
    const response = await CustomerApiService.getCustomers(params);
    return response.data || [];
  }

  static async getById(id) {
    const response = await CustomerApiService.getCustomerById(id);
    return response.data;
  }

  static async create(data) {
    const response = await CustomerApiService.createCustomer(data);
    return response.data;
  }

  static async update(id, data) {
    const response = await CustomerApiService.updateCustomer(id, data);
    return response.data;
  }

  static async updateStatus(id, status) {
    const response = await CustomerApiService.updateCustomerStatus(id, status);
    return response.data;
  }

  static async remove(id) {
    const response = await CustomerApiService.updateCustomerStatus(id, 'INACTIVE');
    return response.data;
  }
}

export default CustomerRepository;
