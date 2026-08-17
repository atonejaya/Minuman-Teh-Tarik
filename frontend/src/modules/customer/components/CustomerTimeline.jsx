import React from 'react';
import { formatRupiah } from '../../../utils/format.js';

const CustomerTimeline = ({ events }) => {
  if (!events || events.length === 0) {
    return (
      <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
        Tidak ada aktivitas yang ditemukan.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      {events.map((event, idx) => (
        <div key={idx} style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: getTimelineColor(event.type),
              marginTop: '4px'
            }} />
            {idx !== events.length - 1 && (
              <div style={{
                flex: 1,
                width: '2px',
                backgroundColor: 'var(--color-border)',
                marginTop: '4px'
              }} />
            )}
          </div>
          <div style={{ flex: 1, paddingBottom: 'var(--spacing-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', display: 'block', marginBottom: '2px' }}>
                  {formatDate(event.date)}
                </span>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)', fontWeight: '600' }}>
                  {event.title}
                </span>
              </div>
              {event.amount && (
                <span style={{ 
                  fontSize: 'var(--text-sm)', 
                  fontWeight: '700', 
                  color: event.amount > 0 ? 'var(--color-success)' : 'var(--color-danger)'
                }}>
                  {event.amount > 0 ? '+' : ''}{formatRupiah(event.amount)}
                </span>
              )}
            </div>
            {event.description && (
              <p style={{ margin: '4px 0 0 0', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                {event.description}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

const getTimelineColor = (type) => {
  switch(type) {
    case 'INVOICE': return 'var(--color-primary)';
    case 'PAYMENT': return 'var(--color-success)';
    case 'RETURN': return 'var(--color-danger)';
    case 'SYSTEM': return 'var(--color-text-tertiary)';
    default: return 'var(--color-border)';
  }
};

const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default CustomerTimeline;
