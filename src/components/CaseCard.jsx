import { Link } from "react-router-dom";
import { isHighAcuity } from "../domain/enums.js";
import { Badge, Button, Card } from "./ui/index.js";

export const DetailRow = ({ label, children }) => (
  <p className="break-words">
    <span className="font-semibold text-ink">{label}: </span>
    {children}
  </p>
);

// A patient in a work list: who, what is happening, what to do, and details on demand.
const CaseCard = ({ referral, summary, actions, children }) => (
  <Card as="li" className="space-y-4">
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
      <div className="min-w-0">
        <p className="font-semibold text-ink break-words">
          {referral.patientName}
          {isHighAcuity(referral.priority) && (
            <Badge tone="danger" className="ml-2">
              {referral.priority}
            </Badge>
          )}
        </p>
        <div className="text-sm text-ink-muted break-words mt-0.5">{summary}</div>
      </div>
      {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
    </div>

    <details className="text-sm text-ink-muted">
      <summary className="cursor-pointer font-semibold text-ink">Details</summary>
      <div className="mt-2 space-y-1">
        {children}
        <Button as={Link} to={`/referral/${referral.id}`} variant="link" size="flush">
          Open case
        </Button>
      </div>
    </details>
  </Card>
);

export default CaseCard;
