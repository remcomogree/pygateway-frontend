/**
 * Reusable Modal Component for PyGateway Design System
 * 
 * Standardized modal component with accessibility features and keyboard navigation.
 */

import React, { useEffect, useRef } from 'react';
import { Button, ButtonGroup } from './Button';

// ===========================================
// MODAL COMPONENT
// ===========================================

export const Modal = ({
  isOpen = false,
  onClose,
  title,
  children,
  size = 'medium',
  closable = true,
  closeOnOverlay = true,
  className = '',
  ariaLabel,
  ...props
}) => {
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Size classes
  const sizeClasses = {
    small: 'modal-small',
    medium: 'modal-medium',
    large: 'modal-large',
    fullscreen: 'modal-fullscreen'
  };

  // ===========================================
  // ACCESSIBILITY & KEYBOARD NAVIGATION
  // ===========================================

  useEffect(() => {
    if (isOpen) {
      // Store the previously focused element
      previousFocusRef.current = document.activeElement;
      
      // Focus the modal
      modalRef.current?.focus();
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      
      // Add escape key listener
      const handleEscape = (e) => {
        if (e.key === 'Escape' && closable) {
          onClose?.();
        }
      };
      
      document.addEventListener('keydown', handleEscape);
      
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = '';
        
        // Restore focus to previously focused element
        previousFocusRef.current?.focus();
      };
    }
  }, [isOpen, closable, onClose]);

  // Trap focus within modal
  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      if (focusableElements?.length) {
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    }
  };

  const handleOverlayClick = (e) => {
    if (closeOnOverlay && e.target === e.currentTarget) {
      onClose?.();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="modal-overlay" 
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel || title}
    >
      <div
        ref={modalRef}
        className={`modal ${sizeClasses[size] || sizeClasses.medium} ${className}`}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
        {...props}
      >
        {/* Modal Header */}
        <div className="modal-header">
          {title && <h3 className="modal-title">{title}</h3>}
          {closable && (
            <Button
              variant="secondary"
              size="sm"
              className="modal-close"
              onClick={onClose}
              ariaLabel="Close modal"
              title="Close"
            >
              ×
            </Button>
          )}
        </div>

        {/* Modal Content */}
        <div className="modal-content">
          {children}
        </div>
      </div>
    </div>
  );
};

// ===========================================
// MODAL WITH FORM ACTIONS
// ===========================================

export const FormModal = ({
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
  showCancel = true,
  ...modalProps
}) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit?.(e);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      {...modalProps}
    >
      <form onSubmit={handleSubmit} className="modal-form">
        <div className="modal-body">
          {children}
        </div>
        
        <div className="modal-actions">
          <ButtonGroup>
            {showCancel && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onClose}
                disabled={isSubmitting}
                ariaLabel={`${cancelText} and close modal`}
              >
                {cancelText}
              </Button>
            )}
            <Button
              type="submit"
              variant={submitVariant}
              size="sm"
              loading={isSubmitting}
              disabled={submitDisabled || isSubmitting}
              ariaLabel={`${submitText} form`}
            >
              {submitText}
            </Button>
          </ButtonGroup>
        </div>
      </form>
    </Modal>
  );
};

// ===========================================
// CONFIRMATION MODAL
// ===========================================

export const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'danger',
  isProcessing = false,
  ...modalProps
}) => {
  const handleConfirm = () => {
    onConfirm?.();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="small"
      {...modalProps}
    >
      <div className="modal-body">
        <p className="confirm-message">{message}</p>
      </div>
      
      <div className="modal-actions">
        <ButtonGroup>
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isProcessing}
            ariaLabel={`${cancelText} action`}
          >
            {cancelText}
          </Button>
          <Button
            variant={confirmVariant}
            size="sm"
            onClick={handleConfirm}
            loading={isProcessing}
            disabled={isProcessing}
            ariaLabel={`${confirmText} action`}
          >
            {confirmText}
          </Button>
        </ButtonGroup>
      </div>
    </Modal>
  );
};

// ===========================================
// USAGE EXAMPLES (for documentation)
// ===========================================

/*
// Basic modal
<Modal isOpen={isOpen} onClose={handleClose} title="Edit Item">
  <p>Modal content goes here</p>
</Modal>

// Form modal
<FormModal
  isOpen={isOpen}
  onClose={handleClose}
  onSubmit={handleSubmit}
  title="Create New Item"
  submitText="Create"
  isSubmitting={isLoading}
>
  <FormContent />
</FormModal>

// Confirmation modal
<ConfirmModal
  isOpen={showConfirm}
  onClose={() => setShowConfirm(false)}
  onConfirm={handleDelete}
  title="Delete Item"
  message="Are you sure you want to delete this item? This action cannot be undone."
  confirmText="Delete"
  confirmVariant="danger"
  isProcessing={isDeleting}
/>
*/

export default Modal;
