import React from 'react';

const StatusBadge = ({ enabled, enabledText = 'Enabled', disabledText = 'Disabled' }) => (
  <span className={`badge ${enabled ? 'bg-success' : 'bg-secondary'}`}>
    {enabled ? enabledText : disabledText}
  </span>
);

export default StatusBadge;
