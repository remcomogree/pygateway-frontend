import React from 'react';

const DynamicPluginConfig = ({ schema, config = {}, onChange, errors = {} }) => {
  if (!schema || !schema.properties) {
    return <div className="text-muted py-3">No configuration schema available for this plugin.</div>;
  }

  const handleFieldChange = (fieldName, value) => {
    onChange({ ...config, [fieldName]: value });
  };

  const renderField = (fieldName, fieldSchema) => {
    const fieldType = fieldSchema.type || 'string';
    const isRequired = fieldSchema.required || false;
    const description = fieldSchema.description || '';
    const defaultValue = fieldSchema.default;
    const enumValues = fieldSchema.enum;
    const minimum = fieldSchema.minimum;
    const maximum = fieldSchema.maximum;
    const currentValue = config[fieldName] ?? defaultValue ?? '';
    const hasError = errors[fieldName];

    let inputElement;

    switch (fieldType) {
      case 'string':
        if (enumValues && enumValues.length > 0) {
          inputElement = <select className={`form-select${hasError?' is-invalid':''}`} value={currentValue} onChange={(e) => handleFieldChange(fieldName, e.target.value)}><option value="">Select {fieldName}</option>{enumValues.map(o => <option key={o} value={o}>{o}</option>)}</select>;
        } else {
          inputElement = <input type="text" className={`form-control${hasError?' is-invalid':''}`} value={currentValue} onChange={(e) => handleFieldChange(fieldName, e.target.value)} placeholder={description} />;
        }
        break;
      case 'number': case 'integer':
        inputElement = <input type="number" className={`form-control${hasError?' is-invalid':''}`} value={currentValue} onChange={(e) => { const v = fieldType === 'integer' ? parseInt(e.target.value) || 0 : parseFloat(e.target.value) || 0; handleFieldChange(fieldName, v); }} min={minimum} max={maximum} placeholder={description} />;
        break;
      case 'boolean':
        inputElement = <label className="form-check"><input type="checkbox" className="form-check-input" checked={!!currentValue} onChange={(e) => handleFieldChange(fieldName, e.target.checked)} /><span className="form-check-label">Enable {fieldName}</span></label>;
        break;
      case 'array':
        inputElement = <input type="text" className={`form-control${hasError?' is-invalid':''}`} value={Array.isArray(currentValue) ? currentValue.join(', ') : currentValue || ''} onChange={(e) => handleFieldChange(fieldName, e.target.value.split(',').map(i => i.trim()).filter(Boolean))} placeholder={`${description} (comma-separated)`} />;
        break;
      case 'object':
        inputElement = <textarea className={`form-control${hasError?' is-invalid':''}`} value={typeof currentValue === 'object' && currentValue !== null ? JSON.stringify(currentValue, null, 2) : currentValue || ''} onChange={(e) => { try { handleFieldChange(fieldName, JSON.parse(e.target.value)); } catch { handleFieldChange(fieldName, e.target.value); } }} placeholder={`${description} (JSON format)`} rows={4} />;
        break;
      default:
        inputElement = <input type="text" className={`form-control${hasError?' is-invalid':''}`} value={currentValue} onChange={(e) => handleFieldChange(fieldName, e.target.value)} placeholder={description} />;
    }

    return (
      <div key={fieldName} className="mb-3">
        <label className="form-label">{fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}{isRequired && <span className="text-danger ms-1">*</span>}</label>
        {inputElement}
        {description && <small className="form-hint">{description}</small>}
        {hasError && <div className="invalid-feedback d-block">{errors[fieldName]}</div>}
        {(minimum !== undefined || maximum !== undefined) && <small className="form-hint">{minimum !== undefined && `Min: ${minimum}`}{minimum !== undefined && maximum !== undefined && ', '}{maximum !== undefined && `Max: ${maximum}`}</small>}
      </div>
    );
  };

  return (
    <div>
      {Object.entries(schema.properties).map(([name, schema]) => renderField(name, schema))}
      <small className="text-muted">Fields marked with <span className="text-danger">*</span> are required.</small>
    </div>
  );
};

export default DynamicPluginConfig;
