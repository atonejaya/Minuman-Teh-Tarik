import React from 'react';
import { formatRupiah } from '../../../utils/format.js';

const CustomerTimeline = ({ events }) => {
  if (!events || events.length === 0) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
        Tidak ada aktivitas yang ditemukan.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {events.map((event, idx) => (
        <div key={idx} style={{ display: 'flex', gap: '14px', position: 'relative' }}>
          {/* Timeline line */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '20px', flexShrink: 0 }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: getTimelineColor(event.type),
              border: '2px solid var(--surface)',
              boxShadow: '0 0 0 2px ' + getTimelineColor(event.type),
              marginTop: '6px',
              zIndex: 1,
            }} />
            {idx !== events.length - 1 && (
              <div style={{
                flex: 1,
                width: '2px',
                backgroundColor: 'var(--border)',
              }} />
            )}
          </div>
          {/* Content */}
          <div style={{ flex: 1, paddingBottom: '20px', minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ minWidth: 0 }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                  {formatDate(event.date)}
                </span>
                <span style={{ fontSize: '14px', color: 'var(--text-main)', fontWeight: '600' }}>
                  {event.title}
                </span>
              </div>
              {event.amount && (
                <span style={{
                  fontSize: '14px',
                  fontWeight: '700',
                  color: event.amount > 0 ? 'var(--success)' : 'var(--danger)',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}>
                  {event.amount > 0 ? '+' : ''}{formatRupiah(event.amount)}
                </span>
              )}
            </div>
            {event.description && (
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
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
    case 'INVOICE': return 'var(--primary)';
    case 'PAYMENT': return 'var(--success)';
    case 'RETURN': return 'var(--danger)';
    case 'SYSTEM': return 'var(--text-muted)';
    default: return 'var(--border)';
  }
};

const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default CustomerTimeline;
