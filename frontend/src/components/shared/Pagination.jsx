import React from 'react';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  return (
    <nav className="pagination-container mt-3">
      <ul className="pagination justify-content-center">
        <li className={`page-item ${currentPage <= 1 ? 'disabled' : ''}`}>
          <button className="page-link" onClick={() => onPageChange(currentPage - 1)}>Sebelumnya</button>
        </li>
        <li className="page-item disabled">
          <span className="page-link">Halaman {currentPage} dari {totalPages || 1}</span>
        </li>
        <li className={`page-item ${currentPage >= totalPages ? 'disabled' : ''}`}>
          <button className="page-link" onClick={() => onPageChange(currentPage + 1)}>Berikutnya</button>
        </li>
      </ul>
    </nav>
  );
};

export default Pagination;
