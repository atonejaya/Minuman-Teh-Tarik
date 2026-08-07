import { normalizeApiResponse } from '../utils/apiResponse';
// Assuming ApiServices is structured in a common way, if not, this can be updated
import * as CustomerApiService from '../services/customerApiService';

class CustomerRepository {
  static async getAll(params) {
    const response = await CustomerApiService.getAll(params);
    return normalizeApiResponse(response);
  }

  static async getById(id) {
    const response = await CustomerApiService.getById(id);
    return normalizeApiResponse(response);
  }

  static async create(data) {
    const response = await CustomerApiService.create(data);
    return normalizeApiResponse(response);
  }

  static async update(id, data) {
    const response = await CustomerApiService.update(id, data);
    return normalizeApiResponse(response);
  }

  static async remove(id) {
    const response = await CustomerApiService.remove(id);
    return normalizeApiResponse(response);
  }
}

export default CustomerRepository;
