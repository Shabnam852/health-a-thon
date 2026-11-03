import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { actionsColumn } from "../components/referralColumns.jsx";
import { Badge, Button, DataTable, FilterSelect, Icon, Page, PageHeader } from "../components/ui/index.js";
import { isRouteAllowedForRole } from "../config/navigationConfig.js";
import { useReferrals } from "../context/ReferralContext.jsx";
import { formatMinutes } from "../domain/alarms.js";
import { telHref } from "../domain/contact.js";
import { PATIENT_TYPE_LABELS, PatientType, UrgencyLevel } from "../domain/enums.js";
import {
  CARE_LEVEL_LABELS,
  fitsNeeds,
  getHospitalRow,
  getNetworkSummary,
  Pressure,
  SERVICES,
} from "../domain/network.js";

const PRESSURE = {
  [Pressure.OPEN]: { bar: "bg-accent", text: "text-accent", label: "" },
  [Pressure.BUSY]: { bar: "bg-warning", text: "text-warning", label: "Busy" },
  [Pressure.FULL]: { bar: "bg-danger", text: "text-danger", label: "Nearly full" },
};

const TYPE_OPTIONS = [PatientType.MATERNAL, PatientType.CHILD, PatientType.DYAD].map((t) => [
  t,
  PATIENT_TYPE_LABELS[t],
]);
const PRIORITY_OPTIONS = [
  [UrgencyLevel.STAT, "STAT"],
  [UrgencyLevel.URGENT, "Urgent"],
  [UrgencyLevel.PRIORITY, "Priority"],
  [UrgencyLevel.ROUTINE, "Routine"],
];
const serviceLabel = Object.fromEntries(SERVICES.map((s) => [s.id, s.label]));
const treatsLabel = (treats) =>
  treats.includes(PatientType.MATERNAL) && treats.includes(PatientType.CHILD)
    ? "Mothers, newborns"
    : treats.includes(PatientType.MATERNAL)
      ? "Mothers"
      : "Newborns";

const BedsCell = ({ row: { original: h } }) => {
  const look = PRESSURE[h.pressure];
  return (
    <div className="min-w-40 space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-semibold text-ink tabular-nums">
          {h.freeAfterArrivals} <span className="font-normal text-ink-muted">of {h.totalBeds} free</span>
        </span>
        <span className={`text-xs font-semibold ${look.text}`}>{look.label}</span>
      </div>
      <div
        className="h-1.5 rounded-full bg-subtle overflow-hidden"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(h.share * 100)}
        aria-label={`${Math.round(h.share * 100)}% full`}
      >
        <div className={`h-full rounded-full ${look.bar}`} style={{ width: `${Math.round(h.share * 100)}%` }} />
      </div>
      {h.held > 0 && (
        <p className="text-xs text-ink-muted tabular-nums">
          {h.bedsAvailable} listed free, {h.held} held for referred patients
        </p>
      )}
    </div>
  );
};

const BOARD_COLUMNS = [
  {
    id: "hospital",
    header: "Hospital",
    accessorKey: "name",
    meta: { className: "min-w-56" },
    cell: ({ row: { original: h }, table }) => (
      <div>
        <span className="font-semibold text-ink">{h.name}</span>
        {table.options.meta.hasNeeds && h.fits && (
          <Badge tone="accent" className="ml-2">
            Fits
          </Badge>
        )}
      </div>
    ),
  },
  {
    id: "level",
    header: "Level",
    accessorKey: "careLevel",
    meta: { filter: true, label: (v) => CARE_LEVEL_LABELS[v], className: "whitespace-nowrap" },
    cell: ({ getValue }) => CARE_LEVEL_LABELS[getValue()],
  },
  {
    id: "beds",
    header: "Beds after arrivals",
    accessorFn: (h) => h.freeAfterArrivals,
    enableGlobalFilter: false,
    cell: BedsCell,
  },
  {
    id: "incoming",
    header: "Incoming",
    accessorFn: (h) => h.awaitingReply + h.onTheWay,
    enableGlobalFilter: false,
    meta: { className: "whitespace-nowrap tabular-nums" },
    cell: ({ row: { original: h } }) =>
      h.awaitingReply + h.onTheWay === 0 ? (
        <span className="text-ink-muted">–</span>
      ) : (
        <span className="text-ink">
          {h.awaitingReply > 0 && <span className="block">{h.awaitingReply} to reply</span>}
          {h.onTheWay > 0 && <span className="block">{h.onTheWay} on the way</span>}
        </span>
      ),
  },
  {
    id: "reply",
    header: "Usual reply",
    accessorKey: "medianReplyMinutes",
    sortUndefined: "last",
    enableGlobalFilter: false,
    meta: { className: "whitespace-nowrap tabular-nums" },
    cell: ({ row: { original: h } }) => (
      <span>
        {h.medianReplyMinutes == null ? <span className="text-ink-muted">–</span> : formatMinutes(h.medianReplyMinutes)}
        {h.lateReplies > 0 && (
          <Badge tone="danger" className="ml-2">
            {h.lateReplies} late
          </Badge>
        )}
      </span>
    ),
  },
  {
    id: "takes",
    header: "Takes",
    accessorFn: (h) => treatsLabel(h.treats),
    meta: { className: "whitespace-nowrap" },
    cell: ({ row: { original: h } }) => (
      <span>
        {treatsLabel(h.treats)}
        <span className={`block text-xs ${h.takesUrgent ? "text-ink" : "text-ink-muted"}`}>
          {h.takesUrgent ? "Urgent cases" : "No urgent cases"}
        </span>
      </span>
    ),
  },
  {
    id: "distance",
    header: "From hub",
    accessorKey: "distanceKm",
    enableGlobalFilter: false,
    meta: { className: "whitespace-nowrap tabular-nums text-ink-muted" },
    cell: ({ getValue }) => (getValue() === 0 ? "Hub" : `${getValue()} km`),
  },
  {
    id: "contact",
    header: "Contact",
    accessorFn: (h) => `${h.directContact} ${h.phone}`,
    meta: { className: "min-w-48" },
    cell: ({ row: { original: h } }) => (
      <span className="text-ink-muted">
        <a href={telHref(h.phone)} className="font-semibold text-ink underline whitespace-nowrap">
          {h.phone}
        </a>
        <span className="block text-xs">{h.directContact}</span>
      </span>
    ),
  },
  // Searchable, so "phototherapy" finds the hospitals that offer it.
  {
    id: "services",
    header: "Services",
    accessorFn: (h) => h.services.map((s) => serviceLabel[s]).join(" "),
    meta: { hidden: true },
  },
  actionsColumn(({ row: { original: h }, table }) => {
    const { canOpenFacility, canCreate } = table.options.meta;
    return (
      <div className="flex justify-end gap-2">
        {canOpenFacility && (
          <Button as={Link} to={`/facility?facility=${h.id}`} size="sm">
            Intake
          </Button>
        )}
        {canCreate && (
          <Button as={Link} to="/create" size="sm" variant="primary">
            Refer
          </Button>
        )}
      </div>
    );
  }),
];

/** Which hospital offers which service. The service a coordinator is looking for is highlighted. */
const ServicesGrid = ({ rows, highlight }) => (
  <div className="bg-surface border border-line rounded-card shadow-card overflow-x-auto">
    <table className="text-sm">
      <caption className="sr-only">Services by hospital</caption>
      <thead className="bg-muted text-ink-muted">
        <tr className="border-b border-line">
          <th scope="col" className="sticky left-0 bg-muted px-3 py-2 text-left font-semibold min-w-56">
            Hospital
          </th>
          <th scope="col" className="px-3 py-2 font-semibold whitespace-nowrap">
            NICU level
          </th>
          {SERVICES.map((s) => (
            <th
              key={s.id}
              scope="col"
              className={`px-3 py-2 font-semibold whitespace-nowrap ${s.id === highlight ? "bg-accent-soft text-accent" : ""}`}
            >
              {s.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {rows.map((h) => (
          <tr key={h.id}>
            <th scope="row" className="sticky left-0 bg-surface px-3 py-2 text-left font-semibold text-ink">
              {h.name}
            </th>
            <td className="px-3 py-2 text-center tabular-nums">
              {h.nicuLevel ? CARE_LEVEL_LABELS[h.nicuLevel].replace("Level ", "") : "–"}
            </td>
            {SERVICES.map((s) => {
              const has = h.services.includes(s.id);
              return (
                <td key={s.id} className={`px-3 py-2 text-center ${s.id === highlight ? "bg-accent-soft" : ""}`}>
                  {has ? (
                    <>
                      <Icon name="check" size="sm" className="text-accent" />
                      <span className="sr-only">Yes</span>
                    </>
                  ) : (
                    <>
                      <span className="text-ink-muted" aria-hidden="true">
                        ·
                      </span>
                      <span className="sr-only">No</span>
                    </>
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const NetworkView = () => {
  const { facilities, referrals, role, now } = useReferrals();
  const [needs, setNeeds] = useState({ referralType: "", priority: "", service: "" });
  const [onlyFits, setOnlyFits] = useState(false);

  const hasNeeds = Boolean(needs.referralType || needs.priority || needs.service);
  const rows = useMemo(
    () =>
      facilities.map((f) => {
        const row = getHospitalRow(f, referrals, now);
        return { ...row, fits: fitsNeeds(row, needs) };
      }),
    [facilities, referrals, now, needs],
  );
  const summary = getNetworkSummary(rows);
  const fitting = rows.filter((r) => r.fits);
  const shown = hasNeeds && onlyFits ? fitting : rows;

  const context = {
    hasNeeds,
    canOpenFacility: isRouteAllowedForRole(role, "/facility"),
    canCreate: isRouteAllowedForRole(role, "/create"),
  };

  // One line, and only the numbers that need action.
  const alerts = [
    `${summary.bedsFree} beds free after arrivals`,
    summary.nearlyFull > 0 && `${summary.nearlyFull} nearly full`,
    summary.lateReplies > 0 && `${summary.lateReplies} ${summary.lateReplies === 1 ? "reply" : "replies"} overdue`,
  ].filter(Boolean);

  const needSelect = (key, name, options) => (
    <FilterSelect
      label={name}
      value={needs[key]}
      options={options}
      allText="any"
      onChange={(v) => setNeeds((prev) => ({ ...prev, [key]: v }))}
      className="sm:w-44"
    />
  );

  return (
    <Page width="full">
      <PageHeader title="Hospitals" subtitle={alerts.join(" · ")} />

      {hasNeeds && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <p className="text-ink">
            <strong>
              {fitting.length} of {rows.length} fit
            </strong>
            <span className="text-ink-muted"> with a bed. Read them to the family: they choose.</span>
          </p>
          <label className="inline-flex items-center gap-2 text-ink">
            <input
              type="checkbox"
              className="accent-control w-4 h-4"
              checked={onlyFits}
              onChange={(e) => setOnlyFits(e.target.checked)}
            />
            Only these
          </label>
          <Button variant="ghost" size="sm" onClick={() => setNeeds({ referralType: "", priority: "", service: "" })}>
            Clear needs
          </Button>
        </div>
      )}

      <DataTable
        label="Hospitals"
        data={shown}
        columns={BOARD_COLUMNS}
        context={context}
        searchPlaceholder="Search hospital, contact or service"
        emptyText="No hospital fits these needs right now."
        noMatchText="No hospital matches that search."
        initialSorting={[{ id: "beds", desc: true }]}
        getRowClassName={(h) => (hasNeeds && !h.fits ? "opacity-50" : "")}
        // The grid gets the rows the board's own search and Level filter leave, so both agree.
        renderBelow={(visible) => (
          <section className="space-y-3 pt-3">
            <h2 className="font-display text-base font-semibold text-ink">Services</h2>
            <ServicesGrid rows={visible} highlight={needs.service} />
          </section>
        )}
        toolbar={
          <>
            {needSelect("referralType", "Patient", TYPE_OPTIONS)}
            {needSelect("priority", "Priority", PRIORITY_OPTIONS)}
            {needSelect(
              "service",
              "Needs",
              SERVICES.map((sv) => [sv.id, sv.label]),
            )}
          </>
        }
      />
    </Page>
  );
};

export default NetworkView;
