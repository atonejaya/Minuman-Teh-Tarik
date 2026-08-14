import React from 'react';
import MasterListPage from '../components/MasterListPage';
import MasterDataRepository from '../repositories/MasterDataRepository';

const DAY_LABELS = { MONDAY: 'Senin', TUESDAY: 'Selasa', WEDNESDAY: 'Rabu', THURSDAY: 'Kamis', FRIDAY: 'Jumat', SATURDAY: 'Sabtu', SUNDAY: 'Minggu' };

const columns = [
  { key: 'code', label: 'Kode' },
  { key: 'name', label: 'Nama' },
  { key: 'area_id', label: 'Area', render: (r) => r.area?.name || '-' },
  { key: 'sales_id', label: 'Sales', render: (r) => r.sales?.name || '-' },
  { key: 'visit_day', label: 'Hari Kunjungan', render: (r) => DAY_LABELS[r.visit_day] || r.visit_day || '-' },
  { key: 'is_active', label: 'Status', render: (r) => (r.is_active ? 'Aktif' : 'Nonaktif') },
];

const RouteList = () => (
  <MasterListPage
    title="Rute"
    description="Rute pengiriman yang dikelompokkan berdasarkan area"
    addPath="/routes"
    columns={columns}
    fetchList={(params) => MasterDataRepository.list('Route', { ...params, select: '*, area:Area(name), sales:User!sales_id(name)' })}
    onToggleActive={(row) => MasterDataRepository.update('Route', row.id, { is_active: !row.is_active })}
    getActive={(row) => row.is_active}
  />
);

export default RouteList;
