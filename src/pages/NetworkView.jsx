import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Button, Card, EmptyState, Icon, Input, Page, PageHeader } from "../components/ui/index.js";
import { isRouteAllowedForRole } from "../config/navigationConfig.js";
import { useReferrals } from "../context/ReferralContext.jsx";
import { telHref } from "../domain/contact.js";

const NetworkView = () => {
  const { facilities, role } = useReferrals();
  const canCreate = isRouteAllowedForRole(role, "/create");
  const canOpenFacility = isRouteAllowedForRole(role, "/facility");
  const [searchTerm, setSearchTerm] = useState("");

  const term = searchTerm.toLowerCase();
  const filteredFacilities = (facilities || []).filter(
    (f) =>
      f.name.toLowerCase().includes(term) ||
      f.type.toLowerCase().includes(term) ||
      f.capabilities.some((c) => c.toLowerCase().includes(term)),
  );
  const bedsOpen = facilities.reduce((sum, f) => sum + (f.bedsAvailable || 0), 0);

  return (
    <Page>
      <PageHeader title="Hospitals" subtitle={`${bedsOpen} beds open across ${facilities.length} centres`} />

      <div className="relative max-w-md">
        <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
        <Input
          type="search"
          aria-label="Search hospitals"
          placeholder="Search by name or service"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {filteredFacilities.length === 0 && <EmptyState>No hospital matches that search.</EmptyState>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredFacilities.map((fac) => (
          <Card as="section" key={fac.id} className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="font-display text-base font-semibold text-ink">{fac.name}</h2>
                <p className="text-sm text-ink-muted">
                  {fac.type} · {fac.location}
                </p>
              </div>
              <Badge tone="accent" className="shrink-0">
                {fac.bedsAvailable} of {fac.totalBeds} beds open
              </Badge>
            </div>

            <p className="text-sm text-ink-muted">{fac.capabilities.join(" · ")}</p>

            <details className="text-sm text-ink-muted">
              <summary className="cursor-pointer font-semibold text-ink">Contact</summary>
              <div className="mt-2 space-y-1">
                <div>
                  Phone:{" "}
                  <a href={telHref(fac.phone)} className="font-semibold text-ink underline">
                    {fac.phone}
                  </a>
                </div>
                <div>
                  Lead: <strong className="text-ink">{fac.directContact}</strong>
                </div>
              </div>
            </details>

            {(canOpenFacility || canCreate) && (
              <div className="mt-auto pt-3 border-t border-line flex flex-wrap items-center justify-between gap-3">
                {canOpenFacility && (
                  <Button as={Link} to={`/facility?facility=${fac.id}`} variant="link" size="sm">
                    Open operations view
                  </Button>
                )}
                {canCreate && (
                  <Button as={Link} to="/create" size="sm" className="ml-auto">
                    Refer patient
                  </Button>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>
    </Page>
  );
};

export default NetworkView;
