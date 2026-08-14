const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'src', 'components', 'common');

const files = {
  'Skeleton.jsx': `export default function Skeleton({ width = '100%', height = '20px', borderRadius = 'var(--radius-md)' }) {
  return (
    <div style={{
      width, height, borderRadius,
      backgroundColor: 'var(--border)',
      animation: 'pulse 1.5s infinite ease-in-out'
    }} />
  );
}
`,

  'DataTable.jsx': `import { useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import Skeleton from './Skeleton';

export default function DataTable({ columns, data, loading, emptyMessage = 'No data available' }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const limit = 10;

  const filteredData = data.filter(item => 
    Object.values(item).some(val => 
      String(val).toLowerCase().includes(search.toLowerCase())
    )
  );
  
  const totalPages = Math.ceil(filteredData.length / limit);
  const paginatedData = filteredData.slice((page - 1) * limit, page * limit);

  return (
    <div className="data-table-container card" style={{ padding: '0', overflow: 'hidden' }}>
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ position: 'relative', width: '250px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
          <input 
            className="form-input" 
            style={{ paddingLeft: '36px', height: '36px' }}
            placeholder="Search..." 
            value={search} 
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>
      
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: 'var(--background)' }}>
            <tr>
              {columns.map((col, i) => (
                <th key={i} style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '14px', borderBottom: '1px solid var(--border)' }}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array(5).fill(0).map((_, i) => (
                <tr key={i}>
                  {columns.map((_, j) => (
                    <td key={j} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                      <Skeleton />
                    </td>
                  ))}
                </tr>
              ))
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  {columns.map((col, j) => (
                    <td key={j} style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--text-main)' }}>
                      {col.render ? col.render(row) : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--background)' }}>
        <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
          Showing {filteredData.length === 0 ? 0 : (page - 1) * limit + 1} to {Math.min(page * limit, filteredData.length)} of {filteredData.length} entries
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '4px 8px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <ChevronLeft size={16} />
          </button>
          <button className="btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0} style={{ padding: '4px 8px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
`
};

fs.mkdirSync(componentsDir, { recursive: true });

for (const [relativePath, content] of Object.entries(files)) {
  const fullPath = path.join(componentsDir, relativePath);
  fs.writeFileSync(fullPath, content);
}

// Also add animation to index.css
const indexCssPath = path.join(__dirname, 'src', 'index.css');
let indexCss = fs.readFileSync(indexCssPath, 'utf8');
if (!indexCss.includes('@keyframes pulse')) {
  indexCss += `\n@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}
`;
  fs.writeFileSync(indexCssPath, indexCss);
}

console.log("Components scaffolded.");
