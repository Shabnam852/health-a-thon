// A large button with stacked content, for choosing where to go.
const Tile = ({ className = "", children, ...props }) => (
  <button
    type="button"
    {...props}
    className={`block w-full text-left bg-surface text-ink border border-line rounded-card shadow-card p-4 sm:p-5 transition-colors duration-fast hover:border-line-strong ${className}`}
  >
    {children}
  </button>
);

export default Tile;
