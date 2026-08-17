import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import MasterFormPage from '../components/MasterFormPage';
import MasterDataRepository from '../repositories/MasterDataRepository';
import { supabase } from '../../../utils/supabase';

const SalesUserForm = () => {
  const [areas, setAreas] = useState([]);
  const { id } = useParams();
  const isEdit = !!id;

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('Area').select('id, name').eq('is_active', true).order('name');
      setAreas(data || []);
    };
    load();
  }, []);

  const baseFields = [
    { name: 'name', label: 'Nama', required: true },
    { name: 'username', label: 'Username', required: true },
    { name: 'phone', label: 'No. HP' },
    { name: 'area_id', label: 'Area', type: 'select', options: areas.map((a) => ({ value: a.id, label: a.name })) },
    { name: 'is_active', label: 'Aktif', type: 'checkbox', default: true },
  ];

  const fields = isEdit
    ? baseFields
    : [...baseFields, { name: 'password', label: 'Password', type: 'password', required: true }];

  return (
    <MasterFormPage
      title="Pengguna Sales"
      listPath="/sales-users"
      fields={fields}
      getById={(id) => MasterDataRepository.getById('User', id)}
      create={async (payload) => {
        const { error } = await supabase.rpc('create_sales_user', {
          p_username: payload.username,
          p_password: payload.password,
          p_name: payload.name,
          p_role: 'SALES',
          p_phone: payload.phone || null,
          p_area_id: payload.area_id ? Number(payload.area_id) : null,
          p_is_active: payload.is_active,
        });
        if (error) throw error;
        return true;
      }}
      update={(id, payload) => MasterDataRepository.update('User', id, { ...payload, role: 'SALES' })}
      toPayload={(payload) => ({ ...payload, area_id: payload.area_id ? Number(payload.area_id) : null })}
    />
  );
};

export default SalesUserForm;
