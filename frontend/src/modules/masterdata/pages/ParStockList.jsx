import React from 'react';
import MasterListPage from '../components/MasterListPage';
import MasterDataRepository from '../repositories/MasterDataRepository';

const columns = [
  { key: 'warung', label: 'Warung', render: (r) => `${r.warung?.name || '-'} (${r.warung?.code || '-'})` },
  { key: 'product', label: 'Produk', render: (r) => `${r.product?.name || '-'} (${r.product?.code || '-'})` },
  { key: 'par_qty', label: 'Stok Normal' },
  { key: 'min_qty', label: 'Stok Minimum', render: (r) => r.min_qty ?? '-' },
  { key: 'max_qty', label: 'Stok Maksimum', render: (r) => r.max_qty ?? '-' },
  { key: 'is_active', label: 'Status', render: (r) => (r.is_active ? 'Aktif' : 'Nonaktif') },
];

const ParStockList = () => (
  <MasterListPage
    title="Stok Normal"
    description="Target level stok per warung per produk"
    addPath="/par-stock"
    columns={columns}
    fetchList={(params) => MasterDataRepository.list('OutletParStock', {
      ...params,
      select: '*, warung:Warung(name, code), product:Product(name, code)',
      order: 'id',
    })}
    onToggleActive={(row) => MasterDataRepository.update('OutletParStock', row.id, { is_active: !row.is_active })}
    getActive={(row) => row.is_active}
  />
);

export default ParStockList;
