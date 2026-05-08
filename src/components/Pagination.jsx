import React from 'react';

const Pagination = ({ pagination, onPageChange, onPageSizeChange, className = '' }) => {
  if (!pagination || !pagination.total) return null;

  const { offset, limit, total, hasMore } = pagination;
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  const handlePrevious = () => { if (offset > 0) onPageChange(Math.max(0, offset - limit), limit); };
  const handleNext = () => { if (hasMore) onPageChange(offset + limit, limit); };
  const handleGoToPage = (page) => onPageChange((page - 1) * limit, limit);
  const handlePageSizeChange = (e) => {
    const newLimit = parseInt(e.target.value);
    if (onPageSizeChange) onPageSizeChange(0, newLimit);
    else onPageChange(0, newLimit);
  };

  const pages = [];
  const maxVisible = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
  if (endPage - startPage < maxVisible - 1) startPage = Math.max(1, endPage - maxVisible + 1);

  if (startPage > 1) { pages.push(1); if (startPage > 2) pages.push('...'); }
  for (let i = startPage; i <= endPage; i++) pages.push(i);
  if (endPage < totalPages) { if (endPage < totalPages - 1) pages.push('...'); pages.push(totalPages); }

  return (
    <div className={`d-flex align-items-center justify-content-between flex-wrap gap-2 ${className}`}>
      <div className="text-muted small">
        Showing {offset + 1} to {Math.min(offset + limit, total)} of {total}
        <select className="form-select form-select-sm d-inline-block ms-2" style={{ width: 'auto' }} value={limit} onChange={handlePageSizeChange}>
          <option value={15}>15</option>
          <option value={30}>30</option>
          <option value={50}>50</option>
          <option value={75}>75</option>
        </select>
      </div>
      <ul className="pagination mb-0">
        <li className={`page-item${offset === 0 ? ' disabled' : ''}`}>
          <button className="page-link" onClick={handlePrevious} disabled={offset === 0}>
            <svg xmlns="http://www.w3.org/2000/svg" className="icon" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none"><path d="M15 6l-6 6l6 6" /></svg>
            prev
          </button>
        </li>
        {pages.map((p, i) =>
          p === '...' ? (
            <li className="page-item disabled" key={`e${i}`}><span className="page-link">...</span></li>
          ) : (
            <li className={`page-item${currentPage === p ? ' active' : ''}`} key={p}>
              <button className="page-link" onClick={() => handleGoToPage(p)}>{p}</button>
            </li>
          )
        )}
        <li className={`page-item${!hasMore ? ' disabled' : ''}`}>
          <button className="page-link" onClick={handleNext} disabled={!hasMore}>
            next
            <svg xmlns="http://www.w3.org/2000/svg" className="icon" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none"><path d="M9 6l6 6l-6 6" /></svg>
          </button>
        </li>
      </ul>
    </div>
  );
};

export default Pagination;
