import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomers } from '../hooks/useCustomers';
import CustomerRepository from '../repositories/CustomerRepository';
import CustomerTable from '../components/CustomerTable';
import CustomerFilters from '../components/CustomerFilters';
import EntityListPage from '../../../components/entity/EntityListPage';
import { useToast } from '../../../components/toast/ToastContext';

const CustomerList = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [filters, setFilters] = useState({});
  const { data, loading, error, refetch, setParams } = useCustomers(filters);

  React.useEffect(() => {
    setParams(filters);
  }, [filters, setParams]);

  const handleAction = (action, item) => {
    if (action === 'VIEW') navigate(`/customers/${item.id}`);
  };

  const handleBulkAction = async (action, selectedIds) => {
    try {
      if (action === 'ACTIVE' || action === 'INACTIVE') {
        await Promise.all(selectedIds.map(id => CustomerRepository.update(id, { status: action })));
        refetch();
        toast.success('Status pelanggan berhasil diperbarui');
      } else {
        toast.info(`Aksi massal "${action}" belum tersedia`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Gagal menjalankan aksi massal');
    }
  };

  return (
    <EntityListPage
      headerProps={{
        title: "Pelanggan",
        description: "Kelola data warung dan toko",
        onAdd: () => navigate('/customers/new'),
        addButtonLabel: "+ Tambah Pelanggan"
      }}
      error={error}
      filterProps={<CustomerFilters filters={filters} setFilters={setFilters} />}
      tableComponent={<CustomerTable data={data} loading={loading} onAction={handleAction} onBulkAction={handleBulkAction} />}
    />
  );
};

export default CustomerList;
