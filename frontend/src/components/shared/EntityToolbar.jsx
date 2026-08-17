import React from 'react';

const EntityToolbar = ({ actions }) => {
  return (
    <div className="entity-toolbar mb-3 d-flex justify-content-between align-items-center">
      <div className="toolbar-left" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {actions?.left?.map((action, idx) => (
          <button
            key={idx}
            className={`btn btn-${action.variant || 'primary'}`}
            onClick={action.onClick}
            title={action.tooltip || action.label}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: action.iconOnly ? '0' : '6px',
              padding: action.iconOnly ? '8px' : undefined,
            }}
          >
            {action.icon && <action.icon size={16} />}
            {!action.iconOnly && action.label}
          </button>
        ))}
      </div>
      <div className="toolbar-right" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {actions?.right?.map((action, idx) => (
          <button
            key={idx}
            className={`btn btn-${action.variant || 'secondary'}`}
            onClick={action.onClick}
            title={action.tooltip || action.label}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: action.iconOnly ? '0' : '6px',
              padding: action.iconOnly ? '8px' : undefined,
            }}
          >
            {action.icon && <action.icon size={16} />}
            {!action.iconOnly && action.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default EntityToolbar;
