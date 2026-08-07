import { normalizeApiResponse } from '../utils/apiResponse';
// Assuming ApiServices is structured in a common way, if not, this can be updated
import * as ProductApiService from '../services/productApiService';

class ProductRepository {
  static async getAll(params) {
    const response = await ProductApiService.getAll(params);
    return normalizeApiResponse(response);
  }

  static async getById(id) {
    const response = await ProductApiService.getById(id);
    return normalizeApiResponse(response);
  }

  static async create(data) {
    const response = await ProductApiService.create(data);
    return normalizeApiResponse(response);
  }

  static async update(id, data) {
    const response = await ProductApiService.update(id, data);
    return normalizeApiResponse(response);
  }

  static async remove(id) {
    const response = await ProductApiService.remove(id);
    return normalizeApiResponse(response);
  }
}

export default ProductRepository;
