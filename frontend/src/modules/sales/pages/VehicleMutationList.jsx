import React, { useState, useEffect, useCallback } from 'react';
import EntityListPage from '../../../components/entity/EntityListPage';
import VehicleMutationRepository from '../../../repositories/VehicleMutationRepository';
import { formatDate } from '../../../utils/format';

const BADGE_COLORS = {
  GOOD: 'badge-success',
  DAMAGED: 'badge-danger',
  EXPIRED: 'badge-warning',
};

const VehicleMutationList = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchMutations = useCallback(async () => {
    setLoading(true);
    try {
      const result = await VehicleMutationRepository.getMutations({ page, pageSize: 20 });
      setData(result.data || []);
      setTotalPages(result.meta?.totalPages || 1);
    } catch (error) {
      console.error('Error fetching vehicle mutations:', error);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchMutations();
  }, [fetchMutations]);

  const columns = [
    {
      header: 'Waktu Transaksi',
      accessor: (row) => formatDate(row.transaction_date) + ' ' + new Date(row.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    },
    {
      header: 'Referensi',
      accessor: 'reference_id',
    },
    {
      header: 'Sales',
      accessor: (row) => row.sales?.name || '-',
    },
    {
      header: 'Gudang',
      accessor: (row) => row.warehouse?.name || '-',
    },
    {
      header: 'Produk',
      accessor: (row) => row.product?.name || '-',
    },
    {
      header: 'Kuantitas (Cup)',
      accessor: (row) => <span style={{ fontWeight: 600 }}>{row.qty}</span>,
    },
    {
      header: 'Kondisi / Tipe',
      accessor: (row) => {
        const cond = row.notes?.toUpperCase() || 'GOOD';
        const color = BADGE_COLORS[cond] || 'badge-muted';
        const label = cond === 'GOOD' ? 'Mutasi Bagus' : cond === 'DAMAGED' ? 'Rusak (Retur)' : cond === 'EXPIRED' ? 'Expired (Retur)' : cond;
        return <span className={`badge ${color}`}>{label}</span>;
      },
    },
  ];

  return (
    <EntityListPage
      title="Riwayat Mutasi & Retur"
      columns={columns}
      data={data}
      loading={loading}
      page={page}
      totalPages={totalPages}
      onPageChange={setPage}
    />
  );
};

export default VehicleMutationList;
