import { Button, Card, Icon } from "./ui/index.js";

/** An embedded map of the hospital, with a link that opens turn-by-turn directions. */
const HospitalMap = ({ map }) => (
  <Card title="Getting to the hospital" className="space-y-3">
    <p className="text-sm font-semibold text-ink break-words">{map.name}</p>
    <iframe
      key={map.embedUrl}
      src={map.embedUrl}
      title={`Map showing ${map.name}`}
      loading="lazy"
      // oxlint-disable-next-line react/iframe-missing-sandbox -- The map is cross-origin and needs both to run.
      sandbox="allow-scripts allow-same-origin allow-popups"
      className="w-full h-64 sm:h-80 rounded-control border border-line"
    />
    <Button
      as="a"
      href={map.directionsUrl}
      target="_blank"
      rel="noopener noreferrer"
      variant="primary"
      className="w-full sm:w-auto"
    >
      <Icon name="directions" />
      Get directions
      <span className="sr-only"> (opens in a new tab)</span>
    </Button>
  </Card>
);

export default HospitalMap;
