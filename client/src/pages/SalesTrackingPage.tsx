import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import DeyaarLogo from "../components/DeyaarLogo";
import {
  fetchMonthlySales,
  bulkSaveMonthlySales,
  clearProjectSales,
} from "../api/cost-tracking.api";
import type {
  ProjectSummary,
  MonthlySalesRow,
  SaveMonthlySalesPayload,
} from "../types";
import { formatNumber } from "../utils/formatters";
import { loadExcelJs, exportToExcel as excelExport, importFromExcel } from "../utils/excel";

interface SalesTrackingPageProps {
  projects: ProjectSummary[];
  onBack: () => void;
  onLogout?: () => void;
  onRefresh?: () => void;
  onNavigateToSales?: () => void;
}

const MONTH_NAMES_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function toAmount(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function SalesTrackingPage({ projects, onBack, onLogout, onRefresh, onNavigateToSales }: SalesTrackingPageProps) {
  const currentYear = new Date().getFullYear();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [salesData, setSalesData] = useState<MonthlySalesRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  type EditedCell = { actualAmount: number | null; projectedAmount: number | null };
  const [editedCells, setEditedCells] = useState<Map<string, EditedCell>>(new Map());

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId),
    [projects, selectedProjectId]
  );

  const cellKey = (year: number, month: number) => `${year}-${month}`;

  useEffect(() => {
    loadExcelJs();
  }, []);

  const loadData = useCallback(async (projectId = selectedProjectId) => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMonthlySales(projectId);
      if (data.length === 0) {
        // Generate empty 12-month grid for current year
        const emptyGrid: MonthlySalesRow[] = Array.from({ length: 12 }, (_, i) => ({
          year: currentYear,
          month: i + 1,
          monthName: MONTH_NAMES_FULL[i],
          budgetAmount: null,
          actualAmount: null,
          projectedAmount: null,
          notes: null,
        }));
        setSalesData(emptyGrid);
      } else {
        setSalesData(data);
      }
      setEditedCells(new Map());
    } catch {
      setError("Failed to load sales data");
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId, currentYear]);

  useEffect(() => {
    if (selectedProjectId) loadData();
  }, [selectedProjectId]);

  const handleCellChange = useCallback(
    (year: number, month: number, field: "actualAmount" | "projectedAmount", value: string) => {
      const parsedValue = value === "" ? 0 : parseFloat(value);
      const numValue = Number.isFinite(parsedValue) ? parsedValue : 0;
      const key = cellKey(year, month);

      setEditedCells((prev) => {
        const existing = prev.get(key);
        const row = salesData.find((r) => r.year === year && r.month === month);
        const newMap = new Map(prev);
        newMap.set(key, {
          actualAmount: field === "actualAmount" ? numValue : (existing?.actualAmount ?? row?.actualAmount ?? null),
          projectedAmount: field === "projectedAmount" ? numValue : (existing?.projectedAmount ?? row?.projectedAmount ?? null),
        });
        return newMap;
      });
    },
    [salesData]
  );

  const handleSave = async () => {
    if (!selectedProjectId) return;

    const payloads: SaveMonthlySalesPayload[] = [];
    const savedYears = new Set<number>();

    salesData.forEach((row) => {
      const key = cellKey(row.year, row.month);
      const edited = editedCells.get(key);
      const actual = edited?.actualAmount ?? row.actualAmount;
      const projected = edited?.projectedAmount ?? row.projectedAmount;
      if (actual !== null || projected !== null) {
        savedYears.add(row.year);
        payloads.push({
          projectId: selectedProjectId,
          year: row.year,
          month: row.month,
          actualAmount: actual,
          projectedAmount: projected,
          createdBy: "Sales Tracking",
        });
      }
    });

    if (payloads.length === 0) {
      setError("No data to save");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await bulkSaveMonthlySales(payloads);
      await loadData();
      const yearsStr = [...savedYears].sort().join(", ");
      setSuccessMessage(`Saved ${payloads.length} rows for years: ${yearsStr}`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch {
      setError("Failed to save sales data");
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!selectedProjectId || !selectedProject) return;
    if (!confirm(`This will delete all sales tracking data for "${selectedProject.name}". Continue?`)) return;
    setLoading(true);
    setError(null);
    try {
      const result = await clearProjectSales(selectedProjectId);
      setEditedCells(new Map());
      await loadData();
      setSuccessMessage(result.message);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch {
      setError("Failed to clear data");
    } finally {
      setLoading(false);
    }
  };

  const exportToExcelFile = (data: Record<string, unknown>[], fileName: string) => {
    excelExport(data, [
      { header: "Year", key: "Year", width: 8 },
      { header: "Month", key: "Month", width: 14 },
      { header: "MonthNum", key: "MonthNum", width: 10 },
      { header: "ActualSalesTSV", key: "ActualSalesTSV", width: 18 },
      { header: "ProjectedSales", key: "ProjectedSales", width: 18 },
    ], "Sales Data", fileName).catch(() => {
      setError("Failed to export Excel file");
    });
  };

  const handleDownloadExcel = () => {
    if (!selectedProject || salesData.length === 0) return;

    const excelData = salesData.map((row) => {
      const key = cellKey(row.year, row.month);
      const edited = editedCells.get(key);
      return {
        Year: row.year,
        Month: row.monthName,
        MonthNum: row.month,
        ActualSalesTSV: edited?.actualAmount ?? row.actualAmount ?? "",
        ProjectedSales: edited?.projectedAmount ?? row.projectedAmount ?? "",
      };
    });

    exportToExcelFile(
      excelData,
      `${selectedProject.name.replace(/\s+/g, "_")}_sales_tracking_all_years.xlsx`
    );
    setSuccessMessage("Excel file downloaded successfully");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleDownloadTemplate = () => {
    if (!selectedProject) return;

    const excelData = Array.from({ length: 12 }, (_, index) => ({
      Year: currentYear,
      Month: MONTH_NAMES_FULL[index],
      MonthNum: index + 1,
      ActualSalesTSV: "",
      ProjectedSales: 0,
    }));

    exportToExcelFile(excelData, `sales_tracking_template_${currentYear}.xlsx`);
    setSuccessMessage("Template downloaded. Fill in the data and upload.");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProjectId) return;

    setLoading(true);
    setError(null);
    try {
      const jsonData = await importFromExcel(file);

      if (jsonData.length === 0) {
        throw new Error("No data found in Excel file");
      }

      const importPayloads: SaveMonthlySalesPayload[] = [];
      const importedYears = new Set<number>();

      const parseVal = (row: Record<string, unknown>, key: string) => {
        const raw = row[key];
        if (raw === undefined || raw === "" || raw === null) return 0;
        const parsed = parseFloat(String(raw).replace(/,/g, ""));
        return !Number.isNaN(parsed) ? parsed : 0;
      };

      jsonData.forEach((row) => {
        const rowYear = row.Year !== undefined ? parseInt(String(row.Year), 10) : currentYear;
        if (Number.isNaN(rowYear) || rowYear < 2000 || rowYear > 2100) return;

        let month: number | undefined;
        if (row.MonthNum !== undefined) {
          month = parseInt(String(row.MonthNum), 10);
        } else if (row.Month !== undefined) {
          const monthStr = String(row.Month).trim();
          month = MONTH_NAMES_FULL.indexOf(monthStr) + 1;
          if (month === 0) month = MONTH_NAMES.indexOf(monthStr) + 1;
        }

        if (!month || Number.isNaN(month) || month < 1 || month > 12) return;

        importedYears.add(rowYear);
        importPayloads.push({
          projectId: selectedProjectId,
          year: rowYear,
          month,
          actualAmount: parseVal(row, "ActualSalesTSV"),
          projectedAmount: parseVal(row, "ProjectedSales"),
          notes: "Imported from Excel",
          createdBy: "Sales Tracking",
        });
      });

      if (importPayloads.length === 0) {
        throw new Error("No valid data found. Check column names match the template.");
      }

      await bulkSaveMonthlySales(importPayloads);
      setEditedCells(new Map());
      await loadData(selectedProjectId);
      setSuccessMessage(
        `Uploaded and saved ${importPayloads.length} rows for years: ${[...importedYears].sort().join(", ")}. Existing values were overridden.`
      );
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import Excel file");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const hasUnsavedChanges = editedCells.size > 0;

  const totals = useMemo(() => {
    let totalActual = 0;
    let totalProjected = 0;
    salesData.forEach((row) => {
      const key = cellKey(row.year, row.month);
      const edited = editedCells.get(key);
      totalActual += toAmount(edited?.actualAmount ?? row.actualAmount);
      totalProjected += toAmount(edited?.projectedAmount ?? row.projectedAmount);
    });
    return { totalActual, totalProjected };
  }, [salesData, editedCells]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-brand">
          <div className="topbar-logo"><DeyaarLogo size="sm" variant="beige" /></div>
          <div className="topbar-divider" />
          <div className="topbar-title">Sales Performance Tracking</div>
        </div>
        <div className="topbar-actions">
          {onNavigateToSales && (
            <button className="btn btn-ghost" onClick={onNavigateToSales} title="Sales Team Cost Tracking">
              Sales Team
            </button>
          )}
          {onLogout || onRefresh ? (
            <>
              {onRefresh && (
                <button className="btn btn-ghost btn-icon" onClick={onRefresh} disabled={loading} title="Refresh">
                  <span style={{ fontSize: "16px" }}>&#x21bb;</span>
                </button>
              )}
              {onLogout && (
                <button className="btn btn-ghost" onClick={onLogout} title="Sign out" style={{ color: "#f87171" }}>
                  Sign Out
                </button>
              )}
            </>
          ) : (
            <button className="btn btn-ghost btn-back" onClick={onBack}>
              <span className="back-arrow">&larr;</span>
              <span className="back-text"> Back to Portfolio</span>
            </button>
          )}
        </div>
      </header>

      <main className="main-content commercial-team-page">
        <div className="dashboard-header">
          <div>
            <h1>Sales Performance (TSV)</h1>
            <p style={{ color: "#9ca3af", fontSize: "0.85rem", marginTop: 4 }}>
              Track actual sales (Total Sale Value) and projected future sales per month
            </p>
            <div className="dashboard-meta">
              <span className="badge brown">DEYAAR</span>
              <span className="badge beige">Sales Revenue Tracking</span>
            </div>
          </div>
        </div>

        <div className="commercial-controls">
          <div className="control-group">
            <label>Project</label>
            <select
              className="select-field"
              value={selectedProjectId || ""}
              onChange={(e) => setSelectedProjectId(e.target.value ? parseInt(e.target.value, 10) : null)}
            >
              <option value="">Select a project...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {selectedProjectId && (
          <div className="excel-actions-bar">
            <div className="excel-info">
              <span className="excel-icon">Excel</span>
              <span>Excel Import/Export</span>
            </div>
            <div className="excel-buttons">
              <button className="btn btn-excel-template" onClick={handleDownloadTemplate} disabled={loading}>
                Template
              </button>
              <button className="btn btn-excel-download" onClick={handleDownloadExcel} disabled={loading || salesData.length === 0}>
                Download
              </button>
              <button className="btn btn-excel-upload" onClick={handleUploadClick} disabled={loading}>
                Upload
              </button>
              <button className="btn btn-danger" onClick={handleClear} disabled={loading}>
                Clear Sales Data
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                onChange={handleFileSelect}
                style={{ display: "none" }}
              />
            </div>
          </div>
        )}

        {error && <div className="alert alert-error"><span>!</span> {error}</div>}
        {successMessage && <div className="alert alert-success"><span>OK</span> {successMessage}</div>}

        {!selectedProjectId ? (
          <div className="empty-state-card">
            <div className="empty-icon">&#128200;</div>
            <p>Select a project to track sales performance</p>
            <span>Enter actual TSV (units sold) and projected future sales per month</span>
          </div>
        ) : loading ? (
          <div className="loading-state">Loading data...</div>
        ) : (
          <div className="cost-entry-container">
            <div className="cost-entry-header">
              <h3>{selectedProject?.name} &mdash; Monthly Sales (TSV)</h3>
            </div>

            <div className="cost-grid-wrapper">
              <table className="cost-entry-table">
                <thead>
                  <tr>
                    <th className="year-col">Year</th>
                    <th className="month-col">Month</th>
                    <th className="category-col">
                      <div className="category-header">
                        <span className="cat-name">Actual Sales (TSV)</span>
                        <span className="cat-code">AED</span>
                      </div>
                    </th>
                    <th className="category-col">
                      <div className="category-header">
                        <span className="cat-name">Projected Sales</span>
                        <span className="cat-code">AED</span>
                      </div>
                    </th>
                    <th className="total-col">Monthly Total (AED)</th>
                  </tr>
                </thead>
                <tbody>
                  {salesData.map((row) => {
                    const key = cellKey(row.year, row.month);
                    const edited = editedCells.get(key);
                    const actualVal = toAmount(edited?.actualAmount ?? row.actualAmount);
                    const projVal = toAmount(edited?.projectedAmount ?? row.projectedAmount);
                    const hasData = actualVal > 0 || projVal > 0;
                    const isEdited = editedCells.has(key);

                    return (
                      <tr key={key} className={hasData ? "has-data" : ""}>
                        <td className="year-cell">{row.year}</td>
                        <td className="month-cell"><span className="month-name">{row.monthName}</span></td>
                        <td className={`cell actual ${isEdited ? "edited" : ""}`}>
                          <input
                            type="number"
                            className="cost-input"
                            value={actualVal}
                            onChange={(e) => handleCellChange(row.year, row.month, "actualAmount", e.target.value)}
                            placeholder="0"
                          />
                        </td>
                        <td className={`cell projected ${isEdited ? "edited" : ""}`}>
                          <input
                            type="number"
                            className="cost-input"
                            value={projVal}
                            onChange={(e) => handleCellChange(row.year, row.month, "projectedAmount", e.target.value)}
                            placeholder="0"
                          />
                        </td>
                        <td className="total-cell">
                          <div className="total-values">
                            {actualVal > 0 && <span className="actual-total">A: {formatNumber(actualVal)}</span>}
                            <span className="proj-total">P: {formatNumber(projVal)}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="total-label" colSpan={2}>Grand Total</td>
                    <td className="footer-total actual">
                      {totals.totalActual > 0 ? formatNumber(totals.totalActual) : ""}
                    </td>
                    <td className="footer-total projected">{formatNumber(totals.totalProjected)}</td>
                    <td className="grand-total">
                      <div className="total-values">
                        {totals.totalActual > 0 && <span className="actual-total">A: {formatNumber(totals.totalActual)}</span>}
                        <span className="proj-total">P: {formatNumber(totals.totalProjected)}</span>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className={`save-bar always-visible ${hasUnsavedChanges ? "has-changes" : ""}`}>
              <span className="unsaved-indicator">
                {hasUnsavedChanges
                  ? `${editedCells.size} pending change${editedCells.size !== 1 ? "s" : ""} - Click Save to store in database`
                  : "All changes saved to database"}
              </span>
              <div className="save-actions">
                {hasUnsavedChanges && (
                  <button className="btn btn-secondary" onClick={() => { setEditedCells(new Map()); loadData(); }} disabled={saving}>
                    Discard Changes
                  </button>
                )}
                <button className="btn btn-terra btn-save-large" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "SAVE TO DATABASE"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
