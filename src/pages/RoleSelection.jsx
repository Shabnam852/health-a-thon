import React from 'react';
import { Link } from 'react-router-dom';

const RoleSelection = () => {
  return (
    <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto', padding: '4rem 0' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--primary)' }}>Welcome to Health-a-thon</h1>
      <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: '3rem' }}>
        Select your role to access the appropriate dashboard.
      </p>
      
      <div className="grid">
        <Link to="/patient" className="card" style={{ display: 'block', textDecoration: 'none' }}>
          <h2>Patient</h2>
          <p style={{ color: 'var(--text-muted)' }}>View and track your referrals.</p>
        </Link>
        <Link to="/facility" className="card" style={{ display: 'block', textDecoration: 'none' }}>
          <h2>Healthcare Facility</h2>
          <p style={{ color: 'var(--text-muted)' }}>Manage incoming and outgoing referrals.</p>
        </Link>
        <Link to="/coordinator" className="card" style={{ display: 'block', textDecoration: 'none' }}>
          <h2>Coordinator</h2>
          <p style={{ color: 'var(--text-muted)' }}>Track, coordinate, and update referral statuses.</p>
        </Link>
      </div>
    </div>
  );
};

export default RoleSelection;
