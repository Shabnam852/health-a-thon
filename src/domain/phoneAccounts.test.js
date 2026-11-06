import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PatientType } from "./enums.js";
import { accountsForReferral, linkAccounts, normaliseMobile, referralIdsForPhone } from "./phoneAccounts.js";

describe("phone accounts for new referrals", () => {
  it("links the patient's and the emergency contact's mobiles", () => {
    const accounts = accountsForReferral({
      id: "NX-1",
      patientName: "Meera Das",
      patientPhone: "+91 98450 12345",
      caregiverContact: "098450 54321",
      referralType: PatientType.MATERNAL,
    });
    assert.deepEqual(
      accounts.map((a) => [a.phone, a.relation, a.referralId]),
      [
        ["9845012345", "self", "NX-1"],
        ["9845054321", "Family", "NX-1"],
      ],
    );
    assert.equal(accounts[0].name, "Meera Das");
  });

  it("treats the number on a newborn's referral as a parent's", () => {
    const [account] = accountsForReferral({
      id: "NX-2",
      patientName: "Baby of Meera",
      patientPhone: "9845012345",
      referralType: PatientType.CHILD,
    });
    assert.equal(account.relation, "Parent");
  });

  it("skips landlines, short numbers and a repeated number", () => {
    assert.deepEqual(accountsForReferral({ id: "X", patientPhone: "044 2222 3333", caregiverContact: "" }), []);
    assert.equal(
      accountsForReferral({ id: "X", patientPhone: "9845012345", caregiverContact: "9845012345" }).length,
      1,
    );
  });

  it("lets one number follow a mother's and her newborn's referrals", () => {
    const mother = [{ id: "PH-M", phone: "9845012345", referralId: "NX-M" }];
    const linked = linkAccounts(mother, [{ id: "PH-B", phone: "9845012345", referralId: "NX-B" }]);
    assert.deepEqual(referralIdsForPhone(linked, "9845012345"), ["NX-B", "NX-M"]);
    // Linking the same referral again doesn't repeat it.
    const again = linkAccounts(linked, [{ id: "PH-B2", phone: "9845012345", referralId: "NX-B" }]);
    assert.equal(again.length, 2);
  });

  it("normalises +91 and a leading 0", () => {
    assert.equal(normaliseMobile("+91-98450-12345"), "9845012345");
    assert.equal(normaliseMobile("09845012345"), "9845012345");
  });
});
