import { Link, useLocation } from "react-router-dom";
import { getActiveNavItem, getNavigationForRole } from "../config/navigationConfig.js";
import { useReferrals } from "../context/ReferralContext.jsx";
import { Icon } from "./ui/index.js";

const MAX_TABS = 5;

const tabClass =
  "flex-1 min-w-0 min-h-tabbar flex flex-col items-center justify-center gap-0.5 px-1 text-xs whitespace-nowrap";

// Phone navigation. Items that do not fit stay one tap away in the drawer.
const MobileNav = ({ onOpenMenu }) => {
  const { role } = useReferrals();
  const location = useLocation();

  const items = getNavigationForRole(role);
  const activeItem = getActiveNavItem(items, location.pathname, location.search);
  const hasMore = items.length > MAX_TABS;
  const tabs = hasMore ? items.slice(0, MAX_TABS - 1) : items;

  return (
    <nav
      aria-label="Tabs"
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 flex bg-surface border-t border-line pb-safe"
    >
      {tabs.map((item) => {
        const isActive = item === activeItem;
        return (
          <Link
            key={item.title}
            to={item.path}
            aria-current={isActive ? "page" : undefined}
            className={`${tabClass} ${isActive ? "text-accent font-bold" : "text-ink-muted font-medium"}`}
          >
            <Icon name={item.icon} filled={isActive} />
            {item.tabLabel || item.title}
          </Link>
        );
      })}
      {hasMore && (
        <button type="button" onClick={onOpenMenu} className={`${tabClass} text-ink-muted font-medium`}>
          <Icon name="more_horiz" />
          More
        </button>
      )}
    </nav>
  );
};

export default MobileNav;
