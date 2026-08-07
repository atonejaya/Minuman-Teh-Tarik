import React from 'react';

const EntityToolbar = ({ actions }) => {
  return (
    <div className="entity-toolbar mb-3 d-flex justify-content-between align-items-center">
      <div className="toolbar-left">
        {actions?.left?.map((action, idx) => (
          <button key={idx} className={`btn btn-${action.variant || 'primary'} me-2`} onClick={action.onClick}>
            {action.label}
          </button>
        ))}
      </div>
      <div className="toolbar-right">
        {actions?.right?.map((action, idx) => (
          <button key={idx} className={`btn btn-${action.variant || 'secondary'} ms-2`} onClick={action.onClick}>
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default EntityToolbar;
