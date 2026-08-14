import { useState, useEffect, useCallback } from 'react';
import ProductApiService from '../services/ProductApiService';

export const useProduct = (id) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProduct = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const result = await ProductApiService.getById(id);
      setData(result.data);
    } catch (err) {
      setError(err.message || 'Gagal memuat produk');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  const createProduct = useCallback(async (payload) => {
    const result = await ProductApiService.create(payload);
    return result.data;
  }, []);

  const updateProduct = useCallback(async (productId, payload) => {
    const result = await ProductApiService.update(productId, payload);
    return result.data;
  }, []);

  const setActive = useCallback(async (productId, isActive) => {
    const result = await ProductApiService.setActive(productId, isActive);
    return result.data;
  }, []);

  return { data, loading, error, refetch: fetchProduct, createProduct, updateProduct, setActive };
};

export default useProduct;
