interface OverrideInfo {
  metricKey: string;
  isOverridden: boolean;
  justification?: string;
  originalValue?: number;
}

interface TRowProps {
  label: string;
  resi: string;
  retail: string;
  total: string;
  note: string;
  className?: string;
  overrideInfo?: OverrideInfo;
  onTotalClick?: (metricKey: string) => void;
}

export default function TRow({ label, resi, retail, total, note, className = "", overrideInfo, onTotalClick }: TRowProps) {
  const isOverridden = overrideInfo?.isOverridden ?? false;
  const isClickable = !!onTotalClick && !!overrideInfo?.metricKey;

  const handleClick = () => {
    if (isClickable && overrideInfo?.metricKey) {
      onTotalClick!(overrideInfo.metricKey);
    }
  };

  return (
    <div className={`trow trow-5 ${className}`}>
      <div className="td">{label}</div>
      <div className="td">{resi}</div>
      <div className="td">{retail}</div>
      <div
        className={`td${isOverridden ? " metric-overridden" : ""}${isClickable ? " metric-clickable" : ""}`}
        onClick={handleClick}
        title={isOverridden ? `Original: ${overrideInfo!.originalValue} | ${overrideInfo!.justification || "No justification"}` : undefined}
      >
        {isOverridden && <span className="override-indicator">&#9998; </span>}
        {total}
      </div>
      <div className="td note">{note}</div>
    </div>
  );
}
