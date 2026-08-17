import React from 'react';
import { tableCell } from '../../../utils/tableStyles.js';
import TableMessage from '../../../components/shared/TableMessage';

const MasterTable = ({ columns, data, loading, onEdit, onToggleActive, getActive }) => {
  if (loading) {
    return <TableMessage>Memuat...</TableMessage>;
  }

  if (!data || data.length === 0) {
    return <TableMessage>Tidak ada data.</TableMessage>;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead style={{ backgroundColor: 'var(--background)' }}>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={tableCell}>{c.label}</th>
            ))}
            <th style={tableCell}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id}>
              {columns.map((c) => (
                <td key={c.key} style={tableCell}>{c.render ? c.render(row) : String(row[c.key] ?? '-')}</td>
              ))}
              <td style={tableCell}>
                <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '12px', marginRight: '6px' }} onClick={() => onEdit(row.id)}>
                  Ubah
                </button>
                {onToggleActive && (
                  <button className="btn" style={{ padding: '4px 10px', fontSize: '12px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }} onClick={() => onToggleActive(row)}>
                    {getActive(row) ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MasterTable;
