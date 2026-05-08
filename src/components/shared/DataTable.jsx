import React, { useMemo } from 'react';
import Pagination from '../Pagination';

const DataTable = ({
  columns,
  data,
  actions = [],
  selectedId = null,
  onSelect = null,
  nameAccessor = null,
  pagination = null,
  onPageChange = null,
  onPageSizeChange = null,
  emptyMessage = 'No data found.',
}) => {
  const { currentPage = 0, pageSize = 50 } = pagination || {};

  const { paginatedData, paginationInfo } = useMemo(() => {
    if (!data) return { paginatedData: [], paginationInfo: null };
    const offset = currentPage * pageSize;
    const paged = data.slice(offset, offset + pageSize);
    return {
      paginatedData: paged,
      paginationInfo: {
        offset,
        limit: pageSize,
        total: data.length,
        hasMore: offset + pageSize < data.length,
      },
    };
  }, [data, currentPage, pageSize]);

  if (!data || data.length === 0) {
    return <p className="text-muted text-center py-4">{emptyMessage}</p>;
  }

  const renderCell = (col, row) => {
    const value = row[col.accessor];
    if (col.render) return col.render(value, row);

    if (col.accessor === nameAccessor && onSelect) {
      const isSelected = selectedId === row.id;
      return (
        <div className="d-flex align-items-center gap-1">
          <span className="text-muted small">{isSelected ? '▼' : '▶'}</span>
          <a href="#" className="fw-bold" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSelect(row); }}>
            {value}
          </a>
        </div>
      );
    }

    return value ?? '—';
  };

  const renderActions = (row) => {
    const visibleActions = actions.filter(a => !a.show || a.show(row));
    if (visibleActions.length === 0) return null;

    return (
      <div className="btn-list flex-nowrap">
        {visibleActions.map((action) => {
          const variant   = typeof action.variant  === 'function' ? action.variant(row)  : (action.variant  || 'primary');
          const label     = typeof action.label    === 'function' ? action.label(row)    : action.label;
          const icon      = typeof action.icon     === 'function' ? action.icon(row)     : action.icon;
          const disabled  = typeof action.disabled === 'function' ? action.disabled(row) : !!action.disabled;
          const title     = typeof action.title    === 'function' ? action.title(row)    : (action.title || label || '');
          const key       = typeof action.key      === 'function' ? action.key(row)      : (action.label || title);
          return (
            <button
              key={key}
              type="button"
              className={`btn btn-sm${icon ? ' btn-icon' : ''} btn-${variant}`}
              onClick={() => action.onClick(row)}
              disabled={disabled}
              title={title}
            >
              {icon ? React.createElement(icon, { size: 14 }) : label}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <div className="table-responsive">
        <table className="table table-vcenter table-hover">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.accessor || col.header}>{col.header}</th>
              ))}
              {actions.length > 0 && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row) => {
              const isSelected = selectedId === row.id;
              return (
                <tr key={row.id} className={isSelected ? 'table-active' : ''}>
                  {columns.map((col) => (
                    <td key={col.accessor || col.header}>
                      {renderCell(col, row)}
                    </td>
                  ))}
                  {actions.length > 0 && (
                    <td>{renderActions(row)}</td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {paginationInfo && onPageChange && (
        <Pagination
          pagination={paginationInfo}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </>
  );
};

export default DataTable;
