export const demoReferrals = [
  {
    id: "REF-001",
    patientName: "John Doe",
    patientId: "P-12345",
    fromFacility: "City General Hospital",
    toFacility: "Specialized Orthopedic Center",
    status: "Pending",
    date: "2026-10-01T10:00:00Z",
    reason: "Severe knee joint pain, needs specialist evaluation.",
    priority: "High",
    timeline: [
      { status: "Created", date: "2026-10-01T09:00:00Z", notes: "Referral initiated by Dr. Smith" },
      { status: "Pending", date: "2026-10-01T10:00:00Z", notes: "Awaiting acceptance from Specialized Orthopedic Center" }
    ]
  },
  {
    id: "REF-002",
    patientName: "Jane Smith",
    patientId: "P-67890",
    fromFacility: "Westside Clinic",
    toFacility: "City General Hospital",
    status: "Accepted",
    date: "2026-09-28T14:30:00Z",
    reason: "Routine cardiology checkup.",
    priority: "Normal",
    timeline: [
      { status: "Created", date: "2026-09-28T14:00:00Z", notes: "Referral initiated by Dr. Adams" },
      { status: "Accepted", date: "2026-09-28T14:30:00Z", notes: "Accepted by Cardiology Dept" }
    ]
  }
];
