import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReferrals } from '../context/ReferralContext';

const CreateReferral = () => {
  const { addReferral } = useReferrals();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    patientName: '',
    patientId: '',
    fromFacility: '',
    toFacility: '',
    reason: '',
    priority: 'Normal'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const newRef = {
      ...formData,
      id: `REF-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      status: 'Pending',
      date: new Date().toISOString(),
      timeline: [
        { status: 'Created', date: new Date().toISOString(), notes: 'Referral submitted.' }
      ]
    };
    addReferral(newRef);
    navigate('/facility');
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div className="card">
        <h2>Create New Referral</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label>Patient Name</label>
            <input required type="text" value={formData.patientName} onChange={e => setFormData({...formData, patientName: e.target.value})} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #ced4da' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label>Patient ID</label>
            <input required type="text" value={formData.patientId} onChange={e => setFormData({...formData, patientId: e.target.value})} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #ced4da' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label>From Facility</label>
            <input required type="text" value={formData.fromFacility} onChange={e => setFormData({...formData, fromFacility: e.target.value})} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #ced4da' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label>To Facility</label>
            <input required type="text" value={formData.toFacility} onChange={e => setFormData({...formData, toFacility: e.target.value})} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #ced4da' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label>Priority</label>
            <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #ced4da' }}>
              <option>Low</option>
              <option>Normal</option>
              <option>High</option>
              <option>Urgent</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label>Reason / Notes</label>
            <textarea required rows="4" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #ced4da', resize: 'vertical' }}></textarea>
          </div>
          <button type="submit" className="btn" style={{ marginTop: '1rem' }}>Submit Referral</button>
        </form>
      </div>
    </div>
  );
};

export default CreateReferral;
