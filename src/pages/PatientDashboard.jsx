import React from 'react';
import { useReferrals } from '../context/ReferralContext';
import ReferralCard from '../components/ReferralCard';

const PatientDashboard = () => {
  const { referrals } = useReferrals();
  // Simulating a logged-in patient ID for demo purposes
  const patientId = "P-12345";
  
  const myReferrals = referrals.filter(ref => ref.patientId === patientId);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>My Referrals (Patient View)</h2>
      </div>
      
      {myReferrals.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>You have no active referrals.</p>
        </div>
      ) : (
        <div className="grid">
          {myReferrals.map(ref => (
            <ReferralCard key={ref.id} referral={ref} />
          ))}
        </div>
      )}
    </div>
  );
};

export default PatientDashboard;
