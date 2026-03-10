import { FIELD_GROUPS, DEYAAR_COLORS } from "../constants";
import type { ClientModel } from "../types";

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  model: ClientModel;
  activeSection: string;
  onSectionChange: (section: string) => void;
  onInputChange: (key: string, value: string) => void;
  onPartnerChange: (index: number, key: string, value: string) => void;
  onAddPartner: () => void;
  onRemovePartner: (index: number) => void;
  onSetProjectName: (name: string) => void;
  shareTotal: number;
  shareValid: boolean;
  isFrozen: boolean;
}

export default function MobileSidebar({
  isOpen,
  onClose,
  model,
  activeSection,
  onSectionChange,
  onInputChange,
  onPartnerChange,
  onAddPartner,
  onRemovePartner,
  onSetProjectName,
  shareTotal,
  shareValid,
  isFrozen,
}: MobileSidebarProps) {
  const allSections = [
    { title: "Project", icon: "◆" },
    ...FIELD_GROUPS.map((g) => ({ title: g.title, icon: g.icon })),
    { title: "JV Partners", icon: "◊" },
  ];

  const renderSectionContent = () => {
    if (activeSection === "Project") {
      return (
        <div className="field">
          <label>Project Name</label>
          <input
            type="text"
            value={model.projectName}
            onChange={(e) => onSetProjectName(e.target.value)}
            disabled={isFrozen}
            placeholder="Enter project name"
          />
        </div>
      );
    }

    if (activeSection === "JV Partners") {
      return (
        <>
          <div className="jv-list">
            {model.partners.map((partner, idx) => (
              <div key={idx} className="jv-row">
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <div
                    className="jv-color"
                    style={{
                      background: [DEYAAR_COLORS.orange, DEYAAR_COLORS.terracotta, DEYAAR_COLORS.rust, "#2E7D52", "#2C5F8A"][idx % 5],
                    }}
                  />
                  <input
                    type="text"
                    value={partner.name}
                    onChange={(e) => onPartnerChange(idx, "name", e.target.value)}
                    placeholder="Partner name"
                    disabled={isFrozen}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={partner.share}
                    onChange={(e) => onPartnerChange(idx, "share", e.target.value)}
                    disabled={isFrozen}
                  />
                  <span style={{ fontSize: 11, color: "var(--brown-light)", fontWeight: 700 }}>
                    %
                  </span>
                </div>
                {!isFrozen && model.partners.length > 1 ? (
                  <button className="btn-remove" onClick={() => onRemovePartner(idx)}>
                    ×
                  </button>
                ) : (
                  <div />
                )}
              </div>
            ))}
          </div>
          {!isFrozen && (
            <button className="btn-add" onClick={onAddPartner}>
              + Add JV Partner
            </button>
          )}
          <div className={`jv-check ${shareValid ? "ok" : "err"}`}>
            Total: {shareTotal.toFixed(1)}% {shareValid ? "✓" : "⚠ must equal 100%"}
          </div>
        </>
      );
    }

    const group = FIELD_GROUPS.find((g) => g.title === activeSection);
    if (group) {
      return (
        <>
          {group.fields.map((field) => (
            <div key={field.key} className="field">
              <label>{field.label}</label>
              <div
                className={`input-wrap ${field.prefix ? "has-pfx" : ""} ${field.suffix ? "has-sfx" : ""}`}
              >
                {field.prefix && <span className="pfx">{field.prefix}</span>}
                {field.suffix && <span className="sfx">{field.suffix}</span>}
                <input
                  type="number"
                  value={model.input[field.key]}
                  onChange={(e) => onInputChange(field.key, e.target.value)}
                  disabled={isFrozen}
                  inputMode="decimal"
                />
              </div>
            </div>
          ))}
        </>
      );
    }

    return null;
  };

  return (
    <>
      <div className={`mobile-sidebar-overlay ${isOpen ? "active" : ""}`} onClick={onClose} />
      <div className={`mobile-sidebar ${isOpen ? "active" : ""}`}>
        <div className="mobile-sidebar-header">
          <h3>Input Sections</h3>
          <button className="mobile-sidebar-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="mobile-section-tabs">
          {allSections.map((section) => (
            <button
              key={section.title}
              className={`mobile-section-tab ${activeSection === section.title ? "active" : ""}`}
              onClick={() => onSectionChange(section.title)}
            >
              {section.icon} {section.title}
            </button>
          ))}
        </div>
        <div className="mobile-sidebar-content">
          <div className="mobile-section-content">{renderSectionContent()}</div>
        </div>
      </div>
    </>
  );
}
