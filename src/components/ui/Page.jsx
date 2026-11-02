const WIDTHS = { sm: "max-w-2xl", md: "max-w-3xl", lg: "max-w-5xl" };

// The content column of a screen, so width, gutters and rhythm match everywhere.
const Page = ({ width = "lg", className = "", children }) => (
  <div
    className={`w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6 ${WIDTHS[width]} ${className}`}
  >
    {children}
  </div>
);

export default Page;
