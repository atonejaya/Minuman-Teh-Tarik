import React from 'react';
import MasterFormPage from '../components/MasterFormPage';
import MasterDataRepository from '../repositories/MasterDataRepository';

const fields = [
  { name: 'code', label: 'Kode', disabled: true, placeholder: 'Otomatis Dibuat' },
  { name: 'name', label: 'Nama', required: true },
  { name: 'status', label: 'Status', type: 'select', options: [
    { value: 'ACTIVE', label: 'Aktif' },
    { value: 'INACTIVE', label: 'Nonaktif' },
  ], default: 'ACTIVE' },
  { name: 'priority', label: 'Prioritas', type: 'number' },
];

const PriceLevelForm = () => (
  <MasterFormPage
    title="Level Harga"
    listPath="/price-levels"
    fields={fields}
    getById={(id) => MasterDataRepository.getById('PriceLevel', id)}
    create={(payload) => MasterDataRepository.create('PriceLevel', payload)}
    update={(id, payload) => MasterDataRepository.update('PriceLevel', id, payload)}
  />
);

export default PriceLevelForm;
