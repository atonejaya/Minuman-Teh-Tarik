import React from 'react';
import MasterFormPage from '../components/MasterFormPage';
import MasterDataRepository from '../repositories/MasterDataRepository';

const fields = [
  { name: 'name', label: 'Nama Kategori', required: true, placeholder: 'Contoh: Minuman Dingin' },
  { name: 'code', label: 'Kode Kategori', disabled: true, placeholder: 'Otomatis Dibuat' },
  { name: 'status', label: 'Status', type: 'checkbox', default: true },
];

const CategoryForm = () => {
  const toPayload = (formData) => ({
    ...formData,
    status: formData.status === false ? 'INACTIVE' : 'ACTIVE',
  });

  const getById = async (id) => {
    const data = await MasterDataRepository.getById('ProductCategory', id);
    return { ...data, status: data.status === 'ACTIVE' };
  };

  return (
    <MasterFormPage
      title="Kategori Produk"
      listPath="/categories"
      fields={fields}
      getById={getById}
      create={(payload) => MasterDataRepository.create('ProductCategory', toPayload(payload))}
      update={(id, payload) => MasterDataRepository.update('ProductCategory', id, toPayload(payload))}
    />
  );
};

export default CategoryForm;
