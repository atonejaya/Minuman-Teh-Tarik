import React from 'react';

const SkeletonCard = () => {
  return (
    <div className="card skeleton-card">
      <div className="card-body">
        <div className="skeleton skeleton-title" style={{ width: '50%', height: '24px', marginBottom: '10px', backgroundColor: '#e2e5e7' }}></div>
        <div className="skeleton skeleton-text" style={{ width: '100%', height: '16px', marginBottom: '5px', backgroundColor: '#e2e5e7' }}></div>
        <div className="skeleton skeleton-text" style={{ width: '80%', height: '16px', marginBottom: '5px', backgroundColor: '#e2e5e7' }}></div>
        <div className="skeleton skeleton-text" style={{ width: '90%', height: '16px', backgroundColor: '#e2e5e7' }}></div>
      </div>
    </div>
  );
};

export default SkeletonCard;
