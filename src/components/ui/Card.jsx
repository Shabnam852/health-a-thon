const Card = ({ as: Component = "div", title, className = "", children, ...props }) => (
  <Component {...props} className={`bg-surface border border-line rounded-card shadow-card p-4 sm:p-5 ${className}`}>
    {title && <h2 className="font-display text-base font-semibold text-ink mb-3">{title}</h2>}
    {children}
  </Component>
);

export default Card;
