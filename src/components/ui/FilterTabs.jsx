import Button from "./Button.jsx";

/**
 * One row of filters. On a narrow screen the row scrolls sideways rather than wrapping.
 * items: [{ id, label, count }]
 */
const FilterTabs = ({ label, items, selected, onSelect }) => (
  <div role="group" aria-label={label} className="flex gap-1 overflow-x-auto scrollbar-none border-b border-line">
    {items.map((item) => (
      <Button
        key={item.id}
        variant="tab"
        className="shrink-0"
        aria-pressed={item.id === selected}
        onClick={() => onSelect(item.id)}
      >
        {item.label}
        {item.count !== undefined && <span className="font-normal tabular-nums">{item.count}</span>}
      </Button>
    ))}
  </div>
);

export default FilterTabs;
