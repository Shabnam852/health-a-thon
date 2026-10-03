import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useReferrals } from "../context/ReferralContext.jsx";

const CreateReferral = () => {
  const navigate = useNavigate();
  const { referrals, addReferral } = useReferrals();

  const [formData, setFormData] = useState({
    patientName: "",
    patientId: "",
    caregiverContact: "",
    referralType: "Maternal",
    priority: "Routine",
    fromFacility: "Primary Health Centre",
    toFacility: "District Hospital",
    reason: "",
  });

  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));

    if (error) {
      setError("");
    }
  };

  const generateReferralId = () => {
    const nextNumber = referrals.length + 1;
    return `NAV-2026-${String(nextNumber).padStart(3, "0")}`;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!formData.patientName.trim()) {
      setError("Please enter the patient name.");
      return;
    }

    if (!formData.patientId.trim()) {
      setError("Please enter the patient ID.");
      return;
    }

    if (!formData.reason.trim()) {
      setError("Please enter the referral information.");
      return;
    }

    const now = new Date().toISOString();
    const referralId = generateReferralId();

    const newReferral = {
      id: referralId,

      patientName: formData.patientName.trim(),
      patientId: formData.patientId.trim(),
      caregiverContact: formData.caregiverContact.trim(),

      referralType: formData.referralType,
      priority: formData.priority,

      fromFacility: formData.fromFacility,
      toFacility: formData.toFacility,

      reason: formData.reason.trim(),

      status: "CREATED",

      createdAt: now,

      timeline: [
        {
          status: "CREATED",
          date: now,
          notes:
            "Referral created by the referring healthcare worker.",
        },
      ],
    };

    addReferral(newReferral);
    navigate(`/referral/${referralId}`);
  };

  return (
    <div className="create-page">

      {/* =====================================================
          HEADER
          ===================================================== */}

      <section className="create-hero">

        <div>
          <div className="create-eyebrow">
            REFERRAL WORKFLOW
          </div>

          <h1>Create a new referral</h1>

          <p>
            Create a structured referral and keep its journey
            visible from creation through care completion.
          </p>
        </div>

        <div className="create-step-indicator">
          <span className="create-step-number">1</span>

          <div>
            <strong>New Referral</strong>
            <small>Start a connected journey</small>
          </div>
        </div>

      </section>


      <div className="create-layout">

        {/* ===================================================
            FORM
            =================================================== */}

        <form
          className="create-form-card"
          onSubmit={handleSubmit}
        >

          {/* PATIENT DETAILS */}

          <section className="create-form-section">

            <div className="create-section-header">
              <div className="create-section-number">
                01
              </div>

              <div>
                <h2>Patient details</h2>
                <p>
                  Enter the basic information needed to identify
                  the referral.
                </p>
              </div>
            </div>

            <div className="create-fields-grid">

              <div className="create-field create-field-wide">
                <label htmlFor="patientName">
                  Patient Name
                  <span>*</span>
                </label>

                <input
                  id="patientName"
                  name="patientName"
                  type="text"
                  value={formData.patientName}
                  onChange={handleChange}
                  placeholder="Enter patient name"
                  required
                />
              </div>

              <div className="create-field">
                <label htmlFor="patientId">
                  Patient ID
                  <span>*</span>
                </label>

                <input
                  id="patientId"
                  name="patientId"
                  type="text"
                  value={formData.patientId}
                  onChange={handleChange}
                  placeholder="Example: P-1004"
                  required
                />
              </div>

              <div className="create-field">
                <label htmlFor="caregiverContact">
                  Patient / Caregiver Contact
                </label>

                <input
                  id="caregiverContact"
                  name="caregiverContact"
                  type="tel"
                  value={formData.caregiverContact}
                  onChange={handleChange}
                  placeholder="Optional"
                />
              </div>

            </div>

          </section>


          {/* REFERRAL TYPE */}

          <section className="create-form-section">

            <div className="create-section-header">
              <div className="create-section-number">
                02
              </div>

              <div>
                <h2>Referral type</h2>
                <p>
                  Set the workflow category and operational priority.
                </p>
              </div>
            </div>

            <div className="create-choice-grid">

              <label
                className={`create-choice ${
                  formData.referralType === "Maternal"
                    ? "selected"
                    : ""
                }`}
              >
                <input
                  type="radio"
                  name="referralType"
                  value="Maternal"
                  checked={
                    formData.referralType === "Maternal"
                  }
                  onChange={handleChange}
                />

                <span className="create-choice-icon">
                  M
                </span>

                <span>
                  <strong>Maternal</strong>
                  <small>
                    Maternal healthcare referral
                  </small>
                </span>

              </label>


              <label
                className={`create-choice ${
                  formData.referralType === "Child"
                    ? "selected"
                    : ""
                }`}
              >
                <input
                  type="radio"
                  name="referralType"
                  value="Child"
                  checked={
                    formData.referralType === "Child"
                  }
                  onChange={handleChange}
                />

                <span className="create-choice-icon child">
                  C
                </span>

                <span>
                  <strong>Child</strong>
                  <small>
                    Child healthcare referral
                  </small>
                </span>

              </label>

            </div>


            <div className="create-priority-row">

              <label
                className={`create-priority ${
                  formData.priority === "Routine"
                    ? "selected"
                    : ""
                }`}
              >
                <input
                  type="radio"
                  name="priority"
                  value="Routine"
                  checked={
                    formData.priority === "Routine"
                  }
                  onChange={handleChange}
                />

                <span className="priority-dot routine" />

                <span>
                  <strong>Routine</strong>
                  <small>Standard referral workflow</small>
                </span>

              </label>


              <label
                className={`create-priority ${
                  formData.priority === "Urgent"
                    ? "selected urgent"
                    : ""
                }`}
              >
                <input
                  type="radio"
                  name="priority"
                  value="Urgent"
                  checked={
                    formData.priority === "Urgent"
                  }
                  onChange={handleChange}
                />

                <span className="priority-dot urgent" />

                <span>
                  <strong>Urgent</strong>
                  <small>Requires closer attention</small>
                </span>

              </label>

            </div>

          </section>


          {/* ROUTE */}

          <section className="create-form-section">

            <div className="create-section-header">
              <div className="create-section-number">
                03
              </div>

              <div>
                <h2>Referral route</h2>
                <p>
                  Choose where the referral starts and where it
                  is being sent.
                </p>
              </div>
            </div>


            <div className="create-route-fields">

              <div className="create-field">
                <label htmlFor="fromFacility">
                  Referring Facility
                  <span>*</span>
                </label>

                <select
                  id="fromFacility"
                  name="fromFacility"
                  value={formData.fromFacility}
                  onChange={handleChange}
                >
                  <option value="Primary Health Centre">
                    Primary Health Centre
                  </option>

                  <option value="Community Health Centre">
                    Community Health Centre
                  </option>

                  <option value="District Hospital">
                    District Hospital
                  </option>
                </select>
              </div>


              <div className="create-route-arrow">
                →
              </div>


              <div className="create-field">
                <label htmlFor="toFacility">
                  Receiving Facility
                  <span>*</span>
                </label>

                <select
                  id="toFacility"
                  name="toFacility"
                  value={formData.toFacility}
                  onChange={handleChange}
                >
                  <option value="District Hospital">
                    District Hospital
                  </option>

                  <option value="Tertiary Care Hospital">
                    Tertiary Care Hospital
                  </option>

                  <option value="Community Health Centre">
                    Community Health Centre
                  </option>
                </select>
              </div>

            </div>

          </section>


          {/* INFORMATION */}

          <section className="create-form-section">

            <div className="create-section-header">
              <div className="create-section-number">
                04
              </div>

              <div>
                <h2>Referral information</h2>
                <p>
                  Add the information required for the receiving
                  facility to act on the referral.
                </p>
              </div>
            </div>

            <div className="create-field">

              <label htmlFor="reason">
                Referral Information
                <span>*</span>
              </label>

              <textarea
                id="reason"
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                placeholder="Enter the information needed for the receiving facility..."
                rows={6}
                required
              />

              <small className="create-field-hint">
                Keep this focused on referral coordination
                information.
              </small>

            </div>

          </section>


          {error && (
            <div className="create-error">
              <span>!</span>
              <div>
                <strong>Check the form</strong>
                <p>{error}</p>
              </div>
            </div>
          )}


          {/* FORM ACTIONS */}

          <div className="create-form-actions">

            <button
              type="button"
              className="create-cancel-btn"
              onClick={() => navigate(-1)}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="create-submit-btn"
            >
              Create Referral
              <span>→</span>
            </button>

          </div>

        </form>


        {/* ===================================================
            LIVE SUMMARY
            =================================================== */}

        <aside className="create-summary">

          <div className="create-summary-card">

            <div className="create-summary-header">
              <div>
                <div className="create-summary-kicker">
                  LIVE PREVIEW
                </div>

                <h2>Referral summary</h2>
              </div>

              <div className="create-summary-status">
                Draft
              </div>
            </div>


            <div className="create-preview-id">
              NAV-2026-XXX
            </div>


            <div className="create-preview-patient">
              <span>Patient</span>

              <strong>
                {formData.patientName || "Patient name"}
              </strong>

              <small>
                {formData.patientId || "Patient ID"}
              </small>
            </div>


            <div className="create-preview-route">

              <div>
                <span>FROM</span>
                <strong>
                  {formData.fromFacility}
                </strong>
              </div>

              <div className="create-preview-arrow">
                →
              </div>

              <div>
                <span>TO</span>
                <strong>
                  {formData.toFacility}
                </strong>
              </div>

            </div>


            <div className="create-preview-tags">

              <span className="create-preview-tag">
                {formData.referralType}
              </span>

              <span
                className={`create-preview-tag ${
                  formData.priority === "Urgent"
                    ? "urgent"
                    : ""
                }`}
              >
                {formData.priority}
              </span>

            </div>


            <div className="create-preview-flow">

              <div className="create-preview-flow-title">
                Journey starts at
              </div>

              <div className="create-preview-step active">
                <span>01</span>
                <div>
                  <strong>Referral Created</strong>
                  <small>
                    A unique referral ID is generated
                  </small>
                </div>
              </div>

              <div className="create-preview-line" />

              <div className="create-preview-step">
                <span>02</span>
                <div>
                  <strong>Referral Sent</strong>
                  <small>
                    Receiving facility gets the referral
                  </small>
                </div>
              </div>

              <div className="create-preview-line" />

              <div className="create-preview-step">
                <span>03</span>
                <div>
                  <strong>Journey Tracked</strong>
                  <small>
                    Acknowledgement, arrival and completion
                  </small>
                </div>
              </div>

            </div>


            <div className="create-summary-note">
              <span>✓</span>

              <p>
                Navexa supports coordination and follow-up.
                Clinical decisions remain with healthcare
                professionals.
              </p>
            </div>

          </div>

        </aside>

      </div>

    </div>
  );
};

export default CreateReferral;