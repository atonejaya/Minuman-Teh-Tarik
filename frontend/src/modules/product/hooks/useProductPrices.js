import { useState, useCallback } from 'react';
import ProductPriceApiService from '../services/ProductPriceApiService';

export const useProductPrices = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPrices = useCallback(async (productId, params) => {
    setLoading(true);
    setError(null);
    try {
      const response = await ProductPriceApiService.getPrices(productId, params);
      setData(response.data || response);
      return response;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createPrice = useCallback(async (productId, payload) => {
    setLoading(true);
    setError(null);
    try {
      const response = await ProductPriceApiService.createPrice(productId, payload);
      return response;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePrice = useCallback(async (productId, priceId, payload) => {
    setLoading(true);
    setError(null);
    try {
      const response = await ProductPriceApiService.updatePrice(productId, priceId, payload);
      return response;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePriceStatus = useCallback(async (productId, priceId, status) => {
    setLoading(true);
    setError(null);
    try {
      const response = await ProductPriceApiService.updatePriceStatus(productId, priceId, status);
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
    fetchPrices,
    createPrice,
    updatePrice,
    updatePriceStatus,
  };
};

export default useProductPrices;
