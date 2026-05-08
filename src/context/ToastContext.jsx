import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';

const ToastContext = createContext(null);

const TYPE_CLASSES = {
  success: { bg: 'bg-success', text: 'text-white', icon: '✓' },
  danger:  { bg: 'bg-danger',  text: 'text-white', icon: '✕' },
  warning: { bg: 'bg-warning', text: 'text-dark',  icon: '⚠' },
  info:    { bg: 'bg-info',    text: 'text-white', icon: 'ℹ' },
};

let _id = 1;

function ToastItem({ toast, onDismiss }) {
  const cls = TYPE_CLASSES[toast.type] || TYPE_CLASSES.info;
  return (
    <div
      className={`toast show align-items-center border-0 mb-2 ${cls.bg} ${cls.text}`}
      role="alert"
      aria-live="assertive"
      style={{ minWidth: '280px', maxWidth: '420px', animation: 'toast-in 0.2s ease' }}
    >
      <div className="d-flex">
        <div className="toast-body d-flex align-items-start gap-2">
          <span style={{ flexShrink: 0, fontWeight: 'bold' }}>{cls.icon}</span>
          <span style={{ wordBreak: 'break-word' }}>{toast.message}</span>
        </div>
        <button
          type="button"
          className={`btn-close ${cls.text === 'text-white' ? 'btn-close-white' : ''} me-2 m-auto`}
          onClick={onDismiss}
          aria-label="Close"
        />
      </div>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = _id++;
    setToasts(prev => [...prev, { id, message, type }]);
    if (duration > 0) setTimeout(() => dismiss(id), duration);
  }, [dismiss]);

  const toast = useMemo(() => ({
    success: (msg, dur) => addToast(msg, 'success', dur ?? 4000),
    error:   (msg, dur) => addToast(msg, 'danger',  dur ?? 6000),
    warning: (msg, dur) => addToast(msg, 'warning', dur ?? 5000),
    info:    (msg, dur) => addToast(msg, 'info',    dur ?? 4000),
  }), [addToast]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {createPortal(
        <div
          className="toast-container position-fixed bottom-0 end-0 p-3"
          style={{ zIndex: 11000 }}
        >
          {toasts.map(t => (
            <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
