export const demoReferrals = [
  {
    id: "REF-2024-8821",
    patientName: "Elena Rostova",
    patientId: "MRN-882104",
    age: "28 yrs",
    parity: "G2P1",
    gestationalAge: "34w 2d",
    edd: "Nov 14, 2026",
    condition: "Gestational Pre-eclampsia (BP 152/98) • Late-onset IUGR",
    fromFacility: "Oak Valley Health Center",
    toFacility: "St. Jude Perinatal SCU",
    referralType: "Maternal",
    priority: "Urgent",
    status: "ARRIVAL_CONFIRMED",
    createdAt: "2026-10-16T08:15:00Z",
    reason: "Elena presented for routine 34w checkup with progressive headache and pedal edema. Office BP 154/100 repeated at 152/98. Proteinuria confirmed +2. Urgent hospital transfer initiated for immediate labetalol titration and 24h maternal-fetal observation.",
    caregiverContact: "(555) 392-1049",
    navigator: {
      name: "Maya Lin, MSW",
      role: "Lead Perinatal Care Coordinator",
      assignedAt: "08:30 AM",
      avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuDoZfH4bzWWKO46H7BwByYXNjLd4FhpN7LW57qYEUL5j3A47FUv2i09dJmjQL1-MUN4d7VztblABu5RPVUzpx8obJuR1ntnJjb4W9zE5qpFD2vmeTihz8r3qv6wjd0vqiE19y8l5GMFj-AhAZCenAQ7biqFZJWwGsbmWee9F4s5Sk-xXyQtcirTUUZU9Jw5PL2difZ0P0uXr72r6EMZvVHP30iJbdO8p4Anu7jP4zLlWygVN5Mv7nDeWQ"
    },
    vitals: {
      bp: "152/98",
      bpStatus: "warning",
      fhr: "142",
      fhrStatus: "normal",
      urine: "+2 Protein",
      bpp: "8/8"
    },
    barriers: [
      {
        id: "bar-1",
        title: "Transportation Disruption",
        status: "Resolved",
        description: "Mechanical breakdown on personal vehicle solved within 27 min. MediRide voucher #TR-4492 covered directly by Navexa Transit fund."
      },
      {
        id: "bar-2",
        title: "Childcare Supervision",
        status: "Resolved",
        description: "Coordinator assisted in family communications. Patient's sister arrived at residence at 09:00 AM to care for 4-year-old son."
      },
      {
        id: "bar-3",
        title: "Pharmacy Proximity & Refills",
        status: "Proactive Plan",
        description: "Rural address makes daily pharmacy pickup infeasible. Enrolled in Navexa Mail-Order Pharmacy for next-day Labetalol delivery."
      }
    ],
    timeline: [
      {
        status: "CREATED",
        date: "2026-10-16T08:15:00Z",
        notes: "Dr. K. Patel submitted high-priority perinatal transfer from Oak Valley Community Clinic after consecutive systolic readings exceeded 150 mmHg."
      },
      {
        status: "NAVIGATOR_ASSIGNED",
        date: "2026-10-16T08:30:00Z",
        notes: "Care Navigator Maya Lin, MSW assigned. Initial 12-minute phone outreach completed with Elena."
      },
      {
        status: "BARRIER_FLAGGED",
        date: "2026-10-16T08:45:00Z",
        notes: "Barrier Flagged: Personal vehicle transmission stalled 2 blocks from home. Rapid transit protocol initiated."
      },
      {
        status: "BARRIER_RESOLVED",
        date: "2026-10-16T09:12:00Z",
        notes: "Barrier Resolved: Navexa Transit Voucher #TR-4492 booked via MediRide. Pick-up at residence completed."
      },
      {
        status: "SENT",
        date: "2026-10-16T09:15:00Z",
        notes: "Digital clinical referral package transmitted to St. Jude Regional Perinatal Center."
      },
      {
        status: "ACKNOWLEDGED",
        date: "2026-10-16T09:30:00Z",
        notes: "St. Jude Perinatal SCU acknowledged referral and prepared OB Assessment Exam Room 3B."
      },
      {
        status: "ARRIVAL_CONFIRMED",
        date: "2026-10-16T10:05:00Z",
        notes: "St. Jude OB Assessment Center confirmed patient entry. Clerk badge swipe verified Elena safely seated with spouse."
      }
    ]
  },

  {
    id: "NX-9042",
    patientName: "Baby Boy Chen",
    patientId: "MRN-904211",
    age: "3 Days Old",
    parity: "Newborn",
    gestationalAge: "38w 5d",
    edd: "Delivered Oct 13",
    condition: "Acute Neonatal Hyperbilirubinemia (TSB: 21.4 mg/dL)",
    fromFacility: "Crestview Midwifery Center",
    toFacility: "St. Jude NICU Phototherapy",
    referralType: "Child",
    priority: "Urgent",
    status: "FOLLOW_UP_REQUIRED",
    createdAt: "2026-10-16T09:00:00Z",
    reason: "3-day-old infant discharged yesterday shows rapid cephalocaudal progression of jaundice and lethargy with poor latch. Total Serum Bilirubin 21.4 mg/dL exceeds AAP phototherapy and exchange transfusion risk thresholds. Immediate intensive double-surface LED phototherapy required.",
    caregiverContact: "(555) 481-9230",
    navigator: {
      name: "Marcus Ward, RN",
      role: "Neonatal Care Specialist",
      assignedAt: "09:15 AM",
      avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuCooDGFa7qPCwTWh0oC8fovs0awEeLjO7muJKgbAXM1Dh2J-bTp5YxaH4KgdQOJ2MSkmAJx3kDyk9SqYNQT-rftnQJy1DCQZrP6mqikn3tmWDCK7wa2gxs8-Q172V4NlS3OfAPiwH5M0hC5AsozMohWC1i2ajTPxpnSYEkoHabg4oF_OtJFSfUL8tWgN5RoJ67n6-SJLMul8A_RNT23cl3d_JUVidK3kyDDBYKEpT5EWH6134w8hyRW1Q"
    },
    vitals: {
      tsb: "21.4 mg/dL",
      weight: "2,980g",
      temp: "36.8 °C",
      hr: "138 bpm"
    },
    barriers: [
      {
        id: "bar-chen-1",
        title: "Transit Failure & Car Seat Lack",
        status: "Active Barrier",
        description: "Family lacks personal vehicle and compliant rear-facing infant car seat. Cannot safely travel by commercial rideshare."
      }
    ],
    timeline: [
      {
        status: "CREATED",
        date: "2026-10-16T09:00:00Z",
        notes: "Urgent neonatal referral created by Crestview Midwifery Center for immediate NICU phototherapy."
      },
      {
        status: "SENT",
        date: "2026-10-16T09:05:00Z",
        notes: "Referral sent to St. Jude NICU Phototherapy."
      },
      {
        status: "FOLLOW_UP_REQUIRED",
        date: "2026-10-16T09:40:00Z",
        notes: "Family contacted navigator reporting transit failure and lack of compliant infant safety seat. Overdue arrival flagged."
      }
    ]
  },

  {
    id: "MRN-773829",
    patientName: "Fatima Zahra",
    patientId: "MRN-773829",
    age: "29 yrs",
    parity: "G3P2",
    gestationalAge: "36w 2d",
    edd: "Nov 02, 2026",
    condition: "Late Preterm Premature Rupture of Membranes (PPROM)",
    fromFacility: "River West Clinic",
    toFacility: "St. Jude Maternity Triage",
    referralType: "Maternal",
    priority: "Urgent",
    status: "ACKNOWLEDGED",
    createdAt: "2026-10-16T09:00:00Z",
    reason: "Confirmed spontaneous rupture of membranes at 36w 2d. Group B Strep status unknown. Mild irregular contractions. Transfer to Level III maternity center for prophylactic antibiotic coverage and continuous fetal monitoring.",
    caregiverContact: "(555) 382-9012",
    navigator: {
      name: "Maya Lin, MSW",
      role: "Lead Perinatal Care Coordinator",
      assignedAt: "09:10 AM",
      avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuDoZfH4bzWWKO46H7BwByYXNjLd4FhpN7LW57qYEUL5j3A47FUv2i09dJmjQL1-MUN4d7VztblABu5RPVUzpx8obJuR1ntnJjb4W9zE5qpFD2vmeTihz8r3qv6wjd0vqiE19y8l5GMFj-AhAZCenAQ7biqFZJWwGsbmWee9F4s5Sk-xXyQtcirTUUZU9Jw5PL2difZ0P0uXr72r6EMZvVHP30iJbdO8p4Anu7jP4zLlWygVN5Mv7nDeWQ"
    },
    transit: {
      driver: "Thomas S.",
      vehicle: "Silver Transit Van • Plate: 7TX-489",
      eta: "10:15 AM",
      progress: 78
    },
    timeline: [
      {
        status: "CREATED",
        date: "2026-10-16T09:00:00Z",
        notes: "Dr. Vance at River West Clinic sent perinatal notes and lab records to St. Jude."
      },
      {
        status: "SENT",
        date: "2026-10-16T09:05:00Z",
        notes: "Referral sent to St. Jude Maternity Triage."
      },
      {
        status: "ACKNOWLEDGED",
        date: "2026-10-16T09:45:00Z",
        notes: "St. Jude Maternity Triage accepted transfer. Bed Pod #4 in West Pavilion prepared."
      }
    ]
  },

  {
    id: "NAV-2026-001",
    patientName: "Ananya Sharma",
    patientId: "P-1001",
    age: "26 yrs",
    parity: "G1P0",
    gestationalAge: "32w 4d",
    fromFacility: "Primary Health Centre",
    toFacility: "District Hospital",
    referralType: "Maternal",
    priority: "Urgent",
    status: "SENT",
    createdAt: "2026-10-15T09:00:00Z",
    reason: "High-risk pregnancy with persistent hypertension and reduced fetal movement. Transfer for ultrasound evaluation and continuous fetal heart rate monitoring.",
    caregiverContact: "+91 98765 43210",
    timeline: [
      {
        status: "CREATED",
        date: "2026-10-15T09:00:00Z",
        notes: "Referral created by primary medical officer."
      },
      {
        status: "SENT",
        date: "2026-10-15T09:05:00Z",
        notes: "Referral sent to District Hospital. Awaiting acknowledgment."
      }
    ]
  },

  {
    id: "NAV-2026-002",
    patientName: "Rahul Das",
    patientId: "P-1002",
    age: "5 Days Old",
    parity: "Newborn",
    gestationalAge: "37w 0d",
    fromFacility: "District Hospital",
    toFacility: "Tertiary Care Hospital",
    referralType: "Child",
    priority: "Urgent",
    status: "ACKNOWLEDGED",
    createdAt: "2026-10-15T08:15:00Z",
    reason: "Neonatal respiratory distress and suspected congenital heart anomaly. Transfer to Tertiary NICU for pediatric cardiology consultation.",
    caregiverContact: "+91 98765 43211",
    timeline: [
      {
        status: "CREATED",
        date: "2026-10-15T08:15:00Z",
        notes: "Referral created by pediatric attending."
      },
      {
        status: "SENT",
        date: "2026-10-15T08:20:00Z",
        notes: "Referral sent to Tertiary Care Hospital."
      },
      {
        status: "ACKNOWLEDGED",
        date: "2026-10-15T08:35:00Z",
        notes: "Receiving facility acknowledged and prepared Level III NICU bed."
      }
    ]
  },

  {
    id: "NAV-2026-003",
    patientName: "Meera Devi",
    patientId: "P-1003",
    age: "31 yrs",
    parity: "G2P1",
    gestationalAge: "37w 1d",
    fromFacility: "Community Health Centre",
    toFacility: "District Hospital",
    referralType: "Maternal",
    priority: "Routine",
    status: "COMPLETED",
    createdAt: "2026-10-14T14:00:00Z",
    reason: "Scheduled induction of labor for gestational diabetes with satisfactory maternal and fetal stabilization.",
    caregiverContact: "+91 98765 43212",
    timeline: [
      {
        status: "CREATED",
        date: "2026-10-14T14:00:00Z",
        notes: "Referral created by medical officer."
      },
      {
        status: "SENT",
        date: "2026-10-14T14:05:00Z",
        notes: "Referral sent to District Hospital."
      },
      {
        status: "ACKNOWLEDGED",
        date: "2026-10-14T14:18:00Z",
        notes: "Referral acknowledged by District Hospital."
      },
      {
        status: "ARRIVAL_CONFIRMED",
        date: "2026-10-14T15:00:00Z",
        notes: "Patient arrived and admitted to Labor Ward."
      },
      {
        status: "COMPLETED",
        date: "2026-10-15T18:00:00Z",
        notes: "Normal delivery recorded. Healthy infant delivered. Both mother and newborn stable."
      }
    ]
  }
];