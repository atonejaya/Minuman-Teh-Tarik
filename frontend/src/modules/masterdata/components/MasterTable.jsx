import React from 'react';

const cell = { padding: '12px 16px', fontSize: '14px', borderBottom: '1px solid var(--border)', textAlign: 'left' };

const MasterTable = ({ columns, data, loading, onEdit, onToggleActive, getActive }) => {
  if (loading) {
    return <p style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Memuat...</p>;
  }

  if (!data || data.length === 0) {
    return <p style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Tidak ada data.</p>;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead style={{ backgroundColor: 'var(--background)' }}>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={cell}>{c.label}</th>
            ))}
            <th style={cell}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id}>
              {columns.map((c) => (
                <td key={c.key} style={cell}>{c.render ? c.render(row) : String(row[c.key] ?? '-')}</td>
              ))}
              <td style={cell}>
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
