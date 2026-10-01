import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReferrals } from '../context/ReferralContext';
import ReferralTimeline from '../components/ReferralTimeline';
import StatusBadge from '../components/StatusBadge';

const ReferralDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getReferralById, updateReferralStatus } = useReferrals();
  
  const referral = getReferralById(id);
  const [newStatus, setNewStatus] = useState('');
  const [note, setNote] = useState('');

  if (!referral) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 0' }}>
        <h2>Referral not found</h2>
        <button onClick={() => navigate(-1)} className="btn" style={{ marginTop: '1rem' }}>Go Back</button>
      </div>
    );
  }

  const handleStatusUpdate = (e) => {
    e.preventDefault();
    if (!newStatus) return;
    updateReferralStatus(id, newStatus, note);
    setNewStatus('');
    setNote('');
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <button onClick={() => navigate(-1)} className="btn btn-secondary" style={{ marginBottom: '1.5rem' }}>
        &larr; Back
      </button>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ margin: 0 }}>Referral {referral.id}</h1>
            <p style={{ color: 'var(--text-muted)' }}>Submitted on {new Date(referral.date).toLocaleDateString()}</p>
          </div>
          <StatusBadge status={referral.status} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
          <div>
            <h4 style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Patient Name</h4>
            <p style={{ fontWeight: '500' }}>{referral.patientName}</p>
          </div>
          <div>
            <h4 style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Patient ID</h4>
            <p style={{ fontWeight: '500' }}>{referral.patientId}</p>
          </div>
          <div>
            <h4 style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}>From Facility</h4>
            <p style={{ fontWeight: '500' }}>{referral.fromFacility}</p>
          </div>
          <div>
            <h4 style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}>To Facility</h4>
            <p style={{ fontWeight: '500' }}>{referral.toFacility}</p>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <h4 style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Reason for Referral</h4>
            <p style={{ padding: '1rem', backgroundColor: 'var(--bg-color)', borderRadius: '8px' }}>
              {referral.reason}
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>Timeline</h3>
        <ReferralTimeline timeline={referral.timeline} />
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3>Update Status</h3>
        <form onSubmit={handleStatusUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <select 
              value={newStatus} 
              onChange={e => setNewStatus(e.target.value)}
              style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid #ced4da' }}
            >
              <option value="" disabled>Select new status...</option>
              <option value="Accepted">Accepted</option>
              <option value="In Transit">In Transit</option>
              <option value="Received">Received</option>
              <option value="Completed">Completed</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
          <textarea 
            placeholder="Add an optional note..." 
            value={note}
            onChange={e => setNote(e.target.value)}
            rows="2"
            style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #ced4da', resize: 'vertical' }}
          ></textarea>
          <button type="submit" className="btn" disabled={!newStatus}>Update Referral</button>
        </form>
      </div>
    </div>
  );
};

export default ReferralDetails;
