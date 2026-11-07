const WIDTHS = { sm: "max-w-2xl", md: "max-w-3xl", lg: "max-w-5xl", full: "max-w-none" };

// The content column of a screen, so width, gutters and rhythm match everywhere.
const Page = ({ width = "lg", className = "", lang, children }) => (
  <div
    lang={lang}
    className={`w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-5 sm:space-y-8 ${WIDTHS[width]} ${className}`}
  >
    {children}
  </div>
);

export default Page;
