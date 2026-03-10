interface TRowProps {
  label: string;
  resi: string;
  retail: string;
  total: string;
  note: string;
  className?: string;
}

export default function TRow({ label, resi, retail, total, note, className = "" }: TRowProps) {
  return (
    <div className={`trow trow-5 ${className}`}>
      <div className="td">{label}</div>
      <div className="td">{resi}</div>
      <div className="td">{retail}</div>
      <div className="td">{total}</div>
      <div className="td note">{note}</div>
    </div>
  );
}
