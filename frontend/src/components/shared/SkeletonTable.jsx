import React from 'react';

const SkeletonTable = ({ rows = 5, columns = 4 }) => {
  return (
    <div className="skeleton-table">
      <table className="table">
        <thead>
          <tr>
            {Array.from({ length: columns }).map((_, idx) => (
              <th key={idx}><div className="skeleton skeleton-text" style={{ width: '100%', height: '20px', backgroundColor: '#e2e5e7' }}></div></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rIdx) => (
            <tr key={rIdx}>
              {Array.from({ length: columns }).map((_, cIdx) => (
                <td key={cIdx}><div className="skeleton skeleton-text" style={{ width: '100%', height: '20px', backgroundColor: '#e2e5e7' }}></div></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SkeletonTable;
