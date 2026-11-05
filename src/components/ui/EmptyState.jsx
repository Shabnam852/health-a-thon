import Pictogram from "./Pictogram.jsx";

// Nothing to show yet. A pictogram makes the moment feel calm rather than broken.
const EmptyState = ({ pictogram = "check", children }) => (
  <div className="bg-surface border border-line rounded-card px-6 py-10 flex flex-col items-center gap-3 text-center">
    <Pictogram name={pictogram} tone="neutral" size="md" />
    <p className="text-sm text-ink-muted max-w-sm">{children}</p>
  </div>
);

export default EmptyState;
