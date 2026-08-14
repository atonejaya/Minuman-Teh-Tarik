import React from 'react';
import MasterListPage from '../components/MasterListPage';
import MasterDataRepository from '../repositories/MasterDataRepository';

const columns = [
  { key: 'code', label: 'Kode' },
  { key: 'name', label: 'Nama Kategori' },
  { key: 'status', label: 'Status', render: (r) => (r.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif') },
];

const CategoryList = () => (
  <MasterListPage
    title="Kategori Produk"
    description="Kelola kategori produk (contoh: Minuman Dingin, Topping)"
    addPath="/categories"
    columns={columns}
    fetchList={(params) => MasterDataRepository.list('ProductCategory', params)}
    onToggleActive={(row) => MasterDataRepository.update('ProductCategory', row.id, { status: row.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })}
    getActive={(row) => row.status === 'ACTIVE'}
  />
);

export default CategoryList;
