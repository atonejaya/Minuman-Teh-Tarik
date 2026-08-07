import { useState, useCallback } from 'react';
import MasterLookupApiService from '../services/MasterLookupApiService';

export const useMasterLookups = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchLookups = useCallback(async (params) => {
    setLoading(true);
    setError(null);
    try {
      const response = await MasterLookupApiService.getLookups(params);
      setData(response.data || response);
      return response;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    data,
    loading,
    error,
    fetchLookups,
  };
};

export default useMasterLookups;
