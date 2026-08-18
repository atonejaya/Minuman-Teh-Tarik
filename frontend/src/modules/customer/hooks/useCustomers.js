import { useState, useEffect, useCallback } from 'react';
import CustomerApiService from '../services/CustomerApiService';

export const useCustomers = (initialParams = {}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [params, setParams] = useState(initialParams);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await CustomerApiService.getCustomers(params);
      setData(result.data || []);
    } catch (err) {
      setError(err.message || 'Gagal memuat data warung');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  return { data, loading, error, setParams, refetch: fetchCustomers };
};
