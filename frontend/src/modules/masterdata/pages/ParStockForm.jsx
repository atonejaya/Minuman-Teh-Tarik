import React, { useState, useEffect } from 'react';
import MasterFormPage from '../components/MasterFormPage';
import MasterDataRepository from '../repositories/MasterDataRepository';
import { supabase } from '../../../utils/supabase';

const ParStockForm = () => {
  const [warungs, setWarungs] = useState([]);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const load = async () => {
      const [w, p] = await Promise.all([
        supabase.from('Warung').select('id, name').eq('status', 'ACTIVE').order('name'),
        supabase.from('Product').select('id, name').eq('is_active', true).order('name'),
      ]);
      setWarungs(w.data || []);
      setProducts(p.data || []);
    };
    load();
  }, []);

  const fields = [
    { name: 'warung_id', label: 'Warung', type: 'select', options: warungs.map((w) => ({ value: w.id, label: w.name })), required: true },
    { name: 'product_id', label: 'Produk', type: 'select', options: products.map((p) => ({ value: p.id, label: p.name })), required: true },
    { name: 'par_qty', label: 'Stok Normal', type: 'number', required: true },
    { name: 'min_qty', label: 'Stok Minimum', type: 'number' },
    { name: 'max_qty', label: 'Stok Maksimum', type: 'number' },
    { name: 'priority', label: 'Prioritas', type: 'number' },
    { name: 'is_active', label: 'Aktif', type: 'checkbox', default: true },
  ];

  return (
    <MasterFormPage
      title="Stok Normal"
      listPath="/par-stock"
      fields={fields}
      getById={(id) => MasterDataRepository.getById('OutletParStock', id)}
      create={(payload) => MasterDataRepository.create('OutletParStock', payload)}
      update={(id, payload) => MasterDataRepository.update('OutletParStock', id, payload)}
      toPayload={(payload) => ({
        ...payload,
        warung_id: payload.warung_id ? Number(payload.warung_id) : null,
        product_id: payload.product_id ? Number(payload.product_id) : null,
      })}
    />
  );
};

export default ParStockForm;
