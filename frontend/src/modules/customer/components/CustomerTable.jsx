import React, { useState } from 'react';
import CustomerStatusBadge from './CustomerStatusBadge';

const CustomerTable = ({ data, loading, onAction, onBulkAction }) => {
  const [selected, setSelected] = useState([]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelected(data.map(item => item.id));
    } else {
      setSelected([]);
    }
  };

  const handleSelect = (id) => {
    setSelected(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkSubmit = (action) => {
    if (selected.length === 0) return;
    onBulkAction(action, selected);
    setSelected([]);
  };

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--surface)' }}>
        <span style={{ fontSize: '14px', fontWeight: '500' }}>
          {selected.length} Selected
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn" disabled={selected.length === 0} onClick={() => handleBulkSubmit('ACTIVE')}>Activate</button>
          <button className="btn btn-outline" disabled={selected.length === 0} onClick={() => handleBulkSubmit('INACTIVE')}>Deactivate</button>
          <button className="btn btn-primary" disabled={selected.length === 0} onClick={() => handleBulkSubmit('TRANSFER_SALES')}>Transfer Sales</button>
          <button className="btn btn-outline" disabled={selected.length === 0} onClick={() => handleBulkSubmit('EXPORT')}>Export Excel</button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: 'var(--background)' }}>
            <tr>
              <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', width: '40px' }}>
                <input 
                  type="checkbox" 
                  checked={data?.length > 0 && selected.length === data.length}
                  onChange={handleSelectAll} 
                />
              </th>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '14px', borderBottom: '1px solid var(--border)' }}>Code</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '14px', borderBottom: '1px solid var(--border)' }}>Store Name</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '14px', borderBottom: '1px solid var(--border)' }}>Owner</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '14px', borderBottom: '1px solid var(--border)' }}>Sales</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '14px', borderBottom: '1px solid var(--border)' }}>Area / Route</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '14px', borderBottom: '1px solid var(--border)' }}>Status</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '14px', borderBottom: '1px solid var(--border)' }}>Outstanding</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '14px', borderBottom: '1px solid var(--border)' }}>Last Purchase</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '14px', borderBottom: '1px solid var(--border)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="10" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</td>
              </tr>
            ) : data?.length === 0 ? (
              <tr>
                <td colSpan="10" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>No customers found.</td>
              </tr>
            ) : (
              data?.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <input 
                      type="checkbox" 
                      checked={selected.includes(item.id)}
                      onChange={() => handleSelect(item.id)} 
                    />
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '500' }}>{item.code}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px' }}>{item.name}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--text-muted)' }}>{item.owner_name}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px' }}>{item.assignedSales?.name || '-'}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span>{item.area?.name || '-'}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.route?.name || '-'}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <CustomerStatusBadge status={item.status} />
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '600', color: 'var(--danger)' }}>
                    {item.outstanding > 0 ? `Rp ${Number(item.outstanding).toLocaleString('id-ID')}` : '-'}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--text-muted)' }}>
                    {item.last_invoice_date ? new Date(item.last_invoice_date).toLocaleDateString('id-ID') : '-'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => onAction('VIEW', item)}>
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CustomerTable;
