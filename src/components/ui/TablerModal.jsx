/**
 * Tabler Modal Component
 * Standardized modal using Tabler design system with accessibility.
 */
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export const TablerModal = ({
  isOpen = false,
  onClose,
  title,
  children,
  size = '',       // '' | 'modal-sm' | 'modal-lg' | 'modal-full-width'
  footer,
  closable = true,
}) => {
  const modalRef = useRef(null);
  const prevFocus = useRef(null);

  useEffect(() => {
    if (isOpen) {
      prevFocus.current = document.activeElement;
      document.body.classList.add('modal-open');
      const handleEsc = (e) => { if (e.key === 'Escape' && closable) onClose?.(); };
      document.addEventListener('keydown', handleEsc);
      return () => {
        document.removeEventListener('keydown', handleEsc);
        document.body.classList.remove('modal-open');
        prevFocus.current?.focus();
      };
    }
  }, [isOpen, closable, onClose]);

  if (!isOpen) return null;

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget && closable) onClose?.();
  };

  const modal = (
    <>
      <div className="modal-backdrop fade show" />
      <div
        className="modal modal-blur fade show"
        style={{ display: 'block' }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={handleBackdrop}
      >
        <div className={`modal-dialog modal-dialog-centered ${size}`} role="document" ref={modalRef}>
          <div className="modal-content">
            <div className="modal-header">
              {title && <h5 className="modal-title">{title}</h5>}
              {closable && (
                <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
              )}
            </div>
            <div className="modal-body">
              {children}
            </div>
            {footer && (
              <div className="modal-footer">
                {footer}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modal, document.body);
};

export const TablerFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  children,
  submitText = 'Save',
  cancelText = 'Cancel',
  isSubmitting = false,
  submitDisabled = false,
  submitVariant = 'primary',
  size = '',
}) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit?.(e);
  };

  return (
    <TablerModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={size}
      footer={
        <>
          <button type="button" className="btn me-auto" onClick={onClose} disabled={isSubmitting}>
            {cancelText}
          </button>
          <button
            type="submit"
            form="tabler-form-modal"
            className={`btn btn-${submitVariant}`}
            disabled={submitDisabled || isSubmitting}
          >
            {isSubmitting && <span className="spinner-border spinner-border-sm me-2" />}
            {submitText}
          </button>
        </>
      }
    >
      <form id="tabler-form-modal" onSubmit={handleSubmit}>
        {children}
      </form>
    </TablerModal>
  );
};

export const TablerConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm',
  message,
  confirmText = 'Confirm',
  confirmVariant = 'danger',
  isProcessing = false,
}) => (
  <TablerModal
    isOpen={isOpen}
    onClose={onClose}
    title={title}
    size="modal-sm"
    footer={
      <>
        <button type="button" className="btn me-auto" onClick={onClose} disabled={isProcessing}>
          Cancel
        </button>
        <button
          type="button"
          className={`btn btn-${confirmVariant}`}
          onClick={onConfirm}
          disabled={isProcessing}
        >
          {isProcessing && <span className="spinner-border spinner-border-sm me-2" />}
          {confirmText}
        </button>
      </>
    }
  >
    <p>{message}</p>
  </TablerModal>
);

export default TablerModal;
