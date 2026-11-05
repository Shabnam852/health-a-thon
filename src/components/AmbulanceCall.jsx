import { Button, Icon, Pictogram } from "./ui/index.js";

/**
 * The emergency ambulance (108 in India) for staff arranging a ride: a patient who can't wait for
 * a van, every van out, or a van that broke down. Staff screens only; the family has its own
 * emergency box on their screens.
 */
const AmbulanceCall = ({ children = "Patient can't wait for a van, or the van broke down?" }) => (
  <section
    aria-label="Emergency ambulance"
    className="bg-danger-soft text-danger-strong rounded-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
  >
    <div className="flex items-center gap-3">
      <Pictogram name="van" tone="danger" size="sm" />
      <p className="text-sm font-semibold">{children} Call the 108 ambulance.</p>
    </div>
    <Button as="a" href="tel:108" variant="danger" wrap className="shrink-0">
      <Icon name="call" />
      Call 108 (ambulance)
    </Button>
  </section>
);

export default AmbulanceCall;
