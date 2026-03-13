import { useState, useMemo } from "react";
import InputModal from "../components/InputModal";
import PrintButton from "../components/PrintButton";
import DeyaarLogo from "../components/DeyaarLogo";
import MobileSidebar from "../components/MobileSidebar";
import TRow from "../components/TRow";
import WaterfallChart from "../components/WaterfallChart";
import DonutChart from "../components/DonutChart";
import CostBreakdown from "../components/CostBreakdown";
import { PARTNER_COLORS } from "../constants";
import { formatM, formatInt } from "../utils/formatters";
import { calculateMetrics } from "../utils/calculations";
import type { ClientModel, FeasibilityMetrics, ArchivedRun } from "../types";

interface FeasibilityPageProps {
  model: ClientModel;
  metrics: FeasibilityMetrics;
  shareTotal: number;
  shareValid: boolean;
  activeSection: string;
  setActiveSection: (section: string) => void;
  loading: boolean;
  status: string;
  archive: ArchivedRun[];
  isMobile: boolean;
  sidebarOpen: boolean;
  onOpenSidebar: () => void;
  onCloseSidebar: () => void;
  onInputChange: (key: string, value: string) => void;
  onPartnerChange: (index: number, key: string, value: string) => void;
  onAddPartner: () => void;
  onRemovePartner: (index: number) => void;
  onSetProjectName: (name: string) => void;
  onBack: () => void;
  onReset: () => void;
  onSave: () => void;
  onFreeze: () => void;
  onEditFrozen: () => void;
}

export default function FeasibilityPage({
  model: currentModel,
  metrics: currentMetrics,
  shareTotal,
  shareValid,
  activeSection,
  setActiveSection,
  loading,
  status,
  archive,
  isMobile,
  sidebarOpen,
  onOpenSidebar,
  onCloseSidebar,
  onInputChange,
  onPartnerChange,
  onAddPartner,
  onRemovePartner,
  onSetProjectName,
  onBack,
  onReset,
  onSave,
  onFreeze,
  onEditFrozen,
}: FeasibilityPageProps) {
  const [showInputModal, setShowInputModal] = useState(false);
  const [viewingArchive, setViewingArchive] = useState<ArchivedRun | null>(null);

  // Build a temporary ClientModel from the archived run for metrics calculation
  const archiveModel = useMemo<ClientModel | null>(() => {
    if (!viewingArchive) return null;
    const p = viewingArchive.payload;
    return {
      runId: viewingArchive.originalRunId,
      projectId: viewingArchive.projectId,
      projectName: p.projectName,
      input: Object.fromEntries(
        Object.entries(p.input).map(([k, v]) => [k, v === null || v === undefined ? "" : String(v)])
      ),
      partners: (p.partners || []).map((pt) => ({
        name: pt.name,
        share: pt.share === null || pt.share === undefined ? "" : String(pt.share),
      })),
      version: viewingArchive.version,
      status: "frozen" as const,
    };
  }, [viewingArchive]);

  const archiveMetrics = useMemo<FeasibilityMetrics | null>(() => {
    if (!archiveModel) return null;
    return calculateMetrics(archiveModel);
  }, [archiveModel]);

  // Decide which data to display: archive view or current
  const isArchiveView = viewingArchive !== null;
  const model = archiveModel ?? currentModel;
  const metrics = archiveMetrics ?? currentMetrics;

  const isFrozen = isArchiveView ? true : model.status === "frozen";
  const versionLabel = isArchiveView
    ? `v${viewingArchive!.version} · Archived`
    : model.version
      ? `v${model.version} · ${model.status === "frozen" ? "Frozen" : "Draft"}`
      : model.runId
        ? "Draft"
        : "New";

  const totalUnits = metrics.kpis.totalUnits || 1;
  const revenuePerUnit = metrics.kpis.totalRevenue * 1000000 / totalUnits;
  const costPerUnit = metrics.kpis.totalCost * 1000000 / totalUnits;
  const profitPerUnit = metrics.kpis.netProfit * 1000000 / totalUnits;

  // NSA Split calculation
  const nsaTotal = metrics.area.nsaTotal || 1;
  const nsaRetailPct = (metrics.area.nsaRetail / nsaTotal) * 100;
  const nsaResiPct = (metrics.area.nsaResi / nsaTotal) * 100;

  return (
    <div className="app feasibility-app">
      {/* Top Navigation */}
      <header className="topbar">
        <div className="topbar-brand">
          <div className="topbar-logo">
            <DeyaarLogo size="sm" variant="beige" />
          </div>
          <div className="topbar-divider" style={{ display: isMobile ? "none" : "block" }} />
          <div className="topbar-title" style={{ display: isMobile ? "none" : "block" }}>
            {model.projectName || "Untitled"}
          </div>
          <div className={`topbar-version ${isFrozen ? "frozen" : "draft"}`}>
            {versionLabel}
          </div>
        </div>
        <div className="topbar-actions">
          <span className="topbar-tag">Feasibility</span>

          {isArchiveView ? (
            <>
              <PrintButton projectName={model.projectName} />
              <button className="btn btn-terra" onClick={() => setViewingArchive(null)}>
                <span className="btn-text-desktop">← Back to Current</span>
                <span className="btn-text-mobile">← Current</span>
              </button>
            </>
          ) : (
            <>
              {!isMobile && !isFrozen && (
                <button
                  className="btn btn-terra"
                  onClick={() => setShowInputModal(true)}
                  disabled={loading}
                >
                  <span className="btn-text-desktop">✎ Edit Assumptions</span>
                  <span className="btn-text-mobile">✎ Edit</span>
                </button>
              )}

              {isMobile && (
                <button className="mobile-menu-btn" onClick={onOpenSidebar} title="Open inputs">
                  ☰
                </button>
              )}

              <PrintButton projectName={model.projectName} />

              <button className="btn btn-ghost btn-icon" onClick={onBack} disabled={loading} title="Back">
                ←
              </button>

              {currentModel.status === "frozen" ? (
                <button className="btn btn-terra" onClick={onEditFrozen} disabled={loading}>
                  <span className="btn-text-desktop">✎ Edit</span>
                  <span className="btn-text-mobile">✎</span>
                </button>
              ) : (
                <>
                  {currentModel.runId && (
                    <button className="btn btn-freeze" onClick={onFreeze} disabled={loading}>
                      <span className="btn-text-desktop">❄ Freeze</span>
                      <span className="btn-text-mobile">❄</span>
                    </button>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </header>

      {/* Input Modal for Desktop */}
      {!isMobile && !isArchiveView && (
        <InputModal
          model={currentModel}
          isOpen={showInputModal}
          onClose={() => setShowInputModal(false)}
          onInputChange={onInputChange}
          onPartnerChange={onPartnerChange}
          onAddPartner={onAddPartner}
          onRemovePartner={onRemovePartner}
          onSetProjectName={onSetProjectName}
          shareTotal={shareTotal}
          shareValid={shareValid}
          isFrozen={currentModel.status === "frozen"}
          onSave={onSave}
        />
      )}

      {/* Mobile Sidebar */}
      {isMobile && !isArchiveView && (
        <MobileSidebar
          isOpen={sidebarOpen}
          onClose={onCloseSidebar}
          model={currentModel}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          onInputChange={onInputChange}
          onPartnerChange={onPartnerChange}
          onAddPartner={onAddPartner}
          onRemovePartner={onRemovePartner}
          onSetProjectName={onSetProjectName}
          shareTotal={shareTotal}
          shareValid={shareValid}
          isFrozen={currentModel.status === "frozen"}
        />
      )}

      {isArchiveView ? (
        <div className="frozen-banner">
          Viewing archived version v{viewingArchive!.version} · Frozen on {viewingArchive!.frozenAt
            ? new Date(viewingArchive!.frozenAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
            : "unknown date"}
        </div>
      ) : currentModel.status === "frozen" && (
        <div className="frozen-banner">
          Frozen v{currentModel.version} · Click "Edit" to create a new draft
        </div>
      )}

      <main className="main-content">
        {/* Executive Summary Header */}
        <div className="exec-header-section">
          <div className="project-title-block">
            <h1>{model.projectName || "Untitled Project"}</h1>
            <div className="project-meta-row">
              <span className={`status-badge ${isArchiveView ? "frozen" : (model.status || "draft")}`}>
                {isArchiveView ? "Archived" : (model.status || "Draft")}
              </span>
              {model.version && <span className="version-badge">v{model.version}</span>}
              <span className="date-badge">
                {isArchiveView && viewingArchive?.frozenAt
                  ? new Date(viewingArchive.frozenAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                  : new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>
          </div>
          
          {/* Key Project Stats */}
          <div className="project-quick-stats">
            <div className="quick-stat">
              <span className="qs-value">{formatInt(totalUnits)}</span>
              <span className="qs-label">Total Units</span>
            </div>
            <div className="quick-stat-divider" />
            <div className="quick-stat">
              <span className="qs-value">{formatInt(metrics.area.nsaTotal)}</span>
              <span className="qs-label">NSA (sq ft)</span>
            </div>
            <div className="quick-stat-divider" />
            <div className="quick-stat">
              <span className="qs-value">{formatM(metrics.area.efficiencyPct)}%</span>
              <span className="qs-label">Efficiency</span>
            </div>
          </div>
        </div>

        {/* PRIMARY METRICS - Development Outcome */}
        <section className="metrics-section primary-metrics">
          <div className="section-label">Development Outcome</div>
          <div className="metrics-grid four-cols">
            <div className="metric-tile primary">
              <div className="tile-icon">%</div>
              <div className="tile-content">
                <span className="tile-label">Development Margin</span>
                <span className="tile-value">{formatM(metrics.kpis.marginPct)}%</span>
                <span className="tile-sublabel">Net Profit Margin</span>
              </div>
            </div>
            
            <div className="metric-tile">
              <div className="tile-icon revenue">↓</div>
              <div className="tile-content">
                <span className="tile-label">Gross Revenue</span>
                <span className="tile-value">AED {formatM(metrics.kpis.totalRevenue)}M</span>
                <span className="tile-sublabel">AED {formatInt(revenuePerUnit)} / unit</span>
              </div>
            </div>
            
            <div className="metric-tile">
              <div className="tile-icon cost">↑</div>
              <div className="tile-content">
                <span className="tile-label">Total Cost</span>
                <span className="tile-value">AED {formatM(metrics.kpis.totalCost)}M</span>
                <span className="tile-sublabel">AED {formatInt(costPerUnit)} / unit</span>
              </div>
            </div>
            
            <div className="metric-tile profit">
              <div className="tile-icon profit">✓</div>
              <div className="tile-content">
                <span className="tile-label">Net Profit</span>
                <span className="tile-value">AED {formatM(metrics.kpis.netProfit)}M</span>
                <span className="tile-sublabel">AED {formatInt(profitPerUnit)} / unit</span>
              </div>
            </div>
          </div>
        </section>

        {/* VISUAL DASHBOARD - Charts */}
        <section className="dashboard-section">
          <div className="section-label">Visual Dashboard</div>
          <div className={`dashboard-grid${metrics.partnerProfit.length <= 1 ? " no-jv" : ""}`}>
            <div className="dashboard-card wide">
              <div className="card-header">
                <h3>Financial Waterfall</h3>
                <span>Revenue → Cost → Profit</span>
              </div>
              <div className="card-body">
                <WaterfallChart
                  revenue={metrics.kpis.totalRevenue}
                  cost={metrics.kpis.totalCost}
                  profit={metrics.kpis.netProfit}
                />
              </div>
            </div>
            
            <div className="dashboard-card">
              <div className="card-header">
                <h3>Cost Structure</h3>
                <span>Breakdown by category</span>
              </div>
              <div className="card-body">
                <CostBreakdown costs={metrics.costs} />
              </div>
            </div>
            
            {metrics.partnerProfit.length > 1 && (
              <div className="dashboard-card">
                <div className="card-header">
                  <h3>JV Distribution</h3>
                  <span>Profit by partner</span>
                </div>
                <div className="card-body">
                  <DonutChart partners={model.partners} totalProfit={metrics.kpis.netProfit} />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* DETAILED FINANCIAL TABLES */}
        <section className="tables-section">
          <div className="section-header-row">
            <h2>Detailed Financial Analysis</h2>
            <span>Complete breakdown of revenue, costs, and area metrics</span>
          </div>

          {/* Revenue / Inflows */}
          <div className="data-table-block">
            <div className="table-header">
              <h4>Revenue / Inflows</h4>
              <span>Income by category</span>
            </div>
            <div className="table-container">
              <div className="tcard">
                <div className="thead thead-5">
                  <div className="th">Line Item</div>
                  <div className="th">Residential</div>
                  <div className="th">Retail</div>
                  <div className="th">Total</div>
                  <div className="th">Calculation Basis</div>
                </div>
                <TRow label="Gross Residential Sales" resi={`AED ${formatM(metrics.revenue.grossResi)}M`} retail="—" total={`AED ${formatM(metrics.revenue.grossResi)}M`} note={`AED ${model.input.resiPsf} psf × ${formatInt(metrics.area.nsaResi)} sq ft NSA`} />
                {metrics.revenue.cofOnSales > 0 && (
                  <TRow label="Less: CoF on Sales" resi={`(AED ${formatM(metrics.revenue.cofOnSales)}M)`} retail="—" total={`(AED ${formatM(metrics.revenue.cofOnSales)}M)`} note={`${model.input.cofOnSalesPct}% of Gross Resi Sales`} className="deduction" />
                )}
                {metrics.revenue.cofOnSales > 0 && (
                  <TRow label="Net Residential Sales" resi={`AED ${formatM(metrics.revenue.netResi)}M`} retail="—" total={`AED ${formatM(metrics.revenue.netResi)}M`} note="Gross Sales − CoF on Sales" className="sub" />
                )}
                <TRow label="Retail Capitalised Income" resi="—" retail={`AED ${formatM(metrics.revenue.retail)}M`} total={`AED ${formatM(metrics.revenue.retail)}M`} note={`AED ${model.input.retailPsf} psf × ${formatInt(metrics.area.nsaRetail)} sq ft NSA`} />
                {metrics.revenue.carParkIncome > 0 && (
                  <TRow label="Car Parking Income" resi="—" retail="—" total={`AED ${formatM(metrics.revenue.carParkIncome)}M`} note="Direct input" />
                )}
                <TRow label="Total Inflows" resi={`AED ${formatM(metrics.revenue.netResi)}M`} retail={`AED ${formatM(metrics.revenue.retail + metrics.revenue.carParkIncome)}M`} total={`AED ${formatM(metrics.revenue.totalInflows)}M`} note="Total project inflows" className="total" />
              </div>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="data-table-block">
            <div className="table-header">
              <h4>Development Costs</h4>
              <span>Expenses by category</span>
            </div>
            <div className="table-container">
              <div className="tcard">
                <div className="thead thead-5">
                  <div className="th">Cost Category</div>
                  <div className="th">Residential</div>
                  <div className="th">Retail</div>
                  <div className="th">Total</div>
                  <div className="th">Calculation Basis</div>
                </div>
                <TRow label="Land Cost" resi={`AED ${formatM(metrics.costs.landResi)}M`} retail={`AED ${formatM(metrics.costs.landRetail)}M`} total={`AED ${formatM(metrics.costs.land)}M`} note={Number(model.input.landPsf) > 0 ? `AED ${model.input.landPsf} psf × ${formatInt(metrics.area.gfa)} sq ft GFA` : "Direct land cost input"} />
                <TRow label="Hard Cost" resi={`AED ${formatM(metrics.costs.ccResi)}M`} retail={`AED ${formatM(metrics.costs.ccRetail)}M`} total={`AED ${formatM(metrics.costs.construction)}M`} note={`AED ${model.input.ccPsf} psf × BUA`} />
                <TRow label="Soft Costs" resi={`AED ${formatM(metrics.costs.softResi)}M`} retail={`AED ${formatM(metrics.costs.softRetail)}M`} total={`AED ${formatM(metrics.costs.soft)}M`} note={`${model.input.softPct}% of Hard Cost`} />
                <TRow label="Statutory Costs" resi={`AED ${formatM(metrics.costs.statResi)}M`} retail={`AED ${formatM(metrics.costs.statRetail)}M`} total={`AED ${formatM(metrics.costs.statutory)}M`} note={`${model.input.statPct}% of Hard Cost`} />
                <TRow label="Contingency" resi={`AED ${formatM(metrics.costs.contResi)}M`} retail={`AED ${formatM(metrics.costs.contRetail)}M`} total={`AED ${formatM(metrics.costs.contingency)}M`} note={`${model.input.contPct}% of CC + Soft`} />
                {metrics.costs.devMgmt > 0 && (
                  <TRow label="Development Mgmt" resi={`AED ${formatM(metrics.costs.devResi)}M`} retail={`AED ${formatM(metrics.costs.devRetail)}M`} total={`AED ${formatM(metrics.costs.devMgmt)}M`} note={`${model.input.devMgmtPct}% of Gross Resi Sales`} />
                )}
                {metrics.costs.cof > 0 && (
                  <TRow label="COF incl. Guarantee" resi={`AED ${formatM(metrics.costs.cofResi)}M`} retail={`AED ${formatM(metrics.costs.cofRetail)}M`} total={`AED ${formatM(metrics.costs.cof)}M`} note={`${model.input.cofPct}% of Total Revenue`} />
                )}
                <TRow label="Sales Expenses" resi={`AED ${formatM(metrics.costs.seResi)}M`} retail={`AED ${formatM(metrics.costs.seRetail)}M`} total={`AED ${formatM(metrics.costs.salesExpense)}M`} note={`${model.input.salesExpPct}% of Gross Resi Sales`} />
                <TRow label="Marketing" resi={`AED ${formatM(metrics.costs.mkResi)}M`} retail={`AED ${formatM(metrics.costs.mkRetail)}M`} total={`AED ${formatM(metrics.costs.marketing)}M`} note={`${model.input.mktPct}% of Gross Resi Sales`} />
                <TRow label="Total Costs" resi={`AED ${formatM(metrics.costs.costResi)}M`} retail={`AED ${formatM(metrics.costs.costRetail)}M`} total={`AED ${formatM(metrics.costs.total)}M`} note="Sum of all cost categories" className="sub" />
                <TRow label="Net Profit" resi={`AED ${formatM(metrics.profitability.npResi)}M`} retail={`AED ${formatM(metrics.profitability.npRetail)}M`} total={`AED ${formatM(metrics.profitability.netProfit)}M`} note="Total Inflows − Total Costs" className="profit" />
                <TRow label="Sales Margin" resi={`${formatM(metrics.profitability.marginResi)}%`} retail={`${formatM(metrics.profitability.marginRetail)}%`} total={`${formatM(metrics.profitability.marginPct)}%`} note="Net Profit / Revenue" />
                {metrics.profitability.cashProfit > 0 && (
                  <>
                    <TRow label="Cash Profit" resi="—" retail="—" total={`AED ${formatM(metrics.profitability.cashProfit)}M`} note="Net Profit + CoF on Sales (recovered post-handover)" className="profit" />
                    <TRow label="Cash Margin" resi="—" retail="—" total={`${formatM(metrics.profitability.cashMarginPct)}%`} note="Cash Profit / Total Revenue" />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Area Metrics */}
          <div className="data-table-block">
            <div className="table-header">
              <h4>Area Metrics</h4>
              <span>Physical development parameters</span>
            </div>
            <div className="table-container">
              <div className="tcard">
                <div className="thead thead-5">
                  <div className="th">Metric</div>
                  <div className="th">Residential</div>
                  <div className="th">Retail</div>
                  <div className="th">Total</div>
                  <div className="th">Description</div>
                </div>
                <TRow label="Land Area" resi="—" retail="—" total={`${formatInt(metrics.area.landArea)} sq ft`} note="Total site land area" />
                <TRow label="Gross Floor Area (GFA)" resi="—" retail="—" total={`${formatInt(metrics.area.gfa)} sq ft`} note="Proposed buildable area" />
                <TRow label="Net Saleable Area (NSA)" resi={`${formatInt(metrics.area.nsaResi)} sq ft`} retail={`${formatInt(metrics.area.nsaRetail)} sq ft`} total={`${formatInt(metrics.area.nsaTotal)} sq ft`} note="Sellable space to customers" />
                <TRow label="Built Up Area (BUA)" resi={`${formatInt(metrics.area.buaResi)} sq ft`} retail={`${formatInt(metrics.area.buaRetail)} sq ft`} total={`${formatInt(metrics.area.buaTotal)} sq ft`} note="Total construction area" />
                <TRow label="Number of Units" resi={`${formatInt(metrics.area.unitsResi)} units`} retail={`${formatInt(metrics.area.unitsRetail)} units`} total={`${formatInt(metrics.area.unitsTotal)} units`} note="Total residential & retail units" />
                <TRow label="Efficiency Ratio" resi="—" retail="—" total={`${formatM(metrics.area.efficiencyPct)}%`} note="NSA divided by BUA" className="sub" />
                <TRow label="NSA Split" resi={`${formatM(nsaResiPct)}%`} retail={`${formatM(nsaRetailPct)}%`} total="100%" note="Retail to Residential area split" className="split" />
              </div>
            </div>
          </div>
        </section>

        {/* JOINT VENTURE SECTION - only show when multiple partners */}
        {metrics.partnerProfit.length > 1 && (
          <section className="jv-section">
            <div className="section-header-row">
              <h2>Joint Venture Structure</h2>
              <span>Partner profit distribution</span>
            </div>

            {/* JV Summary */}
            <div className="jv-summary-bar">
              <div className="jv-sum-item">
                <span className="jv-sum-label">Partners</span>
                <span className="jv-sum-value">{model.partners.length}</span>
              </div>
              <div className="jv-sum-divider" />
              <div className="jv-sum-item">
                <span className="jv-sum-label">Total Profit</span>
                <span className="jv-sum-value profit">AED {formatM(metrics.kpis.netProfit)}M</span>
              </div>
              <div className="jv-sum-divider" />
              <div className="jv-sum-item">
                <span className="jv-sum-label">Share Total</span>
                <span className={`jv-sum-value ${shareValid ? 'valid' : 'invalid'}`}>
                  {shareValid ? '✓ 100%' : `⚠ ${shareTotal.toFixed(1)}%`}
                </span>
              </div>
            </div>

            {/* JV Partners Table */}
            <div className="data-table-block">
              <div className="table-header">
                <h4>Partner Allocation</h4>
                <span>Profit share by partner</span>
              </div>
              <div className="table-container">
                <div className="tcard">
                  <div className="thead thead-5">
                    <div className="th">Partner</div>
                    <div className="th">Share %</div>
                    <div className="th">Profit (AED)</div>
                    <div className="th">% of Total Profit</div>
                    <div className="th">Status</div>
                  </div>
                  {metrics.partnerProfit.map((p, i) => {
                    const color = PARTNER_COLORS[i % PARTNER_COLORS.length];
                    const profitPct = metrics.kpis.netProfit > 0 
                      ? (p.profitShare / metrics.kpis.netProfit) * 100 
                      : 0;
                    return (
                      <div key={i} className="trow trow-5">
                        <div className="td" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span 
                            className="partner-color-dot" 
                            style={{ backgroundColor: color, width: '10px', height: '10px', borderRadius: '50%' }}
                          />
                          <strong>{p.name || `Partner ${i + 1}`}</strong>
                        </div>
                        <div className="td" style={{ color, fontWeight: 600 }}>{formatM(p.share)}%</div>
                        <div className="td">AED {formatM(p.profitShare)}M</div>
                        <div className="td">{formatM(profitPct)}%</div>
                        <div className="td">
                          <div className="partner-bar-bg">
                            <div 
                              className="partner-bar-fill" 
                              style={{ width: `${p.share}%`, backgroundColor: color }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* JV Visual Distribution */}
            <div className="jv-visual-block">
              <div className="jv-visual-title">Profit Share Distribution</div>
              <div className="jv-stacked-bar">
                {metrics.partnerProfit.map((p, i) => {
                  const color = PARTNER_COLORS[i % PARTNER_COLORS.length];
                  return (
                    <div
                      key={i}
                      className="jv-bar-segment"
                      style={{ width: `${p.share}%`, backgroundColor: color }}
                      title={`${p.name || `Partner ${i+1}`}: ${formatM(p.share)}%`}
                    >
                      {p.share > 15 && <span>{formatM(p.share)}%</span>}
                    </div>
                  );
                })}
              </div>
              <div className="jv-legend">
                {metrics.partnerProfit.map((p, i) => {
                  const color = PARTNER_COLORS[i % PARTNER_COLORS.length];
                  return (
                    <div key={i} className="jv-legend-item">
                      <span className="jv-legend-dot" style={{ backgroundColor: color }} />
                      <span className="jv-legend-name">{p.name || `Partner ${i+1}`}</span>
                      <span className="jv-legend-pct">{formatM(p.share)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* VERSION HISTORY */}
        {archive.length > 0 && !isArchiveView && (
          <section className="archive-section">
            <div className="section-header-row">
              <h2>Version History</h2>
              <span>Click a version to view its full details</span>
            </div>
            <div className="table-container">
              <div className="tcard">
                <div className="thead thead-archive">
                  <div className="th">Version</div>
                  <div className="th">Revenue</div>
                  <div className="th">Cost</div>
                  <div className="th">Profit</div>
                  <div className="th">Margin</div>
                  <div className="th">Frozen Date</div>
                </div>
                {archive.map((a) => (
                  <div
                    key={a.id}
                    className="trow trow-archive"
                    style={{ cursor: "pointer" }}
                    onClick={() => setViewingArchive(a)}
                    title={`View v${a.version} details`}
                  >
                    <div className="td"><strong>v{a.version}</strong></div>
                    <div className="td">AED {formatM(a.metrics.kpis.totalRevenue)}M</div>
                    <div className="td">AED {formatM(a.metrics.kpis.totalCost)}M</div>
                    <div className="td">AED {formatM(a.metrics.kpis.netProfit)}M</div>
                    <div className="td">{formatM(a.metrics.kpis.marginPct)}%</div>
                    <div className="td">
                      {a.frozenAt
                        ? new Date(a.frozenAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : "—"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="status-bar">
        <div className="status-left">
          <span className="status-dot" />
          <span>{status}</span>
        </div>
        <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </footer>
    </div>
  );
}
