import React, { useState } from 'react';
import EntityToolbar from '../shared/EntityToolbar';

const EntityDetailPage = ({ title, summary, tabs, actions }) => {
  const [activeTab, setActiveTab] = useState(tabs && tabs.length > 0 ? tabs[0].id : null);

  return (
    <div className="entity-detail-page">
      <div className="page-header mb-4">
        <h2>{title || 'Detail Entitas'}</h2>
      </div>

      <EntityToolbar actions={actions} />

      <div className="summary-card card mb-4">
        <div className="card-body">
          {summary || <p className="text-muted">Ringkasan tidak tersedia.</p>}
        </div>
      </div>

      <div className="tabs-container">
        <ul className="nav nav-tabs mb-3">
          {tabs?.map(tab => (
            <li className="nav-item" key={tab.id}>
              <button
                className={`nav-link ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            </li>
          ))}
        </ul>

        <div className="tab-content">
          {tabs?.find(t => t.id === activeTab)?.content || <p className="text-muted">Tidak ada konten untuk tab ini.</p>}
        </div>
      </div>
    </div>
  );
};

export default EntityDetailPage;
