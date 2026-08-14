import React, { useState, useEffect } from 'react';
import MasterFormPage from '../components/MasterFormPage';
import MasterDataRepository from '../repositories/MasterDataRepository';
import { supabase } from '../../../utils/supabase';

const RouteForm = () => {
  const [areas, setAreas] = useState([]);
  const [salesList, setSalesList] = useState([]);

  useEffect(() => {
    const load = async () => {
      const [areaRes, salesRes] = await Promise.all([
        supabase.from('Area').select('id, name').eq('is_active', true).order('name'),
        supabase.from('User').select('id, name').eq('role', 'SALES').eq('is_active', true).order('name')
      ]);
      setAreas(areaRes.data || []);
      setSalesList(salesRes.data || []);
    };
    load();
  }, []);

  const fields = [
    { name: 'name', label: 'Nama Rute', required: true, placeholder: 'Contoh: Rute Cipete - Kemang' },
    { name: 'code', label: 'Kode Rute', disabled: true, placeholder: 'Otomatis Dibuat' },
    { name: 'area_id', label: 'Area', type: 'select', options: areas.map((a) => ({ value: a.id, label: a.name })), required: true },
    { name: 'sales_id', label: 'Sales', type: 'select', options: salesList.map((s) => ({ value: s.id, label: s.name })), required: true },
    { name: 'visit_day', label: 'Hari Kunjungan', type: 'select', options: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map(d => ({ value: d, label: d })), required: true },
    { name: 'is_active', label: 'Status', type: 'checkbox', default: true },
    { name: 'description', label: 'Keterangan (opsional)', placeholder: 'Contoh: Kunjungan outlet wilayah Cipete dan Kemang' },
  ];

  return (
    <MasterFormPage
      title="Rute"
      listPath="/routes"
      fields={fields}
      getById={(id) => MasterDataRepository.getById('Route', id)}
      create={(payload) => MasterDataRepository.create('Route', payload)}
      update={(id, payload) => MasterDataRepository.update('Route', id, payload)}
      toPayload={(payload) => ({ 
        ...payload, 
        area_id: payload.area_id ? Number(payload.area_id) : null,
        sales_id: payload.sales_id ? Number(payload.sales_id) : null 
      })}
    />
  );
};

export default RouteForm;
