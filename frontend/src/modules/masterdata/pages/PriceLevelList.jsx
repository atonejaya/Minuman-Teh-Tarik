import React from 'react';
import MasterListPage from '../components/MasterListPage';
import MasterDataRepository from '../repositories/MasterDataRepository';

const columns = [
  { key: 'code', label: 'Kode' },
  { key: 'name', label: 'Nama' },
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Prioritas', render: (r) => r.priority ?? '-' },
];

const PriceLevelList = () => (
  <MasterListPage
    title="Level Harga"
    description="Tingkatan harga pelanggan"
    addPath="/price-levels"
    columns={columns}
    fetchList={(params) => MasterDataRepository.list('PriceLevel', params)}
    onToggleActive={(row) => MasterDataRepository.update('PriceLevel', row.id, { status: row.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })}
    getActive={(row) => row.status === 'ACTIVE'}
  />
);

export default PriceLevelList;
