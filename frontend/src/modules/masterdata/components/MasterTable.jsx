import React from 'react';
import { Pencil, Power, PowerOff } from 'lucide-react';
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
            <th style={{ ...tableCell, width: '80px', textAlign: 'center' }}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id}>
              {columns.map((c) => (
                <td key={c.key} style={tableCell}>{c.render ? c.render(row) : String(row[c.key] ?? '-')}</td>
              ))}
              <td style={{ ...tableCell, textAlign: 'center' }}>
                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                  <button
                    className="btn-icon"
                    title="Ubah"
                    onClick={() => onEdit(row.id)}
                    style={{
                      padding: '6px',
                      borderRadius: '6px',
                      color: 'var(--primary)',
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background-color 0.15s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--primary) 10%, transparent)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <Pencil size={15} />
                  </button>
                  {onToggleActive && (
                    <button
                      className="btn-icon"
                      title={getActive(row) ? 'Nonaktifkan' : 'Aktifkan'}
                      onClick={() => onToggleActive(row)}
                      style={{
                        padding: '6px',
                        borderRadius: '6px',
                        color: getActive(row) ? 'var(--danger)' : 'var(--success)',
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background-color 0.15s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'color-mix(in srgb, currentColor 10%, transparent)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {getActive(row) ? <PowerOff size={15} /> : <Power size={15} />}
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MasterTable;
