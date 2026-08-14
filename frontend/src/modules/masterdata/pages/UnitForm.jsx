import React from 'react';
import MasterFormPage from '../components/MasterFormPage';
import MasterDataRepository from '../repositories/MasterDataRepository';

const fields = [
  { name: 'name', label: 'Nama Satuan', required: true, placeholder: 'Contoh: Pcs, Botol' },
  { name: 'code', label: 'Kode Satuan', disabled: true, placeholder: 'Otomatis Dibuat' },
  { name: 'symbol', label: 'Simbol', placeholder: 'Contoh: pcs, btl' },
  { name: 'status', label: 'Status', type: 'checkbox', default: true },
];

const UnitForm = () => {
  // Mapping checkbox to status string
  const toPayload = (formData) => {
    return {
      ...formData,
      status: formData.status === false ? 'INACTIVE' : 'ACTIVE',
    };
  };

  const getById = async (id) => {
    const data = await MasterDataRepository.getById('Unit', id);
    return { ...data, status: data.status === 'ACTIVE' };
  };

  return (
    <MasterFormPage
      title="Satuan"
      listPath="/units"
      fields={fields}
      getById={getById}
      create={(payload) => MasterDataRepository.create('Unit', toPayload(payload))}
      update={(id, payload) => MasterDataRepository.update('Unit', id, toPayload(payload))}
    />
  );
};

export default UnitForm;
