import React from 'react';
import './ProductTabs.css';

const getStatusEmoji = (type) => {
  const lower = type.toLowerCase();
  if (lower.includes('create')) return '🟢';
  if (lower.includes('update') || lower.includes('adjust')) return '🟡';
  if (lower.includes('price')) return '🔵';
  if (lower.includes('activate')) return '🟣';
  if (lower.includes('deactivate')) return '🔴';
  return '⚪';
};

const ProductActivityTab = ({ activities }) => {
  if (!activities || activities.length === 0) {
    return <div className="state-message">No activities recorded.</div>;
  }

  const formatDate = (dateStr) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateStr).toLocaleDateString('en-US', options);
  };

  return (
    <div className="activity-timeline">
      {activities.map((activity) => (
        <div key={activity.id} className="activity-item">
          <div className="activity-icon" style={{ fontSize: '1.25rem', marginRight: '1rem', zIndex: 1, background: 'var(--bg-color)', borderRadius: '50%' }}>
            {getStatusEmoji(activity.type)}
          </div>
          <div className="activity-content">
            <div className="activity-time">{formatDate(activity.date)}</div>
            <h4 className="activity-title">{activity.type}</h4>
            <p className="activity-desc">{activity.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProductActivityTab;
