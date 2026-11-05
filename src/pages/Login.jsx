import { useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router";
import ThemeToggle from "../components/ThemeToggle.jsx";
import { BrandMark, Button, Card, Field, FilterTabs, Icon, Input } from "../components/ui/index.js";
import { useDemoStory } from "../components/useDemoStory.js";
import { getRoleDefinition, isRouteAllowedForRole } from "../config/navigationConfig.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useReferrals } from "../context/ReferralContext.jsx";
import { DEMO_PASSWORD, findAccountById, phoneAccounts, staffAccounts } from "../services/auth/demoAccounts.js";

const Tab = { STAFF: "staff", PHONE: "phone" };

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

const PhoneForm = ({ initialPhone, onSignedIn }) => {
  const { requestPhoneCode, verifyPhoneCode } = useAuth();
  const [phone, setPhone] = useState(initialPhone);
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const askForCode = async (e) => {
    e.preventDefault();
    setBusy(true);
    const result = await requestPhoneCode({ phone });
    setBusy(false);
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
        <Button type="submit" variant="primary" fullWidth disabled={busy}>
          Send me a code
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

const Login = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const { goToStep } = useDemoStory();
  const [searchParams] = useSearchParams();
  const prefill = findAccountById(searchParams.get("account"));
  const [tab, setTab] = useState(searchParams.get("as") === Tab.PHONE || prefill?.phone ? Tab.PHONE : Tab.STAFF);

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
          <p className="text-sm text-ink-muted">Demo with made-up people. Nothing you enter leaves this browser.</p>
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
            selected={tab}
            onSelect={setTab}
          />
          {tab === Tab.STAFF ? (
            <StaffForm initialEmail={prefill?.email ?? ""} onSignedIn={onSignedIn} />
          ) : (
            <PhoneForm initialPhone={prefill?.phone ?? ""} onSignedIn={onSignedIn} />
          )}
        </Card>
      </main>
    </div>
  );
};

export default Login;
