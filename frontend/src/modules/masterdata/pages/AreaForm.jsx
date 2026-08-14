import React from 'react';
import MasterFormPage from '../components/MasterFormPage';
import MasterDataRepository from '../repositories/MasterDataRepository';

const fields = [
  { name: 'name', label: 'Nama Area', required: true, placeholder: 'Contoh: Jakarta Selatan' },
  { name: 'code', label: 'Kode Area', disabled: true, placeholder: 'Otomatis Dibuat' },
  { name: 'is_active', label: 'Status', type: 'checkbox', default: true },
  { name: 'description', label: 'Keterangan (opsional)', placeholder: 'Contoh: Wilayah Jakarta Selatan' },
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
