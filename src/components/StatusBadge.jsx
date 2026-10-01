import React from 'react';

const StatusBadge = ({ status }) => {
  let bgColor = 'var(--text-muted)';
  
  switch (status?.toLowerCase()) {
    case 'pending': bgColor = 'var(--status-pending)'; break;
    case 'accepted': bgColor = 'var(--status-accepted)'; break;
    case 'in transit': bgColor = 'var(--status-intransit)'; break;
    case 'received': bgColor = 'var(--status-received)'; break;
    case 'completed': bgColor = 'var(--status-completed)'; break;
    case 'rejected': bgColor = 'var(--status-rejected)'; break;
    default: bgColor = '#868e96';
  }

  return (
    <span className="badge" style={{ backgroundColor: bgColor, color: 'white' }}>
      {status}
    </span>
  );
};

export default StatusBadge;
