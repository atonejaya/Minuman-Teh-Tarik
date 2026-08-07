import React from 'react';
import EntityToolbar from '../shared/EntityToolbar';
import FilterPanel from '../shared/FilterPanel';
import Pagination from '../shared/Pagination';

const EntityListPage = ({ title, actions, filters, table: TableComponent, pagination, data, onFilterChange, onPageChange }) => {
  return (
    <div className="entity-list-page">
      <div className="page-header mb-4">
        <h2>{title || 'Entity List'}</h2>
      </div>
      
      <EntityToolbar actions={actions} />
      
      <FilterPanel filters={filters} onFilterChange={onFilterChange} />
      
      <div className="table-container mb-3">
        {TableComponent && <TableComponent data={data} />}
      </div>
      
      <Pagination 
        currentPage={pagination?.currentPage || 1} 
        totalPages={pagination?.totalPages || 1} 
        onPageChange={onPageChange} 
      />
    </div>
  );
};

export default EntityListPage;
