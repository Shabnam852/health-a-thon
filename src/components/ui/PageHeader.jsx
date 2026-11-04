// Every screen's title. There is exactly one h1 per screen, and it names the browser tab.
const PageHeader = ({ title, subtitle, actions }) => (
  <header className="flex flex-wrap items-center justify-between gap-3">
    <div className="min-w-0">
      <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink break-words">{title}</h1>
      {subtitle && <p className="text-base text-ink-muted mt-1.5">{subtitle}</p>}
    </div>
    {actions && <div className="w-full sm:w-auto flex flex-wrap items-center gap-2">{actions}</div>}
  </header>
);

export default PageHeader;
