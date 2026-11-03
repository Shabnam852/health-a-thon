const TONES = {
  neutral: "bg-subtle text-ink",
  accent: "bg-accent-soft text-accent",
  danger: "bg-danger-soft text-danger",
  "danger-solid": "bg-danger text-on-fill",
  warning: "bg-warning-soft text-warning",
  caution: "bg-caution-soft text-caution",
  highlight: "bg-highlight text-on-highlight",
};

const Badge = ({ tone = "neutral", className = "", children }) => (
  <span
    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${TONES[tone]} ${className}`}
  >
    {children}
  </span>
);

export default Badge;
