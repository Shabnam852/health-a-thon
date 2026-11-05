import { ConsentStatus, HI_TYPE_LABELS } from "../../services/abdm/abdmService.js";
import { Badge } from "../ui/index.js";

export const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

const STATUS = {
  [ConsentStatus.REQUESTED]: { tone: "caution", staff: "Waiting for the family", family: "Waiting for your answer" },
  [ConsentStatus.GRANTED]: { tone: "accent", staff: "Shared", family: "You are sharing" },
  [ConsentStatus.DENIED]: { tone: "neutral", staff: "Family said no", family: "You said no" },
  [ConsentStatus.REVOKED]: { tone: "neutral", staff: "Family stopped sharing", family: "You stopped sharing" },
  [ConsentStatus.EXPIRED]: { tone: "neutral", staff: "Deleted on its date", family: "Deleted on its date" },
};

export const ConsentStatusBadge = ({ status, audience = "staff" }) => (
  <Badge tone={STATUS[status].tone}>{STATUS[status][audience]}</Badge>
);

export const hiTypeList = (hiTypes) => hiTypes.map((t) => HI_TYPE_LABELS[t] ?? t).join(", ");

/** The shared records, newest first. */
export const RecordList = ({ records }) =>
  records.length === 0 ? (
    <p className="text-sm text-ink-muted">No records of these kinds in those dates.</p>
  ) : (
    <ul className="divide-y divide-line border-y border-line">
      {records.map((r) => (
        <li key={r.id} className="py-3 space-y-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <span className="text-sm font-semibold text-ink">{r.title}</span>
            <span className="text-xs text-ink-muted tabular-nums">{formatDate(r.date)}</span>
          </div>
          <p className="text-xs text-ink-muted">
            {HI_TYPE_LABELS[r.hiType]} · {r.source}
          </p>
          {r.flag && <Badge tone="warning">{r.flag}</Badge>}
          <ul className="list-disc pl-5 text-sm text-ink">
            {r.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
