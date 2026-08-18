import React from 'react';
import EntityToolbar from '../shared/EntityToolbar';
import FilterPanel from '../shared/FilterPanel';
import Pagination from '../shared/Pagination';

const EntityListPage = ({
  title,
  headerProps,
  actions,
  filters,
  filterProps,
  table: TableComponent,
  tableComponent,
  error,
  pagination,
  data,
  onFilterChange,
  onPageChange,
}) => {
  const pageTitle = headerProps?.title || title || 'Daftar Entitas';
  const pageDescription = headerProps?.description;

  const toolbarActions = { ...(actions || {}) };
  if (headerProps?.onAdd && headerProps?.addButtonLabel) {
    const addBtn = { label: headerProps.addButtonLabel, variant: 'primary', onClick: headerProps.onAdd };
    if (headerProps.addPosition === 'right') {
      toolbarActions.right = [addBtn, ...(toolbarActions.right || [])];
    } else {
      toolbarActions.left = [...(toolbarActions.left || []), addBtn];
    }
  }

  const table = TableComponent ? <TableComponent data={data} /> : tableComponent;
  const filterArea = filters || filterProps;

  return (
    <div className="entity-list-page">
      <div className="page-header mb-4">
        <h2>{pageTitle}</h2>
        {pageDescription && <p className="text-muted">{pageDescription}</p>}
      </div>

      <EntityToolbar actions={toolbarActions} />

      {filterArea && (
        <FilterPanel filters={filterArea} onFilterChange={onFilterChange} />
      )}

      {error && (
        <div className="alert alert-danger mb-3" role="alert">{error}</div>
      )}

      <div className="table-container mb-3">
        {table || <p className="text-muted">Tidak ada data yang dapat ditampilkan.</p>}
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
