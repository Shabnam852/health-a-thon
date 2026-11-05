import React from "react";

const VARIANTS = {
  primary: "bg-accent text-on-fill hover:bg-accent-hover",
  brand: "bg-brand text-on-fill hover:bg-brand-hover",
  secondary: "bg-surface text-ink border border-line-strong/40 hover:bg-muted hover:border-line-strong/70",
  danger: "bg-danger text-on-fill hover:bg-danger-hover",
  "danger-quiet": "bg-surface text-danger border border-line-strong/40 hover:bg-danger-soft",
  ghost: "text-ink-muted hover:bg-subtle hover:text-ink",
  link: "text-accent hover:underline",
  // Used by FilterTabs: aria-pressed draws the selected underline.
  tab: "rounded-none border-b-2 border-transparent text-ink-muted hover:text-ink aria-pressed:border-accent aria-pressed:text-ink",
};

const SIZES = {
  sm: "min-h-control-sm px-4 text-sm",
  md: "min-h-control px-5 text-sm",
  icon: "min-h-control min-w-control",
  // No side padding, so the label lines up with the text around it.
  flush: "min-h-control-sm text-sm",
};

/**
 * The one button style. Render as a link with as={Link} to="..." or as="a" href="...".
 * Stays a real <button type="button"> by default so it never submits a form by accident.
 */
const Button = React.forwardRef(
  (
    {
      as: Component = "button",
      variant = "secondary",
      size = "md",
      fullWidth = false,
      wrap = false,
      className = "",
      ...props
    },
    ref,
  ) => (
    <Component
      ref={ref}
      {...(Component === "button" && { type: "button" })}
      {...props}
      className={`inline-flex items-center justify-center gap-2 ${variant === "tab" || size === "flush" ? "rounded-control" : "rounded-pill"} font-semibold disabled:opacity-50 disabled:pointer-events-none ${VARIANTS[variant]} ${SIZES[size]} ${fullWidth ? "w-full" : ""} ${wrap ? "text-center" : "whitespace-nowrap"} ${className}`}
    />
  ),
);

Button.displayName = "Button";

export default Button;
