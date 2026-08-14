import React from 'react';

const FilterPanel = ({ filters, onFilterChange }) => {
  if (!filters) return null;
  return (
    <div className="filter-panel card mb-3">
      <div className="card-body">
        {filters}
      </div>
    </div>
  );
};

export default FilterPanel;
