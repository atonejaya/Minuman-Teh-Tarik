import { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabase';

const statusLabel = (status) => {
  const labels = { PAID: 'Lunas', PARTIAL: 'Sebagian', UNPAID: 'Belum Lunas', COMPLETED: 'Selesai', CANCELLED: 'Dibatalkan' };
  return labels[status] || status;
};

export const useCustomerTransactions = (id) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTransactions = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const { data: rows, error: err } = await supabase
        .from('SalesTransaction')
        .select('code, created_at, grand_total, payment_status, status')
        .eq('warung_id', id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (err) throw err;
      setData(
        (rows || []).map((t) => ({
          type: 'INVOICE',
          date: t.created_at,
          title: t.status === 'CANCELLED' ? `${t.code} (dibatalkan)` : t.code,
          amount: t.grand_total,
          description: `Status: ${statusLabel(t.payment_status || t.status)}`,
        }))
      );
    } catch (err) {
      setError(err.message || 'Gagal memuat transaksi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [id]);

  return { data, loading, error, refetch: fetchTransactions };
};
