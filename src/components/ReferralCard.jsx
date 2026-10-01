import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';

const ReferralCard = ({ referral }) => {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ margin: 0 }}>{referral.patientName}</h3>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>ID: {referral.patientId}</span>
        </div>
        <StatusBadge status={referral.status} />
      </div>
      
      <div style={{ fontSize: '0.95rem' }}>
        <p><strong>From:</strong> {referral.fromFacility}</p>
        <p><strong>To:</strong> {referral.toFacility}</p>
        <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {referral.reason}
        </p>
      </div>
      
      <div style={{ marginTop: 'auto', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {new Date(referral.date).toLocaleDateString()}
        </span>
        <Link to={`/referral/${referral.id}`} className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
          View Details
        </Link>
      </div>
    </div>
  );
};

export default ReferralCard;
