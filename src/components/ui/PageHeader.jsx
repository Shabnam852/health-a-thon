// Every screen's title. There is exactly one h1 per screen, and it names the browser tab.
// The header has the same height on every screen, so what comes under it (the search box on a work
// list) sits at the same place everywhere: the title row is always one control tall with the actions
// beside the title, and on phones the subtitle keeps to one line (its full text is in the tooltip).
const PageHeader = ({ title, subtitle, actions }) => (
  <header className="space-y-1.5">
    <div className="flex items-center justify-between gap-3 min-h-control">
      <h1 className="min-w-0 font-display text-2xl sm:text-3xl font-semibold text-ink break-words">{title}</h1>
      {actions && (
        <div className="flex shrink-0 items-center justify-end gap-2 max-w-[60%] sm:max-w-none">{actions}</div>
      )}
    </div>
    {subtitle && (
      <p className="text-base text-ink-muted max-sm:truncate sm:break-words" title={subtitle}>
        {subtitle}
      </p>
    )}
  </header>
);

export default PageHeader;
