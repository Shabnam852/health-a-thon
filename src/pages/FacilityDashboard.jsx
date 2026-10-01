import React from 'react';
import { useReferrals } from '../context/ReferralContext';
import ReferralCard from '../components/ReferralCard';
import { Link } from 'react-router-dom';

const FacilityDashboard = () => {
  const { referrals } = useReferrals();
  // Simulating a logged-in facility for demo purposes
  const facilityName = "City General Hospital";
  
  const incomingReferrals = referrals.filter(ref => ref.toFacility === facilityName);
  const outgoingReferrals = referrals.filter(ref => ref.fromFacility === facilityName);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2>Facility Dashboard</h2>
          <p style={{ color: 'var(--text-muted)' }}>{facilityName}</p>
        </div>
        <Link to="/create" className="btn">+ New Referral</Link>
      </div>
      
      <h3 style={{ marginTop: '2rem', marginBottom: '1rem', color: 'var(--status-accepted)' }}>Incoming Referrals</h3>
      <div className="grid">
        {incomingReferrals.map(ref => (
          <ReferralCard key={ref.id} referral={ref} />
        ))}
        {incomingReferrals.length === 0 && <p>No incoming referrals.</p>}
      </div>

      <h3 style={{ marginTop: '2.5rem', marginBottom: '1rem', color: 'var(--primary)' }}>Outgoing Referrals</h3>
      <div className="grid">
        {outgoingReferrals.map(ref => (
          <ReferralCard key={ref.id} referral={ref} />
        ))}
        {outgoingReferrals.length === 0 && <p>No outgoing referrals.</p>}
      </div>
    </div>
  );
};

export default FacilityDashboard;
