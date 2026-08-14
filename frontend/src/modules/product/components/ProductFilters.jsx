import React from 'react';
import { useMasterLookupContext } from '../../../contexts/MasterLookupContext';

const ProductFilters = ({ filters, setFilters }) => {
  const { lookups } = useMasterLookupContext();
  const categories = lookups?.categories || [];
  const brands = lookups?.brands || [];

  const set = (name, value) => setFilters((prev) => ({ ...prev, [name]: value }));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', alignItems: 'end' }}>
      <div>
        <label className="field-label">Cari</label>
        <input
          type="text"
          className="wizard-input"
          placeholder="Nama / SKU / Code"
          value={filters.search || ''}
          onChange={(e) => set('search', e.target.value)}
        />
      </div>
      <div>
        <label className="field-label">Kategori</label>
        <select className="wizard-input" value={filters.categoryId || ''} onChange={(e) => set('categoryId', e.target.value)}>
          <option value="">Semua Kategori</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="field-label">Status</label>
        <select className="wizard-input" value={filters.status || 'all'} onChange={(e) => set('status', e.target.value)}>
          <option value="all">Semua</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </select>
      </div>
    </div>
  );
};

export default ProductFilters;
