import React, { useState } from 'react';
import { useReferrals } from '../context/ReferralContext';
import ReferralCard from '../components/ReferralCard';

const CoordinatorDashboard = () => {
  const { referrals } = useReferrals();
  const [filter, setFilter] = useState('All');

  const filteredReferrals = filter === 'All' 
    ? referrals 
    : referrals.filter(ref => ref.status.toLowerCase() === filter.toLowerCase());

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Coordinator Dashboard</h2>
        <select 
          value={filter} 
          onChange={e => setFilter(e.target.value)}
          style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #ced4da' }}
        >
          <option value="All">All Referrals</option>
          <option value="Pending">Pending</option>
          <option value="Accepted">Accepted</option>
          <option value="In Transit">In Transit</option>
          <option value="Received">Received</option>
          <option value="Completed">Completed</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      <div className="grid">
        {filteredReferrals.map(ref => (
          <ReferralCard key={ref.id} referral={ref} />
        ))}
        {filteredReferrals.length === 0 && (
          <p style={{ color: 'var(--text-muted)' }}>No referrals match this filter.</p>
        )}
      </div>
    </div>
  );
};

export default CoordinatorDashboard;
