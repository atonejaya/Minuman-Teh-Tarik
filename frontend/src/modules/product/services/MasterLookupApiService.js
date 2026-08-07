import axios from 'axios';

const BASE_URL = '/api/v1/master/lookups';

class MasterLookupApiService {
  static async getLookups(params) {
    const response = await axios.get(BASE_URL, { params });
    return response.data;
  }
}

export default MasterLookupApiService;
