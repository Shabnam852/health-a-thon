import { useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router";
import ThemeToggle from "../components/ThemeToggle.jsx";
import { BrandMark, Button, Card, Field, FilterTabs, Icon, Input, Select } from "../components/ui/index.js";
import { useDemoStory } from "../components/useDemoStory.js";
import { getRoleDefinition, isRouteAllowedForRole } from "../config/navigationConfig.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useReferrals } from "../context/ReferralContext.jsx";
import { DEMO_PASSWORD, findAccountById, phoneAccounts, staffAccounts } from "../services/auth/demoAccounts.js";

const Tab = { STAFF: "staff", PHONE: "phone", SIGN_UP: "signup" };

const formatPhone = (digits) => `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;

const ErrorText = ({ children }) =>
  children ? (
    <p role="alert" className="flex items-start gap-2 text-sm text-danger">
      <Icon name="error" className="shrink-0" />
      {children}
    </p>
  ) : null;

// The demo accounts, so a judge can sign in without being told a password.
const DemoAccounts = ({ title, children }) => (
  <section aria-label={title} className="border border-line rounded-card p-4 space-y-3">
    <h2 className="text-sm font-semibold text-ink">{title}</h2>
    <ul className="space-y-2">{children}</ul>
  </section>
);

const DemoAccountRow = ({ name, detail, onUse }) => (
  <li className="flex items-center justify-between gap-3">
    <span className="min-w-0">
      <span className="block text-sm font-semibold text-ink truncate">{name}</span>
      <span className="block text-xs text-ink-muted truncate">{detail}</span>
    </span>
    <Button size="sm" onClick={onUse} aria-label={`Use ${name}`}>
      Use
    </Button>
  </li>
);

const StaffForm = ({ initialEmail, onSignedIn }) => {
  const { signInStaff } = useAuth();
  const { facilities } = useReferrals();
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState(initialEmail ? DEMO_PASSWORD : "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const result = await signInStaff({ email, password });
    setBusy(false);
    if (!result.ok) return setError(result.error);
    onSignedIn(result.session);
  };

  const facilityName = (id) => facilities.find((f) => f.id === id)?.name;

  return (
    <div className="space-y-5">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Work email">
          <Input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password">
          <Input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <ErrorText>{error}</ErrorText>
        <Button type="submit" variant="primary" fullWidth disabled={busy}>
          Sign in
        </Button>
      </form>

      <DemoAccounts title={`Demo accounts (password ${DEMO_PASSWORD})`}>
        {staffAccounts.map((a) => (
          <DemoAccountRow
            key={a.id}
            name={a.name}
            detail={[a.jobTitle, facilityName(a.facilityId)].filter(Boolean).join(", ")}
            onUse={() => {
              setEmail(a.email);
              setPassword(DEMO_PASSWORD);
              setError("");
            }}
          />
        ))}
      </DemoAccounts>
    </div>
  );
};

const PhoneForm = ({ initialPhone, onSignedIn, onSignUp }) => {
  const { requestPhoneCode, verifyPhoneCode } = useAuth();
  const [phone, setPhone] = useState(initialPhone);
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(null);
  const [error, setError] = useState("");
  const [notRegistered, setNotRegistered] = useState(false);
  const [busy, setBusy] = useState(false);

  const askForCode = async (e) => {
    e.preventDefault();
    setBusy(true);
    const result = await requestPhoneCode({ phone });
    setBusy(false);
    setNotRegistered(Boolean(result.notRegistered));
    if (!result.ok) return setError(result.error);
    setError("");
    // Demo only: fill the code in, as the phone would offer to. Mythic's dev stack returns it too.
    setCode(result.demoCode);
    setSent(result);
  };

  const verify = async (e) => {
    e.preventDefault();
    setBusy(true);
    const result = await verifyPhoneCode({ phone, code });
    setBusy(false);
    if (!result.ok) return setError(result.error);
    onSignedIn(result.session);
  };

  if (sent) {
    return (
      <form onSubmit={verify} className="space-y-4" noValidate>
        <div role="status" className="border-l-4 border-accent bg-accent-soft p-4 rounded-control space-y-1">
          <p className="text-sm text-ink">We sent a 6-digit code to {phone}.</p>
          <p className="text-sm text-ink">
            Demo only, no text is sent. We filled in your code:{" "}
            <span className="font-semibold tabular-nums tracking-wider">{sent.demoCode}</span>.
          </p>
        </div>
        <Field label="Code" hint="The code works for 5 minutes.">
          <Input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />
        </Field>
        <ErrorText>{error}</ErrorText>
        <Button type="submit" variant="primary" fullWidth disabled={busy || code.length !== 6}>
          Sign in
        </Button>
        <Button
          variant="link"
          fullWidth
          onClick={() => {
            setSent(null);
            setError("");
          }}
        >
          Use a different number
        </Button>
      </form>
    );
  }

  return (
    <div className="space-y-5">
      <form onSubmit={askForCode} className="space-y-4" noValidate>
        <Field label="Mobile number" hint="The number you gave the clinic.">
          <Input
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </Field>
        <ErrorText>{error}</ErrorText>
        {notRegistered && (
          <Button variant="primary" fullWidth onClick={() => onSignUp(phone)}>
            <Icon name="person_add" />
            Create an account with this number
          </Button>
        )}
        <Button type="submit" variant={notRegistered ? "secondary" : "primary"} fullWidth disabled={busy}>
          Send me a code
        </Button>
        <Button variant="link" fullWidth onClick={() => onSignUp(phone)}>
          New here? Create an account
        </Button>
      </form>

      <DemoAccounts title="Demo patients and family">
        {phoneAccounts.map((a) => (
          <DemoAccountRow
            key={a.id}
            name={a.name}
            detail={`${a.relation === "self" ? "Patient" : `${a.relation}, family`} · ${formatPhone(a.phone)}`}
            onUse={() => {
              setPhone(a.phone);
              setError("");
            }}
          />
        ))}
      </DemoAccounts>
    </div>
  );
};

// Self-registration for a patient or family member. The referral number is optional: an account
// with none, or with one whose mobile doesn't match, waits for the care coordinator to link it.
const SignUpForm = ({ initialPhone, initialReference = "", onSignedIn, onBack }) => {
  const { requestPhoneCode, registerWithPhone } = useAuth();
  const [phone, setPhone] = useState(initialPhone);
  const [sent, setSent] = useState(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [who, setWho] = useState("self");
  const [relation, setRelation] = useState("");
  const [reference, setReference] = useState(initialReference);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const askForCode = async (e) => {
    e.preventDefault();
    setBusy(true);
    const result = await requestPhoneCode({ phone, forSignUp: true });
    setBusy(false);
    if (!result.ok) return setError(result.error);
    setError("");
    // Demo only: fill the code in, as the phone would offer to.
    setCode(result.demoCode);
    setSent(result);
  };

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    const result = await registerWithPhone({
      phone,
      code,
      name,
      relation: who === "self" ? "self" : relation.trim() || "Family",
      reference,
    });
    setBusy(false);
    if (!result.ok) return setError(result.error);
    onSignedIn(result.session);
  };

  if (!sent) {
    return (
      <form onSubmit={askForCode} className="space-y-4" noValidate>
        <p className="text-sm text-ink">Make an account to follow your referral or your family member's.</p>
        <Field label="Mobile number" hint="We send a code to check it's yours.">
          <Input
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </Field>
        <ErrorText>{error}</ErrorText>
        <Button type="submit" variant="primary" fullWidth disabled={busy}>
          Send me a code
        </Button>
        <Button variant="link" fullWidth onClick={onBack}>
          I already have an account
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={create} className="space-y-4" noValidate>
      <div role="status" className="border-l-4 border-accent bg-accent-soft p-4 rounded-control space-y-1">
        <p className="text-sm text-ink">We sent a 6-digit code to {phone}.</p>
        <p className="text-sm text-ink">
          Demo only, no text is sent. We filled in your code:{" "}
          <span className="font-semibold tabular-nums tracking-wider">{sent.demoCode}</span>.
        </p>
      </div>
      <Field label="Code" hint="The code works for 5 minutes.">
        <Input
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        />
      </Field>
      <Field label="Your name">
        <Input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Who are you?">
        <Select value={who} onChange={(e) => setWho(e.target.value)}>
          <option value="self">I am the patient</option>
          <option value="family">I am family, or looking after the patient</option>
        </Select>
      </Field>
      {who === "family" && (
        <Field label="How are you related?" hint="For example husband, mother or sister.">
          <Input value={relation} onChange={(e) => setRelation(e.target.value)} />
        </Field>
      )}
      <Field label="Referral number (if you have one)" hint="On the slip from your clinic, like NX-9042.">
        <Input value={reference} autoCapitalize="characters" onChange={(e) => setReference(e.target.value)} />
      </Field>
      <ErrorText>{error}</ErrorText>
      <Button type="submit" variant="primary" fullWidth disabled={busy || code.length !== 6}>
        Create account
      </Button>
      <Button
        variant="link"
        fullWidth
        onClick={() => {
          setSent(null);
          setError("");
        }}
      >
        Use a different number
      </Button>
    </form>
  );
};

const Login = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const { goToStep } = useDemoStory();
  const [searchParams] = useSearchParams();
  const prefill = findAccountById(searchParams.get("account"));
  // The referral slip's QR code opens sign-up (signup=1) with its referral number (ref) filled in.
  const [tab, setTab] = useState(() => {
    if (searchParams.get("signup") === "1") return Tab.SIGN_UP;
    return searchParams.get("as") === Tab.PHONE || prefill?.phone ? Tab.PHONE : Tab.STAFF;
  });
  const slipReference = (searchParams.get("ref") ?? "").trim().slice(0, 40);
  const [signUpPhone, setSignUpPhone] = useState("");

  // Only go back to a page this account may see; anything else goes to its home screen.
  const destinationFor = (s) => {
    const next = searchParams.get("next");
    const path = next?.startsWith("/") && !next.startsWith("//") ? next : null;
    return path && isRouteAllowedForRole(s.role, path.split("?")[0]) ? path : getRoleDefinition(s.role).homePath;
  };

  if (session) return <Navigate to={destinationFor(session)} replace />;

  const onSignedIn = (s) => navigate(destinationFor(s), { replace: true });

  return (
    <div className="min-h-screen bg-canvas">
      <main id="main-content" tabIndex={-1} className="max-w-md mx-auto w-full px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <BrandMark size="sm" />
            <span className="font-semibold text-ink">Navexa Health</span>
          </div>
          <ThemeToggle iconOnly />
        </div>

        <header className="space-y-2">
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink">Sign in</h1>
          <p className="text-sm text-ink-muted">
            Demo with made-up people. What you enter is saved for everyone using this demo, so don't use real details.
          </p>
          <Button onClick={() => goToStep(0)}>
            <Icon name="play_arrow" />
            Watch the 5-step demo
          </Button>
        </header>

        <Card className="space-y-5">
          <FilterTabs
            label="Who is signing in"
            items={[
              { id: Tab.STAFF, label: "Care team" },
              { id: Tab.PHONE, label: "Patient or family" },
            ]}
            selected={tab === Tab.SIGN_UP ? Tab.PHONE : tab}
            onSelect={setTab}
          />
          {tab === Tab.STAFF ? (
            <StaffForm initialEmail={prefill?.email ?? ""} onSignedIn={onSignedIn} />
          ) : tab === Tab.SIGN_UP ? (
            <SignUpForm
              initialPhone={signUpPhone}
              initialReference={slipReference}
              onSignedIn={onSignedIn}
              onBack={() => setTab(Tab.PHONE)}
            />
          ) : (
            <PhoneForm
              initialPhone={prefill?.phone ?? ""}
              onSignedIn={onSignedIn}
              onSignUp={(phone) => {
                setSignUpPhone(phone);
                setTab(Tab.SIGN_UP);
              }}
            />
          )}
        </Card>
      </main>
    </div>
  );
};

export default Login;
