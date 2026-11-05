// A large button with stacked content, for choosing where to go.
const Tile = ({ className = "", children, ...props }) => (
  <button
    type="button"
    {...props}
    className={`block w-full text-left bg-surface text-ink border border-line rounded-card p-5 sm:p-6 hover:border-line-strong/60 ${className}`}
  >
    {children}
  </button>
);

export default Tile;
