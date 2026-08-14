import React, { useState, useEffect } from 'react';
import MasterFormPage from '../components/MasterFormPage';
import MasterDataRepository from '../repositories/MasterDataRepository';
import { supabase } from '../../../utils/supabase';

const SalesUserForm = () => {
  const [areas, setAreas] = useState([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('Area').select('id, name').eq('is_active', true).order('name');
      setAreas(data || []);
    };
    load();
  }, []);

  const fields = [
    { name: 'name', label: 'Nama', required: true },
    { name: 'username', label: 'Username', required: true },
    { name: 'role', label: 'Role', type: 'select', options: [
      { value: 'SALES', label: 'SALES' },
      { value: 'OWNER', label: 'OWNER' },
    ], required: true },
    { name: 'phone', label: 'No. HP' },
    { name: 'area_id', label: 'Area', type: 'select', options: areas.map((a) => ({ value: a.id, label: a.name })) },
    { name: 'is_active', label: 'Aktif', type: 'checkbox', default: true },
  ];

  return (
    <MasterFormPage
      title="Pengguna Sales"
      listPath="/sales-users"
      fields={fields}
      getById={(id) => MasterDataRepository.getById('User', id)}
      create={(payload) => MasterDataRepository.create('User', payload)}
      update={(id, payload) => MasterDataRepository.update('User', id, payload)}
      toPayload={(payload) => ({ ...payload, area_id: payload.area_id ? Number(payload.area_id) : null })}
    />
  );
};

export default SalesUserForm;
