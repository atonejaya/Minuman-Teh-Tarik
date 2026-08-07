import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomers } from '../hooks/useCustomers';
import CustomerRepository from '../repositories/CustomerRepository';
import CustomerTable from '../components/CustomerTable';
import CustomerFilters from '../components/CustomerFilters';
import EntityListPage from '../../../components/entity/EntityListPage';

const CustomerList = () => {
  const navigate = useNavigate();
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
      } else {
        alert(`Bulk action ${action} is mocked for Sprint 10.7`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to execute bulk action');
    }
  };

  return (
    <EntityListPage
      headerProps={{
        title: "Customers",
        description: "Manage warung and store data",
        onAdd: () => navigate('/customers/new'),
        addButtonLabel: "+ Add Customer"
      }}
      error={error}
      filterProps={<CustomerFilters filters={filters} setFilters={setFilters} />}
      tableComponent={<CustomerTable data={data} loading={loading} onAction={handleAction} onBulkAction={handleBulkAction} />}
    />
  );
};

export default CustomerList;
