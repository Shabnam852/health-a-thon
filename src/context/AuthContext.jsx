import { createContext, useContext, useEffect, useState } from "react";
import * as auth from "../services/auth/authService.js";
import { findAccountById, referralsForPhone } from "../services/auth/demoAccounts.js";
import { useReferrals } from "./ReferralContext.jsx";

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

/**
 * Who is signed in. The signed-in account decides the app's role, the hospital a staff member works
 * at, and the patient a family sees, so the "view as" switch is no longer how you change role.
 */
export const AuthProvider = ({ children }) => {
  const {
    role,
    setRole,
    activeReferralId,
    setActiveReferralId,
    setActiveFacilityId,
    checkSelfRegistration,
    registerSelf,
  } = useReferrals();
  const [storedSession, setSession] = useState(() => auth.getSession());
  // Reset demo on any device clears the accounts made since; a phone signed in to one of them is
  // signed out rather than left on a screen that can no longer do anything.
  const accountGone = storedSession?.kind === "phone" && !findAccountById(storedSession.accountId);
  const session = accountGone ? null : storedSession;
  useEffect(() => {
    if (accountGone) auth.signOut();
  }, [accountGone]);
  const [privacyAccepted, setPrivacyAccepted] = useState(() =>
    session ? auth.hasAcceptedPrivacy(session.accountId) : false,
  );

  // The role always follows the account, even if something else (like Reset demo) changed it.
  useEffect(() => {
    if (session && role !== session.role) setRole(session.role);
  }, [session, role, setRole]);

  // A phone account's case is read live, not from the session: a coordinator can link it after
  // sign-in (self-registration), and the family's screens open as soon as that reaches this device.
  const account = session?.kind === "phone" ? findAccountById(session.accountId) : null;
  const linkedReferralId = session?.kind === "phone" ? (account?.referralId ?? null) : (session?.referralId ?? null);

  // Every case this phone follows: usually one, or a mother's and her newborn's (FR-80).
  const myReferralIds = account?.phone ? referralsForPhone(account.phone) : linkedReferralId ? [linkedReferralId] : [];
  const myReferralKey = myReferralIds.join(",");

  // A patient or family member only ever sees their own cases.
  useEffect(() => {
    const mine = myReferralKey ? myReferralKey.split(",") : [];
    if (linkedReferralId && !mine.includes(activeReferralId)) setActiveReferralId(linkedReferralId);
  }, [myReferralKey, linkedReferralId, activeReferralId, setActiveReferralId]);

  const begin = (result) => {
    if (!result.ok) return result;
    const next = result.session;
    setSession(next);
    setPrivacyAccepted(auth.hasAcceptedPrivacy(next.accountId));
    setRole(next.role);
    if (next.facilityId) setActiveFacilityId(next.facilityId);
    if (next.referralId) setActiveReferralId(next.referralId);
    return result;
  };

  const value = {
    session,
    account,
    linkedReferralId,
    myReferralIds,
    /**
     * Self-registration: checks the form, then the code, then makes the account and signs in.
     * Returns the sign-in result plus { linked, pending } from the linking rule.
     */
    registerWithPhone: async ({ phone, code, name, relation, reference }) => {
      const checked = checkSelfRegistration({ phone, name, reference });
      if (!checked.ok) return checked;
      const coded = await auth.checkPhoneCode({ phone, code });
      if (!coded.ok) return coded;
      const made = registerSelf({ phone: checked.phone, name, relation, reference });
      if (!made.ok) return made;
      const signedIn = begin(auth.signInAccount(made.account.id));
      return { ...signedIn, linked: made.linked, pending: made.pending };
    },
    privacyAccepted,
    signInStaff: async (input) => begin(await auth.signInStaff(input)),
    requestPhoneCode: (input) => auth.requestPhoneCode(input),
    verifyPhoneCode: async (input) => begin(await auth.verifyPhoneCode(input)),
    signInAsDemoRole: (demoRole) => begin(auth.signInAsDemoRole(demoRole)),
    signInAsDemoAccount: (accountId) => begin(auth.signInAsDemoAccount(accountId)),
    acceptPrivacy: () => {
      if (!session) return;
      auth.acceptPrivacy(session.accountId);
      setPrivacyAccepted(true);
    },
    signOut: async () => {
      await auth.signOut();
      setSession(null);
      setPrivacyAccepted(false);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
