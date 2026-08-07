import React from 'react';

const FilterPanel = ({ filters, onFilterChange }) => {
  return (
    <div className="filter-panel card mb-3">
      <div className="card-body">
        <h5 className="card-title">Filters</h5>
        {/* Placeholder for actual filter fields */}
        <div className="row">
          <div className="col-md-12 text-muted">
            Filter options go here.
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;
