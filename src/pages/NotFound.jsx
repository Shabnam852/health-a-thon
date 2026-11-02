import { Link } from "react-router-dom";
import { Button, Icon, Page } from "../components/ui/index.js";
import { getRoleDefinition } from "../config/navigationConfig.js";
import { useReferrals } from "../context/ReferralContext.jsx";

const NotFound = () => {
  const { role } = useReferrals();
  const roleDef = getRoleDefinition(role);

  return (
    <Page width="sm" className="text-center">
      <Icon name="travel_explore" size="xl" className="text-ink-muted" />
      <h1 className="font-display text-2xl font-bold text-ink tracking-tight">Page not found</h1>
      <Button as={Link} to={roleDef.homePath} variant="primary">
        Back to my screens
      </Button>
    </Page>
  );
};

export default NotFound;
