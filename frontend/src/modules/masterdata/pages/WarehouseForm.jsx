import React from 'react';
import MasterFormPage from '../components/MasterFormPage';
import MasterDataRepository from '../repositories/MasterDataRepository';

const fields = [
  { name: 'code', label: 'Kode', required: true },
  { name: 'name', label: 'Nama', required: true },
  { name: 'address', label: 'Alamat' },
  { name: 'is_active', label: 'Aktif', type: 'checkbox', default: true },
];

const WarehouseForm = () => (
  <MasterFormPage
    title="Gudang"
    listPath="/warehouses"
    fields={fields}
    getById={(id) => MasterDataRepository.getById('Warehouse', id)}
    create={(payload) => MasterDataRepository.create('Warehouse', payload)}
    update={(id, payload) => MasterDataRepository.update('Warehouse', id, payload)}
  />
);

export default WarehouseForm;
