import { useState, useEffect, useCallback } from 'react';
import CustomerApiService from '../services/CustomerApiService';

export const useCustomer = (id) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCustomer = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const result = await CustomerApiService.getCustomerById(id);
      setData(result.data);
    } catch (err) {
      setError(err.message || 'Gagal memuat data warung');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  return { data, loading, error, refetch: fetchCustomer };
};
