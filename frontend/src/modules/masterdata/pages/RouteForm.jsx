import React, { useState, useEffect } from 'react';
import MasterFormPage from '../components/MasterFormPage';
import MasterDataRepository from '../repositories/MasterDataRepository';
import { supabase } from '../../../utils/supabase';

const RouteForm = () => {
  const [areas, setAreas] = useState([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('Area').select('id, name').eq('is_active', true).order('name');
      setAreas(data || []);
    };
    load();
  }, []);

  const fields = [
    { name: 'code', label: 'Kode', required: true },
    { name: 'name', label: 'Nama', required: true },
    { name: 'area_id', label: 'Area', type: 'select', options: areas.map((a) => ({ value: a.id, label: a.name })) },
    { name: 'description', label: 'Deskripsi' },
    { name: 'is_active', label: 'Aktif', type: 'checkbox', default: true },
  ];

  return (
    <MasterFormPage
      title="Rute"
      listPath="/routes"
      fields={fields}
      getById={(id) => MasterDataRepository.getById('Route', id)}
      create={(payload) => MasterDataRepository.create('Route', payload)}
      update={(id, payload) => MasterDataRepository.update('Route', id, payload)}
      toPayload={(payload) => ({ ...payload, area_id: payload.area_id ? Number(payload.area_id) : null })}
    />
  );
};

export default RouteForm;
