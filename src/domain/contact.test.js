import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { telHref } from "./contact.js";

describe("telHref", () => {
  it("links a plain number", () => {
    assert.equal(telHref("+91 90000 21049"), "tel:+919000021049");
  });

  it("finds the number in a contact with a name", () => {
    assert.equal(telHref("Tariq Ahmed (Spouse) - +91 90000 29014"), "tel:+919000029014");
  });

  it("gives no link without a number", () => {
    for (const contact of ["", "Neighbour", null, undefined]) assert.equal(telHref(contact), null);
  });
});
