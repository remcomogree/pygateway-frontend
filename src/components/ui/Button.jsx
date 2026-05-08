/**
 * Reusable Button Component for PyGateway Design System
 * 
 * Standardized button component with consistent styling and accessibility features.
 */

import React from 'react';

// ===========================================
// BUTTON VARIANTS AND SIZES
// ===========================================

const BUTTON_VARIANTS = {
  primary: 'btn-primary',
  secondary: 'btn-secondary', 
  success: 'btn-success',
  warning: 'btn-warning',
  danger: 'btn-danger',
  info: 'btn-info'
};

const BUTTON_SIZES = {
  sm: 'btn-sm',
  md: '', // default size
  lg: 'btn-lg'
};

// ===========================================
// BUTTON COMPONENT
// ===========================================

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon = null,
  ariaLabel,
  title,
  className = '',
  type = 'button',
  onClick,
  ...props
}) => {
  const baseClasses = 'btn';
  const variantClass = BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.primary;
  const sizeClass = BUTTON_SIZES[size] || '';
  
  const classes = [
    baseClasses,
    variantClass,
    sizeClass,
    loading ? 'loading' : '',
    className
  ].filter(Boolean).join(' ');

  const handleClick = (e) => {
    if (disabled || loading) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
  };

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      onClick={handleClick}
      aria-label={ariaLabel}
      title={title}
      {...props}
    >
      {loading && <span className="spinner-sm" aria-hidden="true"></span>}
      {!loading && icon && <span className="btn-icon" aria-hidden="true">{icon}</span>}
      <span className="btn-text">{children}</span>
    </button>
  );
};

// ===========================================
// SPECIALIZED BUTTON COMPONENTS
// ===========================================

export const IconButton = ({
  icon,
  ariaLabel,
  title,
  variant = 'secondary',
  size = 'sm',
  ...props
}) => (
  <Button
    variant={variant}
    size={size}
    ariaLabel={ariaLabel}
    title={title}
    className="btn-icon-only"
    {...props}
  >
    {icon}
  </Button>
);

export const LoadingButton = ({ loading, children, ...props }) => (
  <Button loading={loading} {...props}>
    {children}
  </Button>
);

// ===========================================
// ACTION BUTTON GROUPS
// ===========================================

export const ActionButtons = ({ children, className = '' }) => (
  <div className={`action-buttons ${className}`}>
    {children}
  </div>
);

// Common action button patterns
export const EditButton = ({ onClick, disabled, ariaLabel = "Edit item", ...props }) => (
  <Button
    variant="primary"
    size="sm"
    onClick={onClick}
    disabled={disabled}
    ariaLabel={ariaLabel}
    {...props}
  >
    Edit
  </Button>
);

export const DeleteButton = ({ onClick, disabled, ariaLabel = "Delete item", ...props }) => (
  <Button
    variant="danger"
    size="sm"
    onClick={onClick}
    disabled={disabled}
    ariaLabel={ariaLabel}
    {...props}
  >
    Delete
  </Button>
);

export const CancelButton = ({ onClick, disabled, ariaLabel = "Cancel action", ...props }) => (
  <Button
    variant="secondary"
    size="sm"
    onClick={onClick}
    disabled={disabled}
    ariaLabel={ariaLabel}
    {...props}
  >
    Cancel
  </Button>
);

export const TestButton = ({ onClick, disabled, loading, ariaLabel = "Test item", ...props }) => (
  <Button
    variant="warning"
    size="sm"
    onClick={onClick}
    disabled={disabled}
    loading={loading}
    ariaLabel={ariaLabel}
    {...props}
  >
    {loading ? 'Testing...' : 'Test'}
  </Button>
);

// ===========================================
// BUTTON GROUP COMPONENT
// ===========================================

export const ButtonGroup = ({ children, className = '', ...props }) => (
  <div className={`btn-group ${className}`} role="group" {...props}>
    {children}
  </div>
);

// ===========================================
// USAGE EXAMPLES (for documentation)
// ===========================================

/*
// Basic usage
<Button variant="primary" onClick={handleClick}>Save</Button>

// With icon
<Button variant="danger" icon="🗑️" onClick={handleDelete}>Delete</Button>

// Loading state
<Button variant="primary" loading={isLoading} onClick={handleSave}>
  {isLoading ? 'Saving...' : 'Save'}
</Button>

// Icon only button
<IconButton 
  icon="⚙️" 
  ariaLabel="Configure settings" 
  title="Configure" 
  onClick={handleConfigure} 
/>

// Action button group
<ActionButtons>
  <TestButton onClick={handleTest} loading={isTesting} />
  <EditButton onClick={handleEdit} />
  <DeleteButton onClick={handleDelete} />
</ActionButtons>

// Button group
<ButtonGroup>
  <Button variant="secondary">Cancel</Button>
  <Button variant="primary">Save</Button>
</ButtonGroup>
*/

export default Button;
