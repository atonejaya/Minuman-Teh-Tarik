import { useState, useEffect } from 'react';

export const useCustomerTransactions = (id) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    // Mocking the delay and returning empty state placeholder
    // Dependency for Sprint 10.7A
    setLoading(true);
    setTimeout(() => {
      setData([]); // Return empty to trigger Enterprise Empty State
      setLoading(false);
    }, 500);
  }, [id]);

  return { data, loading, error, refetch: () => {} };
};
