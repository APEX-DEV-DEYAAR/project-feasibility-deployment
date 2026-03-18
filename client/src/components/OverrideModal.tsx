import { useState, useEffect } from "react";
import type { MetricOverride } from "../types";

interface OverrideModalProps {
  metricKey: string;
  label: string;
  computedValue: number;
  existingOverride?: MetricOverride;
  onSave: (override: MetricOverride) => void;
  onRemove: (metricKey: string) => void;
  onClose: () => void;
}

export default function OverrideModal({
  metricKey,
  label,
  computedValue,
  existingOverride,
  onSave,
  onRemove,
  onClose,
}: OverrideModalProps) {
  const [overrideValue, setOverrideValue] = useState(
    existingOverride ? String(existingOverride.overrideValue) : String(computedValue)
  );
  const [justification, setJustification] = useState(
    existingOverride?.justification ?? ""
  );
  const trimmedJustification = justification.trim();
  const hasJustification = trimmedJustification.length > 0;

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const handleSave = () => {
    const numVal = Number(overrideValue);
    if (!Number.isFinite(numVal) || !hasJustification) return;
    onSave({
      metricKey,
      originalValue: computedValue,
      overrideValue: numVal,
      justification: trimmedJustification,
    });
  };

  const handleRemove = () => {
    onRemove(metricKey);
  };

  return (
    <div className="override-modal-backdrop" onClick={onClose}>
      <div className="override-modal" onClick={(e) => e.stopPropagation()}>
        <div className="override-modal-header">
          <h3>Override Metric</h3>
          <button className="override-modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="override-modal-body">
          <div className="override-field">
            <label>Metric</label>
            <div className="override-readonly">{label}</div>
          </div>

          <div className="override-field">
            <label>Computed Value</label>
            <div className="override-readonly computed">{computedValue}</div>
          </div>

          <div className="override-field">
            <label>Override Value</label>
            <input
              type="number"
              className="override-input"
              value={overrideValue}
              onChange={(e) => setOverrideValue(e.target.value)}
              autoFocus
            />
          </div>

          <div className="override-field">
            <label>Justification</label>
            <textarea
              className={`override-textarea${hasJustification ? "" : " is-invalid"}`}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Reason for adjustment..."
              rows={3}
            />
            {!hasJustification && (
              <div className="override-error">Justification is required.</div>
            )}
          </div>
        </div>

        <div className="override-modal-footer">
          {existingOverride && (
            <button className="btn btn-danger" onClick={handleRemove}>
              Remove Override
            </button>
          )}
          <div className="override-footer-right">
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-terra" onClick={handleSave} disabled={!hasJustification}>
              Save Override
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
