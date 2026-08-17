export const tableCell = {
  padding: '12px 16px',
  fontSize: '14px',
  borderBottom: '1px solid var(--border)',
  textAlign: 'left'
};

export const tableHeader = {
  ...tableCell,
  fontSize: '13px',
  color: 'var(--text-muted)',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '0.05em'
};

export const tableHeaderBg = {
  ...tableHeader,
  backgroundColor: 'var(--background)'
};

export const financeTH = {
  padding: '10px 14px',
  fontSize: '13px',
  color: 'var(--text-muted)',
  borderBottom: '1px solid var(--border)',
  textAlign: 'left',
  fontWeight: '600',
  whiteSpace: 'nowrap'
};

export const financeTD = {
  padding: '10px 14px',
  fontSize: '14px',
  borderBottom: '1px solid var(--border)',
  verticalAlign: 'middle'
};

export const financeTDNum = {
  ...financeTD,
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums'
};
