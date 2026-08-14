import React from 'react';
import MasterFormPage from '../components/MasterFormPage';
import MasterDataRepository from '../repositories/MasterDataRepository';

const fields = [
  { name: 'code', label: 'Kode', required: true },
  { name: 'name', label: 'Nama', required: true },
  { name: 'regional_id', label: 'ID Regional', type: 'number' },
  { name: 'description', label: 'Deskripsi' },
  { name: 'is_active', label: 'Aktif', type: 'checkbox', default: true },
];

const AreaForm = () => (
  <MasterFormPage
    title="Area"
    listPath="/areas"
    fields={fields}
    getById={(id) => MasterDataRepository.getById('Area', id)}
    create={(payload) => MasterDataRepository.create('Area', payload)}
    update={(id, payload) => MasterDataRepository.update('Area', id, payload)}
  />
);

export default AreaForm;
