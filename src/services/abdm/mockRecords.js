/**
 * Made-up past records for the ABDM stand-in: what other clinics might hold for a pregnant woman.
 * Real records arrive as FHIR bundles (NRCeS profiles such as OPConsultRecord). These carry the few
 * fields the screens show, plus the FHIR record type they would come from.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

// daysAgo is counted back from the day the records are shared.
const TEMPLATES = [
  {
    hiType: "OPConsultation",
    daysAgo: 18,
    title: "Antenatal check, 34 weeks",
    source: "Hoskote Primary Health Centre",
    lines: ["Blood pressure 118/76", "Baby's heartbeat normal", "Told to come to hospital if any bleeding"],
  },
  {
    hiType: "DiagnosticReport",
    daysAgo: 25,
    title: "Blood test",
    source: "Sri Lakshmi Diagnostics",
    lines: ["Haemoglobin 9.8 g/dL (low)", "Blood group B positive", "Blood sugar normal"],
    flag: "Low haemoglobin",
  },
  {
    hiType: "Prescription",
    daysAgo: 25,
    title: "Medicines for low blood",
    source: "Hoskote Primary Health Centre",
    lines: ["Iron and folic acid, 1 tablet twice a day", "Calcium 500 mg, 1 tablet twice a day"],
  },
  {
    hiType: "ImmunizationRecord",
    daysAgo: 70,
    title: "Tetanus vaccine (Td), second dose",
    source: "Hoskote Primary Health Centre",
    lines: ["Given in left arm", "No reaction"],
  },
  {
    hiType: "DiagnosticReport",
    daysAgo: 110,
    title: "Ultrasound, 20 weeks",
    source: "Sri Lakshmi Diagnostics",
    lines: ["One baby, growing normally", "Placenta not low lying"],
  },
  {
    hiType: "DischargeSummary",
    daysAgo: 150,
    title: "Hospital stay, 3 days: vomiting and dehydration",
    source: "Hoskote Taluk Hospital",
    lines: ["Given fluids through a drip", "Sent home well"],
  },
];

/** Records of the chosen types whose date falls inside the range, newest first. */
export const buildMockRecords = ({ referralId, hiTypes, dateRange, now = Date.now() }) => {
  const from = Date.parse(dateRange.from);
  // The end date counts in full.
  const to = Date.parse(dateRange.to) + DAY_MS - 1;
  return TEMPLATES.map((t, i) => ({ ...t, id: `${referralId}-HR-${i}`, date: new Date(now - t.daysAgo * DAY_MS) }))
    .filter((r) => hiTypes.includes(r.hiType))
    .filter((r) => r.date.getTime() >= from && r.date.getTime() <= to)
    .sort((a, b) => b.date - a.date)
    .map(({ daysAgo: _daysAgo, date, ...rest }) => ({ ...rest, date: date.toISOString() }));
};
