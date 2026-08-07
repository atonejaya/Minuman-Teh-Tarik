import { useState, useCallback } from 'react';
import ProductApiService from '../services/ProductApiService';

export const useProduct = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProduct = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const response = await ProductApiService.getProductById(id);
      setData(response.data || response);
      return response;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createProduct = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const response = await ProductApiService.createProduct(payload);
      return response;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProduct = useCallback(async (id, payload) => {
    setLoading(true);
    setError(null);
    try {
      const response = await ProductApiService.updateProduct(id, payload);
      return response;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProductStatus = useCallback(async (id, status) => {
    setLoading(true);
    setError(null);
    try {
      const response = await ProductApiService.updateProductStatus(id, status);
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
    fetchProduct,
    createProduct,
    updateProduct,
    updateProductStatus,
  };
};

export default useProduct;
