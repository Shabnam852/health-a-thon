// One labelled line in a row's expanded details.
const DetailRow = ({ label, children }) => (
  <p className="break-words">
    <span className="font-semibold text-ink">{label}: </span>
    {children}
  </p>
);

export default DetailRow;
