export const demoReferrals = [
  {
    id: "NAV-2026-001",
    patientName: "Ananya Sharma",
    patientId: "P-1001",

    fromFacility: "Primary Health Centre",
    toFacility: "District Hospital",

    referralType: "Maternal",
    priority: "Urgent",

    status: "SENT",

    createdAt: "2026-10-01T09:00:00Z",

    reason: "Referral created for further care at the receiving facility.",

    timeline: [
      {
        status: "CREATED",
        date: "2026-10-01T09:00:00Z",
        notes: "Referral created by the referring healthcare worker."
      },
      {
        status: "SENT",
        date: "2026-10-01T09:05:00Z",
        notes: "Referral sent to District Hospital."
      }
    ]
  },

  {
    id: "NAV-2026-002",
    patientName: "Rahul Das",
    patientId: "P-1002",

    fromFacility: "District Hospital",
    toFacility: "Tertiary Care Hospital",

    referralType: "Child",
    priority: "Urgent",

    status: "ACKNOWLEDGED",

    createdAt: "2026-10-01T08:15:00Z",

    reason: "Referral sent for further care at the receiving facility.",

    timeline: [
      {
        status: "CREATED",
        date: "2026-10-01T08:15:00Z",
        notes: "Referral created by the healthcare team."
      },
      {
        status: "SENT",
        date: "2026-10-01T08:20:00Z",
        notes: "Referral sent to Tertiary Care Hospital."
      },
      {
        status: "ACKNOWLEDGED",
        date: "2026-10-01T08:35:00Z",
        notes: "Receiving facility acknowledged the referral."
      }
    ]
  },

  {
    id: "NAV-2026-003",
    patientName: "Meera Devi",
    patientId: "P-1003",

    fromFacility: "Community Health Centre",
    toFacility: "District Hospital",

    referralType: "Maternal",
    priority: "Routine",

    status: "ACKNOWLEDGED",

    createdAt: "2026-09-30T14:00:00Z",

    reason: "Referral for continued maternal healthcare services.",

    timeline: [
      {
        status: "CREATED",
        date: "2026-09-30T14:00:00Z",
        notes: "Referral created by the referring healthcare worker."
      },
      {
        status: "SENT",
        date: "2026-09-30T14:05:00Z",
        notes: "Referral sent to District Hospital."
      },
      {
        status: "ACKNOWLEDGED",
        date: "2026-09-30T14:18:00Z",
        notes: "Referral acknowledged by District Hospital."
      }
    ]
  }
];