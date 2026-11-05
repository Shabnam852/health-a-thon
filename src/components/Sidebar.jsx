import { Link, useLocation, useNavigate } from "react-router";
import { getActiveNavItem, getNavigationForRole, getRoleDefinition, RoleId } from "../config/navigationConfig.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useReferrals } from "../context/ReferralContext.jsx";
import { phoneAccounts, staffAccounts } from "../services/auth/demoAccounts.js";
import { useFamilyLanguage } from "./assistant/useFamilyLanguage.js";
import ResetAssistantButton from "./ResetAssistantButton.jsx";
import ResetDemoButton from "./ResetDemoButton.jsx";
import ThemeToggle from "./ThemeToggle.jsx";
import { BrandMark, Button, Field, Icon, Select } from "./ui/index.js";

const Sidebar = ({ onNavigate, isMobileDrawer = false, onClose }) => {
  const { role } = useReferrals();
  const { session, signInAsDemoAccount, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const currentRole = role || "coordinator";
  const roleDef = getRoleDefinition(currentRole);
  const navItems = getNavigationForRole(currentRole);
  const activeItem = getActiveNavItem(navItems, location.pathname, location.search);
  // Only the patient's menu follows the family's language; staff menus stay English.
  const { t, lang } = useFamilyLanguage();
  const isPatient = currentRole === RoleId.PATIENT;
  const itemTitle = (item) => (isPatient && item.titleKey ? t[item.titleKey] : item.title);

  // Demo only: jump to another made-up account without typing a password or code.
  const handleAccountChange = (e) => {
    const result = signInAsDemoAccount(e.target.value);
    if (!result.ok) return;
    navigate(getRoleDefinition(result.session.role).homePath);
    if (onNavigate) onNavigate();
  };

  const handleSignOut = async () => {
    await signOut();
    if (onNavigate) onNavigate();
    navigate("/login");
  };

  const signedInAs = session
    ? session.relation && session.relation !== "self"
      ? `${session.relation}, family`
      : session.jobTitle || roleDef.title
    : "";

  const handleItemClick = () => {
    if (onNavigate) onNavigate();
  };

  return (
    <div className="w-full h-full bg-surface flex flex-col justify-between select-none">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="px-5 py-4 bg-surface border-b border-line">
          <div className="flex items-center justify-between">
            <Link to={roleDef.homePath} onClick={handleItemClick} className="flex items-center gap-3 group">
              <BrandMark />
              <span className="font-display text-base text-ink font-bold">Navexa Health</span>
            </Link>

            {isMobileDrawer && (
              <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close menu">
                <Icon name="close" />
              </Button>
            )}
          </div>
        </div>

        <nav
          aria-label="Main"
          lang={isPatient ? lang : undefined}
          className="flex-1 overflow-y-auto px-3 py-3 space-y-1"
        >
          {navItems.map((item) => {
            const isActive = item === activeItem;

            return (
              <Link
                key={item.title}
                to={item.path}
                aria-current={isActive ? "page" : undefined}
                onClick={handleItemClick}
                className={`flex items-center gap-3 px-3 min-h-control rounded-control text-sm ${
                  isActive
                    ? "bg-accent-soft text-accent font-semibold"
                    : "text-ink-muted font-medium hover:bg-subtle hover:text-ink"
                }`}
              >
                <Icon name={item.icon} filled={isActive} className="shrink-0" />
                <span className="truncate flex-1">{itemTitle(item)}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-3 border-t border-line space-y-2">
        <div className="flex gap-2">
          <div className="flex-1 min-w-0">
            <ThemeToggle fullWidth />
          </div>
          <ResetAssistantButton />
          <ResetDemoButton />
        </div>
        {session && (
          <div className="flex items-center justify-between gap-2 px-1">
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink truncate">{session.name}</span>
              <span className="block text-xs text-ink-muted truncate">{signedInAs}</span>
            </span>
            <Button size="sm" variant="ghost" onClick={handleSignOut}>
              <Icon name="logout" />
              Sign out
            </Button>
          </div>
        )}
        <Field label="Demo only: sign in as">
          <Select value={session?.accountId ?? ""} onChange={handleAccountChange}>
            <optgroup label="Care team">
              {staffAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}, {a.jobTitle}
                </option>
              ))}
            </optgroup>
            <optgroup label="Patients and family">
              {phoneAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                  {a.relation === "self" ? ", patient" : `, ${a.relation.toLowerCase()}`}
                </option>
              ))}
            </optgroup>
          </Select>
        </Field>
      </div>
    </div>
  );
};

export default Sidebar;
