import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ReferralStatus } from "./enums.js";
import { buildReferralSlip, EMERGENCY_LINE, qrCodePath, slipSignUpUrl } from "./referralSlip.js";

const facilities = [
  { name: "Sanjeevani Regional Perinatal Centre", location: "Bengaluru, Karnataka • Central Hub" },
  { name: "Asha Kiran Community Health Centre", location: "Yelahanka • 13.5 km" },
  { name: "Victoria Hospital", location: "Fort, Bengaluru" },
];

const referral = (overrides = {}) => ({
  id: "NX-9042",
  patientName: "Lakshmi Devi",
  fromFacility: "Asha Kiran Community Health Centre",
  toFacility: "Sanjeevani Regional Perinatal Centre",
  department: "Neonatal ICU",
  status: ReferralStatus.SENT,
  priority: "URGENT",
  reason: "Clinical handover text that must stay off the slip.",
  createdAt: "2026-10-31T08:40:00Z",
  timeline: [
    { status: ReferralStatus.CREATED, date: "2026-10-31T08:40:00Z" },
    { status: ReferralStatus.SENT, date: "2026-10-31T08:45:00Z" },
  ],
  navigator: { name: "Arjun Nair, RN", phone: "+91 90000 19230" },
  ...overrides,
});

// The dark modules a path draws, as "row,col" keys.
const darkCells = ({ path }) => {
  const cells = new Set();
  for (const [, col, row, run] of path.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)) {
    for (let c = Number(col); c < Number(col) + Number(run); c += 1) cells.add(`${row},${c}`);
  }
  return cells;
};

describe("slipSignUpUrl", () => {
  it("opens sign-up on the phone tab with the referral number filled in", () => {
    assert.equal(
      slipSignUpUrl("https://navexa.example", "NX-9042"),
      "https://navexa.example/login?as=phone&signup=1&ref=NX-9042",
    );
  });

  it("does not double the slash after the origin", () => {
    assert.equal(
      slipSignUpUrl("http://localhost:5173/", "NX-1"),
      "http://localhost:5173/login?as=phone&signup=1&ref=NX-1",
    );
  });

  it("encodes a number with characters a URL can't hold", () => {
    const url = new URL(slipSignUpUrl("https://a.example", "NX 9042&x=1"));
    assert.equal(url.searchParams.get("ref"), "NX 9042&x=1");
    assert.equal(url.searchParams.get("x"), null);
  });
});

describe("buildReferralSlip", () => {
  it("fills every field the family needs", () => {
    const slip = buildReferralSlip(referral(), facilities, "https://navexa.example");
    assert.deepEqual(slip, {
      number: "NX-9042",
      patientName: "Lakshmi Devi",
      from: { name: "Asha Kiran Community Health Centre", address: "Yelahanka" },
      to: { name: "Sanjeevani Regional Perinatal Centre", address: "Bengaluru, Karnataka" },
      department: "Neonatal ICU",
      sentAt: "2026-10-31T08:45:00Z",
      coordinator: { name: "Arjun Nair, RN", phone: "+91 90000 19230" },
      emergency: EMERGENCY_LINE,
      signUpUrl: "https://navexa.example/login?as=phone&signup=1&ref=NX-9042",
    });
  });

  it("leaves out clinical text and priority", () => {
    const text = JSON.stringify(buildReferralSlip(referral(), facilities, "https://a.example"));
    assert.ok(!text.includes("handover"));
    assert.ok(!text.includes("URGENT"));
  });

  it("uses the time it was made when there is no sent step", () => {
    assert.equal(buildReferralSlip(referral({ timeline: [] }), facilities).sentAt, "2026-10-31T08:40:00Z");
    assert.equal(buildReferralSlip(referral({ timeline: [], createdAt: undefined }), facilities).sentAt, null);
  });

  it("falls back to the default coordinator", () => {
    assert.deepEqual(buildReferralSlip(referral({ navigator: undefined }), facilities).coordinator, {
      name: "Priya Raman, MSW",
      phone: "+91 90000 21049",
    });
  });

  it("leaves the address empty for a hospital not in the list", () => {
    assert.deepEqual(buildReferralSlip(referral({ toFacility: "Unknown Clinic" }), facilities).to, {
      name: "Unknown Clinic",
      address: "",
    });
  });

  it("never sends the family to a hospital that declined", () => {
    const declined = referral({ status: ReferralStatus.REJECTED });
    const slip = buildReferralSlip(declined, facilities);
    assert.deepEqual(slip.to, { name: "No hospital chosen yet", address: "" });
    assert.equal(slip.department, "");

    const chosen = buildReferralSlip({ ...declined, patientChoice: { elsewhere: "Victoria Hospital" } }, facilities);
    assert.deepEqual(chosen.to, { name: "Victoria Hospital", address: "Fort, Bengaluru" });
    assert.equal(chosen.department, "");
  });
});

describe("qrCodePath", () => {
  const url = slipSignUpUrl("https://navexa-health.vercel.app", "NX-9042");

  it("is a square of a valid QR size", () => {
    const { size } = qrCodePath(url);
    assert.ok(size >= 21);
    assert.equal((size - 17) % 4, 0);
  });

  it("draws the three finder squares in their corners", () => {
    const qr = qrCodePath(url);
    const dark = darkCells(qr);
    const last = qr.size - 1;
    for (const [row, col] of [
      [0, 0],
      [0, last],
      [last, 0],
      [3, 3],
      [3, last - 3],
      [last - 3, 3],
    ]) {
      assert.ok(dark.has(`${row},${col}`), `module ${row},${col} should be dark`);
    }
    // The light ring inside each finder square.
    for (const [row, col] of [
      [1, 1],
      [1, last - 1],
      [last - 1, 1],
    ]) {
      assert.ok(!dark.has(`${row},${col}`), `module ${row},${col} should be light`);
    }
  });

  it("is the same for the same text and differs for another referral", () => {
    assert.equal(qrCodePath(url).path, qrCodePath(url).path);
    assert.notEqual(
      qrCodePath(url).path,
      qrCodePath(slipSignUpUrl("https://navexa-health.vercel.app", "NX-9038")).path,
    );
  });
});
