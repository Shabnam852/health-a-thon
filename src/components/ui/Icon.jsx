const SIZES = { sm: "text-base", md: "text-xl", lg: "text-2xl", xl: "text-4xl" };

// Decorative by default: the text beside an icon, or its button's label, gives the meaning.
const Icon = ({ name, size = "md", filled = false, className = "" }) => (
  <span
    aria-hidden="true"
    className={`icon leading-none ${SIZES[size]} ${className}`}
    style={filled ? { fontVariationSettings: '"FILL" 1, "wght" 400, "GRAD" 0, "opsz" 24' } : undefined}
  >
    {name}
  </span>
);

export default Icon;
