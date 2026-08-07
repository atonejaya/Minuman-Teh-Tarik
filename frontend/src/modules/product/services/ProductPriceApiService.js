import axios from 'axios';

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

class ProductPriceApiService {
  static getBaseUrl(productId) {
    return `/api/v1/master/products/${productId}/prices`;
  }

  static async getPrices(productId, params) {
    try {
      const response = await axios.get(this.getBaseUrl(productId), { params });
      return formatResponse(response);
    } catch (error) {
      return formatResponse(error.response);
    }
  }

  static async createPrice(productId, data) {
    try {
      const response = await axios.post(this.getBaseUrl(productId), data);
      return formatResponse(response);
    } catch (error) {
      return formatResponse(error.response);
    }
  }

  static async updatePrice(productId, priceId, data) {
    try {
      const response = await axios.put(`${this.getBaseUrl(productId)}/${priceId}`, data);
      return formatResponse(response);
    } catch (error) {
      return formatResponse(error.response);
    }
  }

  static async updatePriceStatus(productId, priceId, status) {
    try {
      const response = await axios.patch(`${this.getBaseUrl(productId)}/${priceId}/status`, { status });
      return formatResponse(response);
    } catch (error) {
      return formatResponse(error.response);
    }
  }
}

export default ProductPriceApiService;
