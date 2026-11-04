import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  getActiveNavItem,
  getNavigationForRole,
  getRoleDefinition,
  roleDefinitions,
} from "../config/navigationConfig.js";
import { useReferrals } from "../context/ReferralContext.jsx";
import ResetAssistantButton from "./ResetAssistantButton.jsx";
import ResetDemoButton from "./ResetDemoButton.jsx";
import ThemeToggle from "./ThemeToggle.jsx";
import { BrandMark, Button, Field, Icon, Select } from "./ui/index.js";

const Sidebar = ({ onNavigate, isMobileDrawer = false, onClose }) => {
  const { role, setRole } = useReferrals();
  const location = useLocation();
  const navigate = useNavigate();

  const currentRole = role || "coordinator";
  const roleDef = getRoleDefinition(currentRole);
  const navItems = getNavigationForRole(currentRole);
  const activeItem = getActiveNavItem(navItems, location.pathname, location.search);

  const handleRoleChange = (e) => {
    const newRole = e.target.value;
    setRole(newRole);
    const targetDef = roleDefinitions[newRole];
    if (targetDef?.homePath) {
      navigate(targetDef.homePath);
      if (onNavigate) onNavigate();
    }
  };

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

        <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
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
                <span className="truncate flex-1">{item.title}</span>
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
        <Field label="Demo only: view as">
          <Select value={currentRole} onChange={handleRoleChange}>
            {Object.values(roleDefinitions).map((def) => (
              <option key={def.id} value={def.id}>
                {def.title}
              </option>
            ))}
          </Select>
        </Field>
        <Button as={Link} to="/" variant="link" fullWidth onClick={handleItemClick}>
          Back to start
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
