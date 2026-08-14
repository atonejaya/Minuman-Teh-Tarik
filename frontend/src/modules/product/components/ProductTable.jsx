import React from 'react';
import { Eye, Pencil, Power } from 'lucide-react';
import { formatRupiah } from '../../../utils/format';

const CELL = { padding: '10px 12px', fontSize: '14px', borderBottom: '1px solid var(--border)', textAlign: 'left' };
const TH = { ...CELL, fontSize: '13px', color: 'var(--text-muted)' };

const ProductTable = ({ data, loading, onView, onEdit, onToggle }) => {
  return (
    <div className="table-responsive">
      {loading && <p className="empty-hint">Memuat produk...</p>}
      {!loading && data.length === 0 && <p className="empty-hint">Tidak ada produk.</p>}
      {!loading && data.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: 'var(--background)' }}>
            <tr>
              <th style={TH}>Kode</th>
              <th style={TH}>Nama Produk</th>
              <th style={TH}>Kategori</th>
              <th style={TH}>Satuan</th>
              <th style={TH}>HPP (Modal)</th>
              <th style={TH}>Harga Jual</th>
              <th style={TH}>Status</th>
              <th style={TH}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {data.map((p) => (
              <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => onView(p)}>
                <td style={{ ...CELL, fontWeight: '500' }}>{p.code || '-'}</td>
                <td style={{ ...CELL, fontWeight: '600' }}>{p.name}</td>
                <td style={CELL}>{p.category?.name || '-'}</td>
                <td style={CELL}>{p.unit?.name || '-'}</td>
                <td style={CELL}>{formatRupiah(p.cost_price)}</td>
                <td style={CELL}>{formatRupiah(p.selling_price)}</td>
                <td style={CELL}>
                  <span className={`badge ${p.is_active ? 'badge-success' : 'badge-muted'}`}>
                    {p.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </td>
                <td style={CELL} onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="btn-action" title="Detail" onClick={() => onView(p)}><Eye size={14} /></button>
                    <button className="btn-action" title="Ubah" onClick={() => onEdit(p)}><Pencil size={14} /></button>
                    <button className="btn-action" title={p.is_active ? 'Nonaktifkan' : 'Aktifkan'} onClick={() => onToggle(p)}>
                      <Power size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ProductTable;
