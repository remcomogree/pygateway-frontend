import React from 'react';

const FilterStatusBar = ({ filters = [] }) => {
  const activeFilters = filters.filter(f => f.name);
  if (activeFilters.length === 0) return null;

  return (
    <div className="alert alert-info d-flex align-items-center flex-wrap gap-3 mb-3">
      {activeFilters.map((filter) => (
        <div key={filter.label} className="d-flex align-items-center gap-2">
          <strong>{filter.icon} {filter.label}: {filter.name}</strong>
          <button type="button" className="btn btn-sm" onClick={filter.onDeselect}>Deselect</button>
        </div>
      ))}
    </div>
  );
};

export default FilterStatusBar;
