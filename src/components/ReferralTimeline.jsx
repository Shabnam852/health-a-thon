import React from 'react';

const ReferralTimeline = ({ timeline }) => {
  if (!timeline || timeline.length === 0) return null;

  return (
    <div style={{ marginTop: '1.5rem', paddingLeft: '1rem', borderLeft: '2px solid var(--primary)' }}>
      {timeline.map((event, idx) => (
        <div key={idx} style={{ position: 'relative', marginBottom: '1.5rem', paddingLeft: '1.5rem' }}>
          <div style={{
            position: 'absolute',
            left: '-1.5rem',
            top: '0.25rem',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: 'var(--surface)',
            border: '3px solid var(--primary)',
            transform: 'translateX(-50%)'
          }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, color: 'var(--text)' }}>{event.status}</h4>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {new Date(event.date).toLocaleString()}
            </span>
          </div>
          {event.notes && (
            <p style={{ marginTop: '0.25rem', fontSize: '0.95rem', color: 'var(--text-muted)' }}>
              {event.notes}
            </p>
          )}
        </div>
      ))}
    </div>
  );
};

export default ReferralTimeline;
