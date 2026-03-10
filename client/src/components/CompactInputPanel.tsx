import { useState } from "react";
import { PARTNER_COLORS } from "../constants";
import type { ClientModel } from "../types";

interface CompactInputPanelProps {
  model: ClientModel;
  onInputChange: (key: string, value: string) => void;
  onPartnerChange: (index: number, key: string, value: string) => void;
  onAddPartner: () => void;
  onRemovePartner: (index: number) => void;
  onSetProjectName: (name: string) => void;
  shareTotal: number;
  shareValid: boolean;
  isFrozen: boolean;
}

const TABS = [
  { id: "project", label: "Project" },
  { id: "land", label: "Land & Area" },
  { id: "revenue", label: "Revenue" },
  { id: "costs", label: "Costs" },
  { id: "partners", label: "Partners" },
];

export default function CompactInputPanel({
  model,
  onInputChange,
  onPartnerChange,
  onAddPartner,
  onRemovePartner,
  onSetProjectName,
  shareTotal,
  shareValid,
  isFrozen,
}: CompactInputPanelProps) {
  const [activeTab, setActiveTab] = useState("project");
  const [isExpanded, setIsExpanded] = useState(true);

  const renderTabContent = () => {
    switch (activeTab) {
      case "project":
        return (
          <div className="input-section">
            <div className="input-field large">
              <label htmlFor="projectName">Project Name</label>
              <input
                id="projectName"
                type="text"
                value={model.projectName}
                onChange={(e) => onSetProjectName(e.target.value)}
                disabled={isFrozen}
                placeholder="Enter project name"
              />
            </div>
          </div>
        );

      case "land":
        return (
          <div className="input-section">
            <div className="input-row">
              <div className="input-field">
                <label>Land Area (sq ft)</label>
                <input
                  type="number"
                  value={model.input.landArea}
                  onChange={(e) => onInputChange("landArea", e.target.value)}
                  disabled={isFrozen}
                  placeholder="0"
                />
              </div>
              <div className="input-field">
                <label>Land Cost (AED M)</label>
                <input
                  type="number"
                  step="0.1"
                  value={model.input.landCost}
                  onChange={(e) => onInputChange("landCost", e.target.value)}
                  disabled={isFrozen}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="input-row">
              <div className="input-field">
                <label>GFA (sq ft)</label>
                <input
                  type="number"
                  value={model.input.gfa}
                  onChange={(e) => onInputChange("gfa", e.target.value)}
                  disabled={isFrozen}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="input-row">
              <div className="input-field">
                <label>NSA Residential (sq ft)</label>
                <input
                  type="number"
                  value={model.input.nsaResi}
                  onChange={(e) => onInputChange("nsaResi", e.target.value)}
                  disabled={isFrozen}
                  placeholder="0"
                />
              </div>
              <div className="input-field">
                <label>NSA Retail (sq ft)</label>
                <input
                  type="number"
                  value={model.input.nsaRetail}
                  onChange={(e) => onInputChange("nsaRetail", e.target.value)}
                  disabled={isFrozen}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="input-row">
              <div className="input-field">
                <label>BUA Residential (sq ft)</label>
                <input
                  type="number"
                  value={model.input.buaResi}
                  onChange={(e) => onInputChange("buaResi", e.target.value)}
                  disabled={isFrozen}
                  placeholder="0"
                />
              </div>
              <div className="input-field">
                <label>BUA Retail (sq ft)</label>
                <input
                  type="number"
                  value={model.input.buaRetail}
                  onChange={(e) => onInputChange("buaRetail", e.target.value)}
                  disabled={isFrozen}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="input-row">
              <div className="input-field">
                <label>Units Residential</label>
                <input
                  type="number"
                  value={model.input.unitsResi}
                  onChange={(e) => onInputChange("unitsResi", e.target.value)}
                  disabled={isFrozen}
                  placeholder="0"
                />
              </div>
              <div className="input-field">
                <label>Units Retail</label>
                <input
                  type="number"
                  value={model.input.unitsRetail}
                  onChange={(e) => onInputChange("unitsRetail", e.target.value)}
                  disabled={isFrozen}
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        );

      case "revenue":
        return (
          <div className="input-section">
            <div className="input-row">
              <div className="input-field">
                <label>Residential Price (AED/sq ft)</label>
                <input
                  type="number"
                  value={model.input.resiPsf}
                  onChange={(e) => onInputChange("resiPsf", e.target.value)}
                  disabled={isFrozen}
                  placeholder="0"
                />
              </div>
              <div className="input-field">
                <label>Retail Income (AED/sq ft)</label>
                <input
                  type="number"
                  value={model.input.retailPsf}
                  onChange={(e) => onInputChange("retailPsf", e.target.value)}
                  disabled={isFrozen}
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        );

      case "costs":
        return (
          <div className="input-section">
            <div className="input-row">
              <div className="input-field">
                <label>Construction Cost (AED/sq ft BUA)</label>
                <input
                  type="number"
                  value={model.input.ccPsf}
                  onChange={(e) => onInputChange("ccPsf", e.target.value)}
                  disabled={isFrozen}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="input-row four-col">
              <div className="input-field">
                <label>Soft Costs (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={model.input.softPct}
                  onChange={(e) => onInputChange("softPct", e.target.value)}
                  disabled={isFrozen}
                  placeholder="0"
                />
              </div>
              <div className="input-field">
                <label>Statutory (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={model.input.statPct}
                  onChange={(e) => onInputChange("statPct", e.target.value)}
                  disabled={isFrozen}
                  placeholder="0"
                />
              </div>
              <div className="input-field">
                <label>Contingency (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={model.input.contPct}
                  onChange={(e) => onInputChange("contPct", e.target.value)}
                  disabled={isFrozen}
                  placeholder="0"
                />
              </div>
              <div className="input-field">
                <label>Dev. Mgmt (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={model.input.devMgmtPct}
                  onChange={(e) => onInputChange("devMgmtPct", e.target.value)}
                  disabled={isFrozen}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="input-row four-col">
              <div className="input-field">
                <label>COF (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={model.input.cofPct}
                  onChange={(e) => onInputChange("cofPct", e.target.value)}
                  disabled={isFrozen}
                  placeholder="0"
                />
              </div>
              <div className="input-field">
                <label>Sales Expense (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={model.input.salesExpPct}
                  onChange={(e) => onInputChange("salesExpPct", e.target.value)}
                  disabled={isFrozen}
                  placeholder="0"
                />
              </div>
              <div className="input-field">
                <label>Marketing (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={model.input.mktPct}
                  onChange={(e) => onInputChange("mktPct", e.target.value)}
                  disabled={isFrozen}
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        );

      case "partners":
        return (
          <div className="input-section">
            <div className="partners-list">
              {model.partners.map((partner, idx) => (
                <div key={idx} className="partner-row">
                  <div
                    className="partner-dot"
                    style={{ background: PARTNER_COLORS[idx % PARTNER_COLORS.length] }}
                  />
                  <input
                    type="text"
                    value={partner.name}
                    onChange={(e) => onPartnerChange(idx, "name", e.target.value)}
                    disabled={isFrozen}
                    placeholder={`Partner ${idx + 1}`}
                    className="partner-name-input"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={partner.share}
                    onChange={(e) => onPartnerChange(idx, "share", e.target.value)}
                    disabled={isFrozen}
                    placeholder="0"
                    className="partner-share-input"
                  />
                  <span className="partner-unit">%</span>
                  {!isFrozen && model.partners.length > 1 && (
                    <button className="btn-remove-partner" onClick={() => onRemovePartner(idx)}>
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            {!isFrozen && (
              <button className="btn-add-partner" onClick={onAddPartner}>
                + Add Partner
              </button>
            )}
            <div className={`share-status ${shareValid ? "valid" : "invalid"}`}>
              <span>Total Share: <strong>{shareTotal.toFixed(1)}%</strong></span>
              <span>{shareValid ? "Valid" : `Need ${(100 - shareTotal).toFixed(1)}%`}</span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const currentTabIndex = TABS.findIndex((t) => t.id === activeTab);

  return (
    <div className={`compact-input-panel ${isExpanded ? "expanded" : "collapsed"}`}>
      <div className="panel-header" onClick={() => setIsExpanded(!isExpanded)}>
        <span className="panel-title">Project Inputs</span>
        <button className="panel-toggle">{isExpanded ? "−" : "+"}</button>
      </div>

      {isExpanded && (
        <div className="panel-body">
          <div className="panel-tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={`panel-tab ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="panel-content">
            {renderTabContent()}
          </div>

          <div className="panel-footer">
            <button
              className="btn-nav"
              onClick={() => setActiveTab(TABS[Math.max(0, currentTabIndex - 1)]?.id)}
              disabled={currentTabIndex === 0}
            >
              ← Previous
            </button>
            <div className="tab-indicator">
              {currentTabIndex + 1} / {TABS.length}
            </div>
            <button
              className="btn-nav primary"
              onClick={() => setActiveTab(TABS[Math.min(TABS.length - 1, currentTabIndex + 1)]?.id)}
              disabled={currentTabIndex === TABS.length - 1}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
