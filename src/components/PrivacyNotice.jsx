import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext.jsx";
import { Button, Card, Page, PageHeader } from "./ui/index.js";

// What India's data protection law (DPDP Act 2023) asks a family to be told before Navexa uses their
// details. Separate from ABDM: ABDM's approval only covers records from other hospitals.
const POINTS = [
  [
    "What we keep",
    "Your name, phone number, details about your pregnancy or baby, and where the van should pick you up.",
  ],
  ["Why", "To get you to the right hospital and look after you for 42 days after the birth."],
  [
    "Who sees it",
    "Your care coordinator and the hospitals you are referred to. The van driver sees only where to pick you up.",
  ],
  [
    "Records from other hospitals",
    "Only if you say yes in your ABHA app. You can stop sharing at any time, and the copy here is deleted.",
  ],
  ["Your rights", "Ask your care coordinator to show you, correct or delete your details, or to stop using them."],
];

/** Shown once per account, the first time a patient or family member signs in. */
const PrivacyNotice = () => {
  const { session, acceptPrivacy, signOut } = useAuth();
  const navigate = useNavigate();
  const [forBaby, setForBaby] = useState(false);
  const isFamily = session?.relation && session.relation !== "self";

  return (
    <Page width="sm">
      <PageHeader title="Before you start" subtitle="How Navexa uses your details" />
      <Card className="space-y-4">
        <dl className="space-y-4">
          {POINTS.map(([term, text]) => (
            <div key={term}>
              <dt className="text-sm font-semibold text-ink">{term}</dt>
              <dd className="text-sm text-ink mt-0.5">{text}</dd>
            </div>
          ))}
        </dl>
        {isFamily && (
          <p className="text-sm text-ink">
            You are signing in as {session.relation.toLowerCase()}, for the patient you are linked to.
          </p>
        )}
        <label className="flex items-start gap-3 text-sm text-ink">
          <input
            type="checkbox"
            className="mt-1 w-5 h-5 shrink-0 accent-accent"
            checked={forBaby}
            onChange={(e) => setForBaby(e.target.checked)}
          />
          <span>I am the parent or guardian, and I agree for my baby's details too.</span>
        </label>
        <p className="text-xs text-ink-muted">Demo only. Wording to be checked before real use.</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="primary" onClick={acceptPrivacy}>
            I agree
          </Button>
          <Button
            onClick={async () => {
              await signOut();
              navigate("/");
            }}
          >
            Not now, sign out
          </Button>
        </div>
      </Card>
    </Page>
  );
};

export default PrivacyNotice;
