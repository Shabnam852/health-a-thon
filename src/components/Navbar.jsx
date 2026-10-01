import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
  const location = useLocation();

  return (
    <nav className="nav">
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, var(--primary), var(--status-intransit))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold'
        }}>
          H
        </div>
        <h2>Health-a-thon</h2>
      </Link>
      
      <div className="nav-links">
        <Link to="/patient" style={{ color: location.pathname === '/patient' ? 'var(--primary)' : '' }}>Patient</Link>
        <Link to="/facility" style={{ color: location.pathname === '/facility' ? 'var(--primary)' : '' }}>Facility</Link>
        <Link to="/coordinator" style={{ color: location.pathname === '/coordinator' ? 'var(--primary)' : '' }}>Coordinator</Link>
        <Link to="/create" className="btn" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>+ New Referral</Link>
      </div>
    </nav>
  );
};

export default Navbar;
