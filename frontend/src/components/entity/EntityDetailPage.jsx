import React, { useState } from 'react';
import EntityToolbar from '../shared/EntityToolbar';

const EntityDetailPage = ({ title, summary, tabs, actions }) => {
  const [activeTab, setActiveTab] = useState(tabs && tabs.length > 0 ? tabs[0].id : null);

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '600', color: 'var(--text-main)' }}>{title || 'Detail'}</h2>
        {actions && <EntityToolbar actions={actions} />}
      </div>

      {summary && (
        <div style={{ backgroundColor: 'var(--surface)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: '24px', boxShadow: 'var(--shadow-sm)' }}>
          {summary}
        </div>
      )}

      {tabs && tabs.length > 0 && (
        <div style={{ backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--background)' }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '14px 24px',
                  fontSize: '14px',
                  fontWeight: activeTab === tab.id ? '600' : '500',
                  color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
                  borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
                  backgroundColor: activeTab === tab.id ? 'var(--surface)' : 'transparent',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div style={{ padding: '0' }}>
            {tabs.find(t => t.id === activeTab)?.component || tabs.find(t => t.id === activeTab)?.content || (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Tidak ada konten untuk tab ini.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EntityDetailPage;
