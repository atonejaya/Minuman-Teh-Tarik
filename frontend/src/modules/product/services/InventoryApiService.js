import axios from 'axios';

const BASE_URL = '/api/v1/master/inventory';

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

class InventoryApiService {
  static async getInventory(params) {
    try {
      const response = await axios.get(BASE_URL, { params });
      return formatResponse(response);
    } catch (error) {
      return formatResponse(error.response);
    }
  }
  
  static async getInventoryById(id) {
    try {
      const response = await axios.get(`${BASE_URL}/${id}`);
      return formatResponse(response);
    } catch (error) {
      return formatResponse(error.response);
    }
  }
}

export default InventoryApiService;
