import React from 'react';
import MasterListPage from '../components/MasterListPage';
import MasterDataRepository from '../repositories/MasterDataRepository';

const columns = [
  { key: 'code', label: 'Kode' },
  { key: 'name', label: 'Nama' },
  { key: 'address', label: 'Alamat', render: (r) => r.address || '-' },
  { key: 'is_active', label: 'Status', render: (r) => (r.is_active ? 'Aktif' : 'Nonaktif') },
];

const WarehouseList = () => (
  <MasterListPage
    title="Gudang"
    description="Gudang pusat untuk penyimpanan stok"
    addPath="/warehouses"
    columns={columns}
    fetchList={(params) => MasterDataRepository.list('Warehouse', params)}
    onToggleActive={(row) => MasterDataRepository.update('Warehouse', row.id, { is_active: !row.is_active })}
    getActive={(row) => row.is_active}
  />
);

export default WarehouseList;
