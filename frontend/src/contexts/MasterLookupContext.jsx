import React, { createContext, useContext, useState, useEffect } from 'react';
import LookupApiService from '../modules/product/services/LookupApiService';

const MasterLookupContext = createContext({
  lookups: null,
  loading: true,
  error: null,
});

const CACHE_KEY = 'masterLookups';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes in ms

export const MasterLookupProvider = ({ children }) => {
  const [lookups, setLookups] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const fetchLookups = async () => {
      setLoading(true);

      const cachedStr = localStorage.getItem(CACHE_KEY);
      if (cachedStr) {
        try {
          const cachedItem = JSON.parse(cachedStr);
          const isExpired = Date.now() - cachedItem.timestamp > CACHE_TTL;
          if (!isExpired) {
            if (mounted) {
              setLookups(cachedItem.data);
              setLoading(false);
            }
            return;
          }
        } catch (e) {
          // ignore cache parse errors
        }
      }

      try {
        const { data, errors } = await LookupApiService.getLookups();
        if (mounted) {
          if (errors) {
            setError(errors);
          } else {
            setLookups(data);
            localStorage.setItem(CACHE_KEY, JSON.stringify({
              data,
              timestamp: Date.now()
            }));
          }
        }
      } catch (err) {
        if (mounted) {
          setError([{ message: err.message || 'Gagal memuat data referensi' }]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchLookups();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <MasterLookupContext.Provider value={{ lookups, loading, error }}>
      {children}
    </MasterLookupContext.Provider>
  );
};

export const useMasterLookupContext = () => {
  const context = useContext(MasterLookupContext);
  if (context === undefined) {
    throw new Error('useMasterLookupContext must be used within a MasterLookupProvider');
  }
  return context;
};
