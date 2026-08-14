import React from 'react';
import MasterListPage from '../components/MasterListPage';
import MasterDataRepository from '../repositories/MasterDataRepository';

const columns = [
  { key: 'code', label: 'Kode' },
  { key: 'name', label: 'Nama' },
  { key: 'symbol', label: 'Simbol', render: (r) => r.symbol || '-' },
  { key: 'status', label: 'Status', render: (r) => (r.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif') },
];

const UnitList = () => (
  <MasterListPage
    title="Satuan"
    description="Kelola satuan untuk produk (contoh: Pcs, Cup, Botol)"
    addPath="/units"
    columns={columns}
    fetchList={(params) => MasterDataRepository.list('Unit', params)}
    onToggleActive={(row) => MasterDataRepository.update('Unit', row.id, { status: row.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })}
    getActive={(row) => row.status === 'ACTIVE'}
  />
);

export default UnitList;
