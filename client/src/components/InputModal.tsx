import { useState } from "react";
import { PARTNER_COLORS } from "../constants";
import type { ClientModel } from "../types";

interface InputModalProps {
  model: ClientModel;
  isOpen: boolean;
  onClose: () => void;
  onInputChange: (key: string, value: string) => void;
  onPartnerChange: (index: number, key: string, value: string) => void;
  onAddPartner: () => void;
  onRemovePartner: (index: number) => void;
  onSetProjectName: (name: string) => void;
  shareTotal: number;
  shareValid: boolean;
  isFrozen: boolean;
  onSave?: () => void;
}

const SECTIONS = [
  { id: "project", label: "Project" },
  { id: "land", label: "Land & Area" },
  { id: "revenue", label: "Revenue" },
  { id: "costs", label: "Costs" },
  { id: "partners", label: "Partners" },
];

export default function InputModal({
  model,
  isOpen,
  onClose,
  onInputChange,
  onPartnerChange,
  onAddPartner,
  onRemovePartner,
  onSetProjectName,
  shareTotal,
  shareValid,
  isFrozen,
  onSave,
}: InputModalProps) {
  const [activeSection, setActiveSection] = useState("project");

  if (!isOpen) return null;

  const renderSection = () => {
    switch (activeSection) {
      case "project":
        return (
          <div className="modal-section">
            <div className="form-field">
              <label>Project Name</label>
              <input
                type="text"
                value={model.projectName}
                onChange={(e) => onSetProjectName(e.target.value)}
                disabled={isFrozen}
                placeholder="Enter project name"
                className="input-large"
              />
            </div>
          </div>
        );

      case "land":
        return (
          <div className="modal-section">
            <div className="form-row">
              <div className="form-field">
                <label>Land Area (sq ft)</label>
                <input
                  type="number"
                  value={model.input.landArea}
                  onChange={(e) => onInputChange("landArea", e.target.value)}
                  disabled={isFrozen}
                />
              </div>
              <div className="form-field">
                <label>Land Cost (AED M)</label>
                <input
                  type="number"
                  step="0.1"
                  value={model.input.landCost}
                  onChange={(e) => onInputChange("landCost", e.target.value)}
                  disabled={isFrozen}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-field">
                <label>Land Cost (AED psf of GFA)</label>
                <input
                  type="number"
                  step="0.1"
                  value={model.input.landPsf}
                  onChange={(e) => onInputChange("landPsf", e.target.value)}
                  disabled={isFrozen}
                  placeholder="Overrides Land Cost if set"
                />
              </div>
              <div className="form-field">
                <label>GFA (sq ft)</label>
                <input
                  type="number"
                  value={model.input.gfa}
                  onChange={(e) => onInputChange("gfa", e.target.value)}
                  disabled={isFrozen}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-field">
                <label>NSA Residential (sq ft)</label>
                <input
                  type="number"
                  value={model.input.nsaResi}
                  onChange={(e) => onInputChange("nsaResi", e.target.value)}
                  disabled={isFrozen}
                />
              </div>
              <div className="form-field">
                <label>NSA Retail (sq ft)</label>
                <input
                  type="number"
                  value={model.input.nsaRetail}
                  onChange={(e) => onInputChange("nsaRetail", e.target.value)}
                  disabled={isFrozen}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-field">
                <label>BUA Residential (sq ft)</label>
                <input
                  type="number"
                  value={model.input.buaResi}
                  onChange={(e) => onInputChange("buaResi", e.target.value)}
                  disabled={isFrozen}
                />
              </div>
              <div className="form-field">
                <label>BUA Retail (sq ft)</label>
                <input
                  type="number"
                  value={model.input.buaRetail}
                  onChange={(e) => onInputChange("buaRetail", e.target.value)}
                  disabled={isFrozen}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-field">
                <label>Units Residential</label>
                <input
                  type="number"
                  value={model.input.unitsResi}
                  onChange={(e) => onInputChange("unitsResi", e.target.value)}
                  disabled={isFrozen}
                />
              </div>
              <div className="form-field">
                <label>Units Retail</label>
                <input
                  type="number"
                  value={model.input.unitsRetail}
                  onChange={(e) => onInputChange("unitsRetail", e.target.value)}
                  disabled={isFrozen}
                />
              </div>
            </div>
          </div>
        );

      case "revenue":
        return (
          <div className="modal-section">
            <div className="form-row">
              <div className="form-field">
                <label>Residential Price (AED/sq ft)</label>
                <input
                  type="number"
                  value={model.input.resiPsf}
                  onChange={(e) => onInputChange("resiPsf", e.target.value)}
                  disabled={isFrozen}
                />
              </div>
              <div className="form-field">
                <label>Retail Income (AED/sq ft)</label>
                <input
                  type="number"
                  value={model.input.retailPsf}
                  onChange={(e) => onInputChange("retailPsf", e.target.value)}
                  disabled={isFrozen}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-field">
                <label>Car Parking Income (AED M)</label>
                <input
                  type="number"
                  step="0.1"
                  value={model.input.carParkIncome}
                  onChange={(e) => onInputChange("carParkIncome", e.target.value)}
                  disabled={isFrozen}
                />
              </div>
              <div className="form-field">
                <label>CoF on Sales (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={model.input.cofOnSalesPct}
                  onChange={(e) => onInputChange("cofOnSalesPct", e.target.value)}
                  disabled={isFrozen}
                />
              </div>
            </div>
          </div>
        );

      case "costs":
        return (
          <div className="modal-section">
            <div className="form-row">
              <div className="form-field">
                <label>Construction Cost (AED/sq ft BUA)</label>
                <input
                  type="number"
                  value={model.input.ccPsf}
                  onChange={(e) => onInputChange("ccPsf", e.target.value)}
                  disabled={isFrozen}
                />
              </div>
            </div>
            <h4 className="subsection-title">Cost Percentages</h4>
            <div className="form-row four-col">
              <div className="form-field">
                <label>Soft Costs (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={model.input.softPct}
                  onChange={(e) => onInputChange("softPct", e.target.value)}
                  disabled={isFrozen}
                />
              </div>
              <div className="form-field">
                <label>Statutory (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={model.input.statPct}
                  onChange={(e) => onInputChange("statPct", e.target.value)}
                  disabled={isFrozen}
                />
              </div>
              <div className="form-field">
                <label>Contingency (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={model.input.contPct}
                  onChange={(e) => onInputChange("contPct", e.target.value)}
                  disabled={isFrozen}
                />
              </div>
              <div className="form-field">
                <label>Dev. Mgmt (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={model.input.devMgmtPct}
                  onChange={(e) => onInputChange("devMgmtPct", e.target.value)}
                  disabled={isFrozen}
                />
              </div>
            </div>
            <div className="form-row three-col">
              <div className="form-field">
                <label>COF (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={model.input.cofPct}
                  onChange={(e) => onInputChange("cofPct", e.target.value)}
                  disabled={isFrozen}
                />
              </div>
              <div className="form-field">
                <label>Sales Expense (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={model.input.salesExpPct}
                  onChange={(e) => onInputChange("salesExpPct", e.target.value)}
                  disabled={isFrozen}
                />
              </div>
              <div className="form-field">
                <label>Marketing (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={model.input.mktPct}
                  onChange={(e) => onInputChange("mktPct", e.target.value)}
                  disabled={isFrozen}
                />
              </div>
            </div>
          </div>
        );

      case "partners":
        return (
          <div className="modal-section">
            <div className="partners-header-row">
              <span className="ph-label">Partner Name</span>
              <span className="ph-label">Share %</span>
            </div>
            <div className="partners-list">
              {model.partners.map((partner, idx) => (
                <div key={idx} className="partner-item">
                  <div
                    className="partner-color"
                    style={{ background: PARTNER_COLORS[idx % PARTNER_COLORS.length] }}
                  />
                  <div className="partner-field">
                    <label className="partner-label">Name</label>
                    <input
                      type="text"
                      value={partner.name}
                      onChange={(e) => onPartnerChange(idx, "name", e.target.value)}
                      disabled={isFrozen}
                      placeholder={`Partner ${idx + 1}`}
                      className="partner-name"
                    />
                  </div>
                  <div className="partner-field share">
                    <label className="partner-label">Share</label>
                    <div className="share-input-wrap">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={partner.share}
                        onChange={(e) => onPartnerChange(idx, "share", e.target.value)}
                        disabled={isFrozen}
                        placeholder="0"
                        className="partner-share"
                      />
                      <span className="share-unit">%</span>
                    </div>
                  </div>
                  {!isFrozen && model.partners.length > 1 && (
                    <button
                      className="btn-remove"
                      onClick={() => onRemovePartner(idx)}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            {!isFrozen && (
              <button className="btn-add" onClick={onAddPartner}>
                + Add Partner
              </button>
            )}
            <div className={`share-check ${shareValid ? "valid" : "invalid"}`}>
              <span>Total Share: <strong>{shareTotal.toFixed(1)}%</strong></span>
              <span>{shareValid ? "✓ Valid" : `Need ${(100 - shareTotal).toFixed(1)}%`}</span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const currentIndex = SECTIONS.findIndex((s) => s.id === activeSection);
  const isLastStep = currentIndex === SECTIONS.length - 1;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Project Assumptions</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="modal-sidebar">
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                className={`section-btn ${activeSection === section.id ? "active" : ""}`}
                onClick={() => setActiveSection(section.id)}
              >
                {section.label}
              </button>
            ))}
          </div>

          <div className="modal-form">
            {renderSection()}
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="btn-nav"
            onClick={() => setActiveSection(SECTIONS[Math.max(0, currentIndex - 1)]?.id)}
            disabled={currentIndex === 0}
          >
            ← Previous
          </button>
          <span className="page-indicator">
            {currentIndex + 1} of {SECTIONS.length}
          </span>
          {isLastStep ? (
            <button
              className="btn-nav save"
              onClick={() => {
                onSave?.();
                onClose();
              }}
              disabled={isFrozen}
            >
              ✓ Save to Database
            </button>
          ) : (
            <button
              className="btn-nav primary"
              onClick={() => setActiveSection(SECTIONS[Math.min(SECTIONS.length - 1, currentIndex + 1)]?.id)}
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
