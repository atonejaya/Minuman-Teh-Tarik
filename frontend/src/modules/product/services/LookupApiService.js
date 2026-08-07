import axios from 'axios';

const BASE_URL = '/api/v1/master/lookups';

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

class LookupApiService {
  static async getLookups(params) {
    try {
      const response = await axios.get(BASE_URL, { params });
      return formatResponse(response);
    } catch (error) {
      return formatResponse(error.response);
    }
  }
}

export default LookupApiService;
