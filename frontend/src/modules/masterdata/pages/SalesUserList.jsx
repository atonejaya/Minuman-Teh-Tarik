import React from 'react';
import MasterListPage from '../components/MasterListPage';
import MasterDataRepository from '../repositories/MasterDataRepository';

const columns = [
  { key: 'username', label: 'Username' },
  { key: 'name', label: 'Nama' },
  { key: 'phone', label: 'No. HP', render: (r) => r.phone || '-' },
  { key: 'area_id', label: 'Area', render: (r) => r.area?.name || '-' },
  { key: 'is_active', label: 'Status', render: (r) => (r.is_active ? 'Aktif' : 'Nonaktif') },
];

const SalesUserList = () => (
  <MasterListPage
    title="Pengguna Sales"
    description="Akun sales dan staf penjualan"
    addPath="/sales-users"
    columns={columns}
    fetchList={(params) => MasterDataRepository.list('User', {
      ...params,
      select: '*, area:Area(name)',
      order: 'name',
      filters: { role: 'SALES' },
    })}
    onToggleActive={(row) => MasterDataRepository.update('User', row.id, { is_active: !row.is_active })}
    getActive={(row) => row.is_active}
  />
);

export default SalesUserList;
