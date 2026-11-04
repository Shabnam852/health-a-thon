import Icon from "./Icon.jsx";

const TONES = {
  accent: "bg-accent-soft text-accent",
  danger: "bg-danger-soft text-danger",
  warning: "bg-warning-soft text-warning",
  caution: "bg-caution-soft text-caution",
  neutral: "bg-subtle text-ink-muted",
};

const SIZES = { sm: "w-8 h-8 rounded-[0.625rem]", md: "w-10 h-10 rounded-control", lg: "w-12 h-12 rounded-[0.875rem]" };
const ICON_SIZES = { sm: "sm", md: "md", lg: "lg" };

/** An icon on a soft tinted square: the quiet way to give a row or card its subject. */
const IconTile = ({ name, tone = "accent", size = "md", className = "" }) => (
  <span
    aria-hidden="true"
    className={`inline-flex shrink-0 items-center justify-center ${SIZES[size]} ${TONES[tone]} ${className}`}
  >
    <Icon name={name} size={ICON_SIZES[size]} />
  </span>
);

export default IconTile;
