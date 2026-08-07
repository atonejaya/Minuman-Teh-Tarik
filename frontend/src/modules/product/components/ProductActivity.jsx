import React from 'react';
import './ProductTabs.css';

const ProductActivity = ({ activities }) => {
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
          <div className="activity-dot"></div>
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

export default ProductActivity;
