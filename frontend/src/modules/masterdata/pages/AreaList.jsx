import React from 'react';
import MasterListPage from '../components/MasterListPage';
import MasterDataRepository from '../repositories/MasterDataRepository';

const columns = [
  { key: 'code', label: 'Kode' },
  { key: 'name', label: 'Nama' },
  { key: 'regional_id', label: 'Regional', render: (r) => r.regional_id || '-' },
  { key: 'is_active', label: 'Status', render: (r) => (r.is_active ? 'Aktif' : 'Nonaktif') },
];

const AreaList = () => (
  <MasterListPage
    title="Area"
    description="Pengelompokan area untuk wilayah penjualan"
    addPath="/areas"
    columns={columns}
    fetchList={(params) => MasterDataRepository.list('Area', params)}
    onToggleActive={(row) => MasterDataRepository.update('Area', row.id, { is_active: !row.is_active })}
    getActive={(row) => row.is_active}
  />
);

export default AreaList;
