import React from 'react';

const style = { padding: '48px', textAlign: 'center', color: 'var(--text-muted)' };

const TableMessage = ({ children }) => (
  <p style={style}>{children}</p>
);

export default TableMessage;
