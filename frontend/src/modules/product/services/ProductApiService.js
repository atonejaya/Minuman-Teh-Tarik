import axios from 'axios';

const BASE_URL = '/api/v1/master/products';

const formatResponse = (response) => {
  if (!response || !response.data) {
    return { data: null, pagination: null, meta: null, errors: null };
  }
  const { data, pagination, meta, errors } = response.data;
  return {
    data: data !== undefined ? data : response.data,
    pagination: pagination || null,
    meta: meta || null,
    errors: errors || null,
  };
};

class ProductApiService {
  static async getProducts(params) {
    try {
      const response = await axios.get(BASE_URL, { params });
      return formatResponse(response);
    } catch (error) {
      return formatResponse(error.response);
    }
  }

  static async getProductById(id) {
    try {
      const response = await axios.get(`${BASE_URL}/${id}`);
      return formatResponse(response);
    } catch (error) {
      return formatResponse(error.response);
    }
  }

  static async createProduct(data) {
    try {
      const response = await axios.post(BASE_URL, data);
      return formatResponse(response);
    } catch (error) {
      return formatResponse(error.response);
    }
  }

  static async updateProduct(id, data) {
    try {
      const response = await axios.put(`${BASE_URL}/${id}`, data);
      return formatResponse(response);
    } catch (error) {
      return formatResponse(error.response);
    }
  }

  static async updateProductStatus(id, status) {
    try {
      const response = await axios.patch(`${BASE_URL}/${id}/status`, { status });
      return formatResponse(response);
    } catch (error) {
      return formatResponse(error.response);
    }
  }
}

export default ProductApiService;
