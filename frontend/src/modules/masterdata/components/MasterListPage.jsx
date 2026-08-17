import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import EntityListPage from '../../../components/entity/EntityListPage';
import MasterTable from './MasterTable';
import { useToast } from '../../../components/toast/ToastContext';

const MasterListPage = ({ title, description, addPath, columns, fetchList, onToggleActive, getActive, pageSize = 20 }) => {
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchList({ page, pageSize });
      setData(result.data || []);
      setTotalPages(result.totalPages || 1);
    } catch (err) {
      setError(err.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, [fetchList, page, pageSize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggle = async (row) => {
    try {
      await onToggleActive(row);
      toast.success('Status berhasil diperbarui');
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Gagal memperbarui status');
    }
  };

  return (
    <EntityListPage
      title={title}
      description={description}
      error={error}
      actions={{
        left: [{ icon: Plus, iconOnly: true, tooltip: 'Tambah', variant: 'primary', onClick: () => navigate(`${addPath}/new`) }],
      }}
      table={(props) => (
        <MasterTable
          {...props}
          data={data}
          loading={loading}
          columns={columns}
          onEdit={(id) => navigate(`${addPath}/${id}/edit`)}
          onToggleActive={onToggleActive ? handleToggle : null}
          getActive={getActive}
        />
      )}
      pagination={{ currentPage: page, totalPages }}
      onPageChange={setPage}
    />
  );
};

export default MasterListPage;
