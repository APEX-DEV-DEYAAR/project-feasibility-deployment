import { useState } from "react";
import ProgressBar from "./ProgressBar";
import type { ClientModel } from "../types";
import { DEYAAR_COLORS } from "../constants";

interface InputWizardProps {
  model: ClientModel;
  onInputChange: (key: string, value: string) => void;
  onPartnerChange: (index: number, key: string, value: string) => void;
  onAddPartner: () => void;
  onRemovePartner: (index: number) => void;
  onSetProjectName: (name: string) => void;
  shareTotal: number;
  shareValid: boolean;
  isFrozen: boolean;
  isMobile: boolean;
}

const INPUT_STEPS = [
  { id: "project", label: "Project", icon: "📋" },
  { id: "land", label: "Land & Area", icon: "🏗️" },
  { id: "revenue", label: "Revenue", icon: "💰" },
  { id: "costs", label: "Costs", icon: "📊" },
  { id: "partners", label: "JV Partners", icon: "🤝" },
];

export default function InputWizard({
  model,
  onInputChange,
  onPartnerChange,
  onAddPartner,
  onRemovePartner,
  onSetProjectName,
  shareTotal,
  shareValid,
  isFrozen,
  isMobile,
}: InputWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <ProjectStep model={model} onSetProjectName={onSetProjectName} isFrozen={isFrozen} />;
      case 1:
        return <LandAreaStep model={model} onInputChange={onInputChange} isFrozen={isFrozen} />;
      case 2:
        return <RevenueStep model={model} onInputChange={onInputChange} isFrozen={isFrozen} />;
      case 3:
        return <CostsStep model={model} onInputChange={onInputChange} isFrozen={isFrozen} />;
      case 4:
        return (
          <PartnersStep
            model={model}
            onPartnerChange={onPartnerChange}
            onAddPartner={onAddPartner}
            onRemovePartner={onRemovePartner}
            shareTotal={shareTotal}
            shareValid={shareValid}
            isFrozen={isFrozen}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="input-wizard">
      <ProgressBar
        steps={INPUT_STEPS}
        currentStep={currentStep}
        onStepClick={setCurrentStep}
        isMobile={isMobile}
      />
      
      <div className="wizard-content">
        <div className="wizard-step-header">
          <h3>{INPUT_STEPS[currentStep]?.label}</h3>
          <p>Step {currentStep + 1} of {INPUT_STEPS.length}</p>
        </div>
        
        <div className="wizard-step-content">
          {renderStepContent()}
        </div>
        
        {!isFrozen && (
          <div className="wizard-navigation">
            <button
              className="btn btn-secondary"
              onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
              disabled={currentStep === 0}
            >
              ← Previous
            </button>
            
            <div className="step-dots">
              {INPUT_STEPS.map((_, idx) => (
                <span
                  key={idx}
                  className={`step-dot ${idx === currentStep ? "active" : ""} ${idx < currentStep ? "completed" : ""}`}
                />
              ))}
            </div>
            
            <button
              className="btn btn-primary"
              onClick={() => setCurrentStep((prev) => Math.min(INPUT_STEPS.length - 1, prev + 1))}
              disabled={currentStep === INPUT_STEPS.length - 1}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Step Components

function ProjectStep({ model, onSetProjectName, isFrozen }: { model: ClientModel; onSetProjectName: (name: string) => void; isFrozen: boolean }) {
  return (
    <div className="wizard-step">
      <div className="step-intro">
        <h4>Project Information</h4>
        <p>Enter the basic details for your development project.</p>
      </div>
      
      <div className="form-group">
        <label htmlFor="projectName">Project Name *</label>
        <input
          id="projectName"
          type="text"
          value={model.projectName}
          onChange={(e) => onSetProjectName(e.target.value)}
          disabled={isFrozen}
          placeholder="e.g., Deyaar Residence Tower A"
        />
        <span className="field-hint">A unique name to identify this project</span>
      </div>
      
      <div className="quick-stats">
        <div className="quick-stat-item">
          <span className="stat-label">Status</span>
          <span className={`stat-value ${model.status}`}>{model.status || "Draft"}</span>
        </div>
        {model.version && (
          <div className="quick-stat-item">
            <span className="stat-label">Version</span>
            <span className="stat-value">v{model.version}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function LandAreaStep({ model, onInputChange, isFrozen }: { model: ClientModel; onInputChange: (key: string, value: string) => void; isFrozen: boolean }) {
  const fields = [
    { key: "landArea", label: "Land Area", unit: "sq ft", hint: "Total land area of the plot" },
    { key: "gfa", label: "GFA Proposed", unit: "sq ft", hint: "Gross Floor Area allowed" },
    { key: "nsaResi", label: "NSA - Residential", unit: "sq ft", hint: "Net Saleable Area for residential units" },
    { key: "nsaRetail", label: "NSA - Retail", unit: "sq ft", hint: "Net Saleable Area for retail units" },
    { key: "buaResi", label: "BUA - Residential", unit: "sq ft", hint: "Built Up Area for residential" },
    { key: "buaRetail", label: "BUA - Retail", unit: "sq ft", hint: "Built Up Area for retail" },
    { key: "unitsResi", label: "Units - Residential", unit: "units", hint: "Number of residential units" },
    { key: "unitsRetail", label: "Units - Retail", unit: "units", hint: "Number of retail units" },
  ];

  return (
    <div className="wizard-step">
      <div className="step-intro">
        <h4>Land & Area Metrics</h4>
        <p>Define the physical characteristics of your development.</p>
      </div>
      
      <div className="form-grid">
        {fields.map((field) => (
          <div key={field.key} className="form-group">
            <label htmlFor={field.key}>{field.label}</label>
            <div className="input-with-unit">
              <input
                id={field.key}
                type="number"
                value={model.input[field.key]}
                onChange={(e) => onInputChange(field.key, e.target.value)}
                disabled={isFrozen}
                placeholder="0"
              />
              <span className="unit">{field.unit}</span>
            </div>
            <span className="field-hint">{field.hint}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RevenueStep({ model, onInputChange, isFrozen }: { model: ClientModel; onInputChange: (key: string, value: string) => void; isFrozen: boolean }) {
  const fields = [
    { key: "resiPsf", label: "Residential Price", unit: "AED/sq ft", hint: "Price per sq ft of residential NSA" },
    { key: "retailPsf", label: "Retail Income", unit: "AED/sq ft", hint: "Income per sq ft of retail NSA" },
  ];

  return (
    <div className="wizard-step">
      <div className="step-intro">
        <h4>Revenue Assumptions</h4>
        <p>Set your pricing assumptions for residential sales and retail income.</p>
      </div>
      
      <div className="form-grid">
        {fields.map((field) => (
          <div key={field.key} className="form-group">
            <label htmlFor={field.key}>{field.label}</label>
            <div className="input-with-unit">
              <span className="prefix">AED</span>
              <input
                id={field.key}
                type="number"
                value={model.input[field.key]}
                onChange={(e) => onInputChange(field.key, e.target.value)}
                disabled={isFrozen}
                placeholder="0"
              />
              <span className="unit">{field.unit}</span>
            </div>
            <span className="field-hint">{field.hint}</span>
          </div>
        ))}
      </div>
      
      <div className="revenue-preview">
        <h5>Estimated Revenue</h5>
        <div className="preview-items">
          <div className="preview-item">
            <span>Residential Revenue</span>
            <span className="preview-value">
              AED {((Number(model.input.resiPsf) || 0) * (Number(model.input.nsaResi) || 0)).toLocaleString()}
            </span>
          </div>
          <div className="preview-item">
            <span>Retail Revenue</span>
            <span className="preview-value">
              AED {((Number(model.input.retailPsf) || 0) * (Number(model.input.nsaRetail) || 0)).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CostsStep({ model, onInputChange, isFrozen }: { model: ClientModel; onInputChange: (key: string, value: string) => void; isFrozen: boolean }) {
  const constructionFields = [
    { key: "ccPsf", label: "Construction Cost", unit: "AED/sq ft", hint: "Per sq ft of BUA" },
  ];

  const percentageFields = [
    { key: "softPct", label: "Soft Costs", unit: "%", hint: "% of construction cost" },
    { key: "statPct", label: "Statutory Costs", unit: "%", hint: "% of construction cost" },
    { key: "contPct", label: "Contingency", unit: "%", hint: "% of construction cost" },
    { key: "devMgmtPct", label: "Dev. Management", unit: "%", hint: "% of total sales" },
    { key: "cofPct", label: "Cost of Funds", unit: "%", hint: "% of total revenue" },
    { key: "salesExpPct", label: "Sales Expense", unit: "%", hint: "% of total sales" },
    { key: "mktPct", label: "Marketing", unit: "%", hint: "% of total sales" },
  ];

  return (
    <div className="wizard-step">
      <div className="step-intro">
        <h4>Cost Assumptions</h4>
        <p>Define your construction costs and percentage-based expenses.</p>
      </div>
      
      <div className="cost-section">
        <h5>Construction</h5>
        <div className="form-grid">
          {constructionFields.map((field) => (
            <div key={field.key} className="form-group">
              <label htmlFor={field.key}>{field.label}</label>
              <div className="input-with-unit">
                <span className="prefix">AED</span>
                <input
                  id={field.key}
                  type="number"
                  value={model.input[field.key]}
                  onChange={(e) => onInputChange(field.key, e.target.value)}
                  disabled={isFrozen}
                  placeholder="0"
                />
                <span className="unit">{field.unit}</span>
              </div>
              <span className="field-hint">{field.hint}</span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="cost-section">
        <h5>Percentage-Based Costs</h5>
        <div className="form-grid percentages">
          {percentageFields.map((field) => (
            <div key={field.key} className="form-group">
              <label htmlFor={field.key}>{field.label}</label>
              <div className="input-with-unit">
                <input
                  id={field.key}
                  type="number"
                  step="0.1"
                  value={model.input[field.key]}
                  onChange={(e) => onInputChange(field.key, e.target.value)}
                  disabled={isFrozen}
                  placeholder="0"
                />
                <span className="unit">{field.unit}</span>
              </div>
              <span className="field-hint">{field.hint}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PartnersStep({
  model,
  onPartnerChange,
  onAddPartner,
  onRemovePartner,
  shareTotal,
  shareValid,
  isFrozen,
}: {
  model: ClientModel;
  onPartnerChange: (index: number, key: string, value: string) => void;
  onAddPartner: () => void;
  onRemovePartner: (index: number) => void;
  shareTotal: number;
  shareValid: boolean;
  isFrozen: boolean;
}) {
  const partnerColors = [
    DEYAAR_COLORS.orange,
    DEYAAR_COLORS.brown,
    DEYAAR_COLORS.terracotta,
    DEYAAR_COLORS.rust,
    "#2E7D52",
    "#2C5F8A",
  ];

  return (
    <div className="wizard-step">
      <div className="step-intro">
        <h4>JV Partners & Profit Share</h4>
        <p>Define the joint venture partners and their profit-sharing percentages.</p>
      </div>
      
      <div className="partners-list">
        {model.partners.map((partner, idx) => (
          <div key={idx} className="partner-card">
            <div className="partner-color" style={{ background: partnerColors[idx % partnerColors.length] }} />
            <div className="partner-fields">
              <div className="form-group">
                <label>Partner Name</label>
                <input
                  type="text"
                  value={partner.name}
                  onChange={(e) => onPartnerChange(idx, "name", e.target.value)}
                  disabled={isFrozen}
                  placeholder={`Partner ${idx + 1}`}
                />
              </div>
              <div className="form-group share-group">
                <label>Share %</label>
                <div className="input-with-unit">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={partner.share}
                    onChange={(e) => onPartnerChange(idx, "share", e.target.value)}
                    disabled={isFrozen}
                    placeholder="0"
                  />
                  <span className="unit">%</span>
                </div>
              </div>
            </div>
            {!isFrozen && model.partners.length > 1 && (
              <button className="btn-remove-partner" onClick={() => onRemovePartner(idx)}>
                ✕
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
      
      <div className={`share-validation ${shareValid ? "valid" : "invalid"}`}>
        <div className="share-total">
          <span>Total Share:</span>
          <span className="share-value">{shareTotal.toFixed(1)}%</span>
        </div>
        <div className="share-status">
          {shareValid ? (
            <span className="valid-text">✓ Shares total 100%</span>
          ) : (
            <span className="invalid-text">⚠ Shares must total 100%</span>
          )}
        </div>
        {!shareValid && (
          <div className="share-remaining">
            Remaining: {(100 - shareTotal).toFixed(1)}%
          </div>
        )}
      </div>
    </div>
  );
}
