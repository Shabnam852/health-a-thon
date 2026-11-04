// A section of a screen. Headings are plain text, as on NHS and 1177: an icon tile on every card
// heading adds colour without adding meaning.
const Card = ({ as: Component = "div", title, className = "", children, ...props }) => (
  <Component {...props} className={`bg-surface border border-line rounded-card p-5 sm:p-6 ${className}`}>
    {title && <h2 className="font-display text-lg font-semibold text-ink mb-4">{title}</h2>}
    {children}
  </Component>
);

export default Card;
