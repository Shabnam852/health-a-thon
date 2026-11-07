import { Link } from "react-router";
import { acuityRank, PATIENT_TYPE_LABELS, ReferralStatus, UrgencyLevel } from "../domain/enums.js";
import { getDestination } from "../domain/workflow.js";
import { Badge } from "./ui/index.js";

// Columns every referral table shares, so a patient reads the same on every screen.

// Pages that track the open case pass onOpenCase in the table context.
export const patientColumn = () => ({
  id: "patient",
  header: "Patient",
  accessorKey: "patientName",
  cell: ({ row: { original: r }, table }) => (
    <Link
      to={`/referral/${r.id}`}
      onClick={() => table.options.meta?.onOpenCase?.(r.id)}
      className="block min-w-32 rounded-control font-semibold text-ink hover:underline"
    >
      {r.patientName}
    </Link>
  ),
});

// Each priority has its own colour, so a STAT case stands out from an urgent one at a glance.
const PRIORITY_TONES = {
  [UrgencyLevel.STAT]: "danger-solid",
  [UrgencyLevel.URGENT]: "warning",
  [UrgencyLevel.PRIORITY]: "caution",
  [UrgencyLevel.ROUTINE]: "neutral",
};

// Stored values are upper-case enums; people read sentence case. Real acronyms stay upper case.
const ACRONYMS = new Set(["STAT", "NICU", "SNCU", "PICU", "ICU", "OPD", "ASHA", "ANM", "PHC", "CHC", "ID"]);
export const enumLabel = (value) => {
  if (value == null || value === "") return "";
  const words = String(value).replace(/_/g, " ").split(/\s+/).filter(Boolean);
  return words
    .map((w, i) => {
      if (ACRONYMS.has(w.toUpperCase())) return w.toUpperCase();
      const lower = w.toLowerCase();
      return i === 0 ? lower.charAt(0).toUpperCase() + lower.slice(1) : lower;
    })
    .join(" ");
};
export const priorityLabel = enumLabel;

// The row's place in the list as it is sorted and filtered now.
export const serialColumn = () => ({
  id: "serial",
  header: "#",
  enableSorting: false,
  meta: { className: "w-0 tabular-nums text-ink-muted" },
  cell: ({ rowNumber }) => rowNumber,
});

export const caseIdColumn = () => ({
  id: "caseId",
  header: "Case ID",
  accessorKey: "id",
  meta: { className: "whitespace-nowrap tabular-nums text-ink-muted" },
});

export const priorityColumn = () => ({
  id: "priority",
  header: "Priority",
  accessorKey: "priority",
  sortFn: (a, b) => acuityRank(a.original.priority) - acuityRank(b.original.priority),
  meta: { filter: true, label: priorityLabel },
  cell: ({ getValue }) => <Badge tone={PRIORITY_TONES[getValue()] || "neutral"}>{priorityLabel(getValue())}</Badge>,
});

export const typeColumn = () => ({
  id: "type",
  header: "Type",
  accessorKey: "referralType",
  meta: { filter: true, label: (v) => PATIENT_TYPE_LABELS[v] || v, className: "whitespace-nowrap" },
  cell: ({ getValue }) => PATIENT_TYPE_LABELS[getValue()] || getValue(),
});

export const conditionColumn = () => ({
  id: "condition",
  header: "Condition",
  accessorFn: (r) => r.condition || r.reason || "",
  meta: { className: "min-w-48 text-ink-muted" },
  // Two lines at most, so every row keeps one height. The full text is in the tooltip.
  cell: ({ getValue }) => (
    <span className="line-clamp-2" title={getValue()}>
      {getValue()}
    </span>
  ),
});

export const fromColumn = () => ({
  id: "from",
  header: "From",
  accessorKey: "fromFacility",
  meta: { filter: true, filterLabel: "From", className: "min-w-36 text-ink-muted" },
});

export const toColumn = () => ({
  id: "to",
  header: "To",
  accessorFn: (r) => getDestination(r),
  meta: { filter: true, filterLabel: "To", className: "min-w-36 text-ink-muted" },
});

// An actions column: its header is read out but not drawn.
export const actionsColumn = (cell) => ({
  id: "actions",
  header: "Actions",
  enableSorting: false,
  enableGlobalFilter: false,
  meta: { srOnly: true, sticky: true, className: "text-right" },
  cell,
});

const STATUS_LABELS = {
  [ReferralStatus.SENT]: "Sent",
  [ReferralStatus.ACKNOWLEDGED]: "Accepted",
  [ReferralStatus.ARRIVAL_CONFIRMED]: "Arrived",
  [ReferralStatus.REJECTED]: "Floating: patient choosing",
};
export const statusLabel = (status) => STATUS_LABELS[status] || enumLabel(status);

export const statusColumn = () => ({
  id: "status",
  header: "Status",
  accessorFn: (r) => statusLabel(r.status),
  meta: { filter: true, className: "font-semibold text-ink min-w-28" },
});
