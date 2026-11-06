import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  checkRegistration,
  decideLink,
  findReferralByNumber,
  LinkStatus,
  latestRequestFor,
  pendingRequests,
  registerAccount,
  requestLink,
} from "./selfRegistration.js";

const NOW = Date.parse("2026-11-06T10:00:00Z");

const doc = () => ({
  referrals: [
    {
      id: "NX-9042",
      status: "SENT",
      patientName: "Meera Das",
      patientPhone: "+91 98450 12345",
      caregiverContact: "98450 54321",
      auditTrail: [],
    },
    { id: "REF-2024-8821", status: "SENT", patientName: "Ananya Reddy", patientPhone: "", auditTrail: [] },
  ],
  accounts: [],
  linkRequests: [],
  notifications: [],
});

const nobodyTaken = () => false;

describe("self-registration", () => {
  it("finds a referral number however it is typed", () => {
    assert.equal(findReferralByNumber(doc().referrals, " nx 9042 ")?.id, "NX-9042");
    assert.equal(findReferralByNumber(doc().referrals, "ref20248821")?.id, "REF-2024-8821");
    assert.equal(findReferralByNumber(doc().referrals, ""), null);
  });

  it("checks the form before the code is used", () => {
    const d = doc();
    assert.equal(checkRegistration(d, { phone: "123", name: "A" }, nobodyTaken).ok, false);
    assert.equal(checkRegistration(d, { phone: "9845012345", name: " " }, nobodyTaken).ok, false);
    assert.match(
      checkRegistration(d, { phone: "9845012345", name: "A", reference: "NX-0000" }, nobodyTaken).error,
      /can't find/,
    );
    assert.match(checkRegistration(d, { phone: "9845012345", name: "A" }, () => true).error, /already has an account/);
    assert.deepEqual(checkRegistration(d, { phone: "+91 98450 12345", name: "A" }, nobodyTaken), {
      ok: true,
      phone: "9845012345",
    });
  });

  it("links at once when the mobile is the one on the referral", () => {
    const result = registerAccount(doc(), {
      phone: "9845054321",
      name: "Ravi Das",
      relation: "Husband",
      reference: "nx-9042",
      now: NOW,
    });
    assert.equal(result.linked, true);
    assert.equal(result.data.accounts[0].referralId, "NX-9042");
    assert.equal(result.data.linkRequests.length, 0);
    assert.equal(result.data.referrals[0].auditTrail.at(-1).action, "FAMILY_ACCOUNT_LINKED");
  });

  it("asks the coordinator when the mobile isn't on the referral, and shows no case meanwhile", () => {
    const result = registerAccount(doc(), {
      phone: "9900112233",
      name: "Someone",
      relation: "Sister",
      reference: "NX-9042",
      now: NOW,
    });
    assert.equal(result.linked, false);
    assert.equal(result.pending, true);
    assert.equal(result.data.accounts[0].referralId, null);
    assert.equal(pendingRequests(result.data).length, 1);
    assert.equal(result.data.notifications[0].title, "Family asks to be linked");
  });

  it("makes an unlinked account when no referral number is given", () => {
    const result = registerAccount(doc(), { phone: "9900112233", name: "Asha", now: NOW });
    assert.equal(result.ok, true);
    assert.equal(result.data.accounts[0].referralId, null);
    assert.equal(result.data.accounts[0].relation, "self");
    assert.equal(result.pending, false);
  });

  it("links on approval and records who checked", () => {
    const asked = registerAccount(doc(), { phone: "9900112233", name: "Someone", reference: "NX-9042", now: NOW });
    const [request] = pendingRequests(asked.data);
    const approved = decideLink(asked.data, {
      requestId: request.id,
      approve: true,
      decidedBy: "Priya Raman",
      now: NOW,
    });
    assert.equal(approved.data.accounts[0].referralId, "NX-9042");
    assert.equal(approved.request.status, LinkStatus.APPROVED);
    assert.match(approved.data.referrals[0].auditTrail.at(-1).details, /Priya Raman/);
    assert.equal(decideLink(approved.data, { requestId: request.id, approve: true, decidedBy: "X" }).ok, false);
  });

  it("leaves the account unlinked on decline, with the reason", () => {
    const asked = registerAccount(doc(), { phone: "9900112233", name: "Someone", reference: "NX-9042", now: NOW });
    const [request] = pendingRequests(asked.data);
    const declined = decideLink(asked.data, {
      requestId: request.id,
      approve: false,
      decidedBy: "Priya Raman",
      reason: "Not family",
      now: NOW,
    });
    assert.equal(declined.data.accounts[0].referralId, null);
    assert.equal(latestRequestFor(declined.data, asked.account.id).reason, "Not family");
  });

  it("keeps one open request per account", () => {
    const asked = registerAccount(doc(), { phone: "9900112233", name: "S", reference: "NX-9042", now: NOW });
    const again = requestLink(asked.data, { accountId: asked.account.id, reference: "REF-2024-8821", now: NOW + 1000 });
    assert.equal(pendingRequests(again.data).length, 1);
    assert.equal(pendingRequests(again.data)[0].referralId, "REF-2024-8821");
  });
});
