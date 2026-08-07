import { useState, useCallback } from 'react';
import ProductApiService from '../services/ProductApiService';

export const useProducts = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProducts = useCallback(async (params) => {
    setLoading(true);
    setError(null);
    try {
      const response = await ProductApiService.getProducts(params);
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
    fetchProducts,
  };
};

export default useProducts;
