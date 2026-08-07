import { useState, useCallback } from 'react';
import CustomerApiService from '../services/CustomerApiService';

export const useCustomerSearch = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const search = useCallback(async (query) => {
    if (!query) {
      setResults([]);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await CustomerApiService.searchCustomers(query);
      if (res.success) {
        setResults(res.data);
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, loading, error, search };
};
