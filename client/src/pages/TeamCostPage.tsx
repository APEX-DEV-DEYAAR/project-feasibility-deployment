import { useState, useEffect, useMemo, useCallback, useRef, Fragment } from "react";
import DeyaarLogo from "../components/DeyaarLogo";
import {
  fetchCostCategories,
  fetchMonthlyCosts,
  bulkSaveMonthlyCosts,
  clearProjectCostData,
  fetchMonthlyCollections,
  bulkSaveMonthlyCollections,
} from "../api/cost-tracking.api";
import type {
  ProjectSummary,
  CostCategory,
  MonthlyCostRow,
  MonthlyCostEntry,
  SaveMonthlyCostPayload,
  TeamCode,
  MonthlyCollectionsRow,
  SaveMonthlyCollectionsPayload,
} from "../types";
import { formatNumber } from "../utils/formatters";

interface TeamCostPageProps {
  teamCode: TeamCode;
  teamName: string;
  projects: ProjectSummary[];
  showCollections?: boolean;
  onBack: () => void;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const MONTH_NAMES_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

interface ExcelRow {
  Year: number;
  Month: string;
  MonthNum: number;
  [key: string]: string | number;
}

let xlsxModulePromise: Promise<typeof import("xlsx")> | null = null;

function loadXlsx() {
  if (!xlsxModulePromise) {
    xlsxModulePromise = import("xlsx");
  }
  return xlsxModulePromise;
}

function getEditKey(year: number, month: number, categoryId: number): string {
  return `${year}-${month}-${categoryId}`;
}

function getRevEditKey(year: number, month: number): string {
  return `rev-${year}-${month}`;
}

function toAmount(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function TeamCostPage({ teamCode, teamName, projects, showCollections = false, onBack }: TeamCostPageProps) {
  const currentYear = new Date().getFullYear();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [categories, setCategories] = useState<CostCategory[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyCostRow[]>([]);
  const [collectionsData, setCollectionsData] = useState<MonthlyCollectionsRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"entry" | "summary">("entry");
  const [showActuals, setShowActuals] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editedData, setEditedData] = useState<Map<string, MonthlyCostEntry & { year: number; month: number }>>(new Map());
  const [editedCollections, setEditedCollections] = useState<Map<string, { actualAmount: number | null; projectedAmount: number | null }>>(new Map());

  const selectedProject = useMemo(() =>
    projects.find(p => p.id === selectedProjectId),
    [projects, selectedProjectId]
  );

  useEffect(() => { loadCategories(); }, []);
  useEffect(() => { if (selectedProjectId) loadData(); }, [selectedProjectId]);

  const loadCategories = async () => {
    try {
      const cats = await fetchCostCategories(teamCode);
      setCategories(cats);
    } catch { setError("Failed to load cost categories"); }
  };

  const loadData = async (projectId = selectedProjectId) => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMonthlyCosts(projectId, undefined, teamCode);
      let costData = data;

      // If no cost categories (e.g. collections team) but showing revenue,
      // generate empty 12-month rows so the grid appears
      if (costData.length === 0 && showCollections) {
        costData = Array.from({ length: 12 }, (_, i) => ({
          year: currentYear,
          month: i + 1,
          monthName: MONTH_NAMES_FULL[i],
          categories: [],
        }));
      }

      setMonthlyData(costData);
      setEditedData(new Map());
      if (showCollections) {
        const collectionsRows = await fetchMonthlyCollections(projectId);
        setCollectionsData(collectionsRows);
        setEditedCollections(new Map());
      }
    } catch { setError("Failed to load data"); }
    finally { setLoading(false); }
  };

  const handleCellChange = useCallback((
    year: number, month: number, categoryId: number,
    field: "actualAmount" | "projectedAmount", value: string
  ) => {
    const parsedValue = value === "" ? 0 : parseFloat(value);
    const numValue = Number.isFinite(parsedValue) ? parsedValue : 0;
    const key = getEditKey(year, month, categoryId);

    setEditedData(prev => {
      const existing = prev.get(key);
      const category = categories.find(c => c.id === categoryId);
      const newData = new Map(prev);
      if (existing) {
        newData.set(key, { ...existing, [field]: numValue });
      } else {
        const monthRow = monthlyData.find(m => m.year === year && m.month === month);
        const catEntry = monthRow?.categories.find(c => c.categoryId === categoryId);
        newData.set(key, {
          year, month, categoryId,
          categoryCode: category?.code || "",
          categoryName: category?.name || "",
          actualAmount: field === "actualAmount" ? numValue : (catEntry?.actualAmount ?? null),
          projectedAmount: field === "projectedAmount" ? numValue : (catEntry?.projectedAmount ?? 0),
          budgetAmount: catEntry?.budgetAmount ?? null,
          notes: catEntry?.notes || null,
        });
      }
      return newData;
    });
  }, [categories, monthlyData]);

  const handleCollectionsCellChange = useCallback((
    year: number, month: number,
    field: "actualAmount" | "projectedAmount", value: string
  ) => {
    const parsedValue = value === "" ? 0 : parseFloat(value);
    const numValue = Number.isFinite(parsedValue) ? parsedValue : 0;
    const key = getRevEditKey(year, month);

    setEditedCollections(prev => {
      const existing = prev.get(key);
      const collectionsRow = collectionsData.find(r => r.year === year && r.month === month);
      const newData = new Map(prev);
      newData.set(key, {
        actualAmount: field === "actualAmount" ? numValue : (existing?.actualAmount ?? collectionsRow?.actualAmount ?? null),
        projectedAmount: field === "projectedAmount" ? numValue : (existing?.projectedAmount ?? collectionsRow?.projectedAmount ?? null),
      });
      return newData;
    });
  }, [collectionsData]);

  const handleSave = async () => {
    if (!selectedProjectId) return;

    const payloads: SaveMonthlyCostPayload[] = [];
    const savedYears = new Set<number>();

    displayData.forEach(row => {
      const hasAnyValue = row.categories.some(cat => {
        const key = getEditKey(row.year, row.month, cat.categoryId);
        const edited = editedData.get(key);
        const actualAmount = edited?.actualAmount !== undefined ? edited.actualAmount : cat.actualAmount;
        const projectedAmount = edited?.projectedAmount !== undefined ? edited.projectedAmount : cat.projectedAmount;
        return actualAmount !== null || projectedAmount !== null;
      });
      if (!hasAnyValue) return;

      savedYears.add(row.year);
      row.categories.forEach(cat => {
        const key = getEditKey(row.year, row.month, cat.categoryId);
        const edited = editedData.get(key);
        payloads.push({
          projectId: selectedProjectId,
          categoryId: cat.categoryId,
          year: row.year,
          month: row.month,
          actualAmount: edited?.actualAmount !== undefined ? edited.actualAmount : cat.actualAmount,
          projectedAmount: edited?.projectedAmount !== undefined ? edited.projectedAmount : cat.projectedAmount,
          notes: edited?.notes || cat.notes || undefined,
          createdBy: teamName,
        });
      });
    });

    const collectionsPayloads: SaveMonthlyCollectionsPayload[] = [];
    if (showCollections) {
      displayData.forEach(row => {
        const key = getRevEditKey(row.year, row.month);
        const edited = editedCollections.get(key);
        const collectionsRow = collectionsByYearMonth.get(`${row.year}-${row.month}`);
        const actual = edited?.actualAmount ?? collectionsRow?.actualAmount ?? null;
        const projected = edited?.projectedAmount ?? collectionsRow?.projectedAmount ?? null;
        if (actual !== null || projected !== null) {
          savedYears.add(row.year);
          collectionsPayloads.push({
            projectId: selectedProjectId,
            year: row.year,
            month: row.month,
            actualAmount: actual,
            projectedAmount: projected,
            createdBy: teamName,
          });
        }
      });
    }

    if (payloads.length === 0 && collectionsPayloads.length === 0) {
      setError("No data to save");
      return;
    }

    const rowCount = new Set([
      ...payloads.map(p => `${p.year}-${p.month}`),
      ...collectionsPayloads.map(p => `${p.year}-${p.month}`),
    ]).size;

    setSaving(true);
    setError(null);
    try {
      if (payloads.length > 0) await bulkSaveMonthlyCosts(payloads);
      if (collectionsPayloads.length > 0) await bulkSaveMonthlyCollections(collectionsPayloads);
      await loadData();
      const yearsStr = [...savedYears].sort().join(", ");
      setSuccessMessage(`Saved ${rowCount} rows for years: ${yearsStr}. Existing values were overridden.`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch { setError("Failed to save changes"); }
    finally { setSaving(false); }
  };

  const hasUnsavedChanges = editedData.size > 0 || editedCollections.size > 0;

  // ========== EXCEL FUNCTIONS ==========

  const handleDownloadExcel = () => {
    if (!selectedProject || monthlyData.length === 0) return;
    const excelData: ExcelRow[] = [];

    monthlyData.forEach(row => {
      const excelRow: ExcelRow = { Year: row.year, Month: row.monthName, MonthNum: row.month };
      categories.forEach(cat => {
        const catEntry = row.categories.find(c => c.categoryId === cat.id);
        const key = getEditKey(row.year, row.month, cat.id);
        const edited = editedData.get(key);
        excelRow[`${cat.name}_Actual`] = (edited?.actualAmount ?? catEntry?.actualAmount) ?? "";
        excelRow[`${cat.name}_Projected`] = (edited?.projectedAmount ?? catEntry?.projectedAmount) ?? "";
      });
      if (showCollections) {
        const collectionsRow = collectionsByYearMonth.get(`${row.year}-${row.month}`);
        const revKey = getRevEditKey(row.year, row.month);
        const collectionsEdited = editedCollections.get(revKey);
        excelRow["Collections_Actual"] = (collectionsEdited?.actualAmount ?? collectionsRow?.actualAmount) ?? "";
        excelRow["Collections_Projected"] = (collectionsEdited?.projectedAmount ?? collectionsRow?.projectedAmount) ?? "";
      }
      excelData.push(excelRow);
    });

    exportToExcel(excelData, `${selectedProject.name.replace(/\s+/g, "_")}_${teamCode}_All_Years.xlsx`);
    setSuccessMessage("Excel file downloaded successfully");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleDownloadTemplate = () => {
    if (!selectedProject) return;
    const excelData: ExcelRow[] = [];
    for (let month = 1; month <= 12; month++) {
      const excelRow: ExcelRow = { Year: currentYear, Month: MONTH_NAMES_FULL[month - 1], MonthNum: month };
      categories.forEach(cat => {
        excelRow[`${cat.name}_Actual`] = "";
        excelRow[`${cat.name}_Projected`] = 0;
      });
      if (showCollections) {
        excelRow["Collections_Actual"] = "";
        excelRow["Collections_Projected"] = 0;
      }
      excelData.push(excelRow);
    }
    exportToExcel(excelData, `${teamCode}_Cost_Template_${currentYear}.xlsx`);
    setSuccessMessage("Template downloaded. Fill in the data and upload.");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const exportToExcel = (data: ExcelRow[], fileName: string) => {
    loadXlsx().then((XLSX) => {
      const ws = XLSX.utils.json_to_sheet(data);
      const colWidths = [{ wch: 6 }, { wch: 12 }, { wch: 8 }];
      categories.forEach(() => { colWidths.push({ wch: 15 }, { wch: 15 }); });
      if (showCollections) colWidths.push({ wch: 15 }, { wch: 15 });
      ws['!cols'] = colWidths;
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Cost Data");
      XLSX.writeFile(wb, fileName);
    }).catch(() => {
      setError("Failed to export Excel file");
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProjectId) return;
    setLoading(true);
    setError(null);
    try {
      const XLSX = await loadXlsx();
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: undefined, raw: false });
      if (jsonData.length === 0) throw new Error("No data found in Excel file");

      const importPayloads: SaveMonthlyCostPayload[] = [];
      const importCollectionsPayloads: SaveMonthlyCollectionsPayload[] = [];
      const importedYears = new Set<number>();

      jsonData.forEach((row) => {
        const rowYear = row.Year !== undefined ? parseInt(String(row.Year), 10) : currentYear;
        if (isNaN(rowYear) || rowYear < 2000 || rowYear > 2100) return;
        let month: number | undefined;
        if (row.MonthNum !== undefined) {
          month = parseInt(String(row.MonthNum), 10);
        } else if (row.Month !== undefined) {
          const monthStr = String(row.Month).trim();
          month = MONTH_NAMES_FULL.indexOf(monthStr) + 1;
          if (month === 0) month = MONTH_NAMES.indexOf(monthStr) + 1;
        }
        if (!month || isNaN(month) || month < 1 || month > 12) return;
        importedYears.add(rowYear);

        const parseVal = (key: string) => {
          const raw = row[key];
          if (raw === undefined || raw === "" || raw === null) return 0;
          const parsed = parseFloat(String(raw).replace(/,/g, ""));
          return !isNaN(parsed) ? parsed : 0;
        };

        categories.forEach(cat => {
          importPayloads.push({
            projectId: selectedProjectId,
            categoryId: cat.id,
            year: rowYear,
            month: month!,
            actualAmount: parseVal(`${cat.name}_Actual`),
            projectedAmount: parseVal(`${cat.name}_Projected`),
            notes: "Imported from Excel",
            createdBy: teamName,
          });
        });

        if (showCollections) {
          importCollectionsPayloads.push({
            projectId: selectedProjectId,
            year: rowYear,
            month: month!,
            actualAmount: parseVal("Collections_Actual"),
            projectedAmount: parseVal("Collections_Projected"),
            notes: "Imported from Excel",
            createdBy: teamName,
          });
        }
      });

      if (importPayloads.length === 0 && importCollectionsPayloads.length === 0)
        throw new Error("No valid data found. Check column names match the template.");
      if (importPayloads.length > 0) await bulkSaveMonthlyCosts(importPayloads);
      if (importCollectionsPayloads.length > 0) await bulkSaveMonthlyCollections(importCollectionsPayloads);

      setEditedData(new Map());
      setEditedCollections(new Map());
      await loadData(selectedProjectId);
      setSuccessMessage(`Uploaded and saved ${jsonData.length} rows for years: ${[...importedYears].sort().join(", ")}. Existing values were overridden.`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import Excel file");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleUploadClick = () => { fileInputRef.current?.click(); };

  const handleClearProjectData = async () => {
    if (!selectedProjectId || !selectedProject) return;
    if (!confirm(`This will delete all ${teamName} data for "${selectedProject.name}". This action cannot be undone. Continue?`)) return;
    setLoading(true);
    setError(null);
    try {
      const result = await clearProjectCostData(selectedProjectId, teamCode);
      setEditedData(new Map());
      setEditedCollections(new Map());
      await loadData();
      setSuccessMessage(result.message);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch { setError("Failed to clear data"); }
    finally { setLoading(false); }
  };

  const displayData = useMemo(() =>
    monthlyData.map(row => ({ ...row, uniqueKey: `${row.year}-${row.month}` })),
    [monthlyData]
  );

  const collectionsByYearMonth = useMemo(() => {
    const map = new Map<string, MonthlyCollectionsRow>();
    collectionsData.forEach((row) => {
      map.set(`${row.year}-${row.month}`, row);
    });
    return map;
  }, [collectionsData]);

  const totals = useMemo(() => {
    const byYearMonth = new Map<string, { actual: number; projected: number }>();
    let grandTotalActual = 0;
    let grandTotalProjected = 0;
    let collectionsTotalActual = 0;
    let collectionsTotalProjected = 0;

    displayData.forEach(row => {
      let monthActual = 0;
      let monthProjected = 0;
      row.categories.forEach(cat => {
        const key = getEditKey(row.year, row.month, cat.categoryId);
        const edited = editedData.get(key);
        monthActual += edited?.actualAmount !== undefined ? toAmount(edited.actualAmount) : toAmount(cat.actualAmount);
        monthProjected += edited?.projectedAmount !== undefined ? toAmount(edited.projectedAmount) : toAmount(cat.projectedAmount);
      });

      if (showCollections) {
        const revKey = getRevEditKey(row.year, row.month);
        const collectionsEdited = editedCollections.get(revKey);
        const collectionsRow = collectionsByYearMonth.get(`${row.year}-${row.month}`);
        const collectionsActual =
          collectionsEdited?.actualAmount !== undefined ? toAmount(collectionsEdited.actualAmount) : toAmount(collectionsRow?.actualAmount);
        const collectionsProjected =
          collectionsEdited?.projectedAmount !== undefined ? toAmount(collectionsEdited.projectedAmount) : toAmount(collectionsRow?.projectedAmount);

        monthActual += collectionsActual;
        monthProjected += collectionsProjected;
        collectionsTotalActual += collectionsActual;
        collectionsTotalProjected += collectionsProjected;
      }

      byYearMonth.set(row.uniqueKey, { actual: monthActual, projected: monthProjected });
      grandTotalActual += monthActual;
      grandTotalProjected += monthProjected;
    });
    return { byYearMonth, grandTotalActual, grandTotalProjected, collectionsTotalActual, collectionsTotalProjected };
  }, [displayData, editedData, editedCollections, collectionsByYearMonth, showCollections]);

  const getCategoryTotals = useCallback((catId: number) => {
    let catActual = 0;
    let catProj = 0;
    displayData.forEach(row => {
      const catEntry = row.categories.find(c => c.categoryId === catId);
      if (catEntry) {
        const key = getEditKey(row.year, row.month, catId);
        const edited = editedData.get(key);
        catActual += edited?.actualAmount !== undefined ? toAmount(edited.actualAmount) : toAmount(catEntry.actualAmount);
        catProj += edited?.projectedAmount !== undefined ? toAmount(edited.projectedAmount) : toAmount(catEntry.projectedAmount);
      }
    });
    return { catActual, catProj };
  }, [displayData, editedData]);

  const renderCostTable = (readOnly: boolean) => (
    <div className="cost-grid-wrapper">
      <table className="cost-entry-table">
        <thead>
          <tr>
            <th className="year-col">Year</th>
            <th className="month-col">Month</th>
            {categories.map(cat => (
              <th key={cat.id} className="category-col" colSpan={showActuals ? 2 : 1}>
                <div className="category-header">
                  <span className="cat-name">{cat.name}</span>
                  <span className="cat-code">{cat.code}</span>
                </div>
              </th>
            ))}
            {showCollections && (
              <th className="category-col revenue-header" colSpan={showActuals ? 2 : 1}>
                <div className="category-header">
                  <span className="cat-name">Collections</span>
                  <span className="cat-code">collections</span>
                </div>
              </th>
            )}
            <th className="total-col">Monthly Total (AED)</th>
          </tr>
          {showActuals && (
            <tr className="subheader">
              <th></th>
              <th></th>
              {categories.map(cat => (
                <Fragment key={cat.id}>
                  <th className="subcol actual">Actual (AED)</th>
                  <th className="subcol projected">Proj (AED)</th>
                </Fragment>
              ))}
              {showCollections && (
                <>
                  <th className="subcol actual">Actual (AED)</th>
                  <th className="subcol projected">Proj (AED)</th>
                </>
              )}
              <th></th>
            </tr>
          )}
        </thead>
        <tbody>
          {displayData.map(row => {
            const monthTotals = totals.byYearMonth.get(row.uniqueKey) || { actual: 0, projected: 0 };
            const hasData = monthTotals.actual > 0 || monthTotals.projected > 0;
            const collectionsRow = showCollections ? collectionsByYearMonth.get(`${row.year}-${row.month}`) : null;
            const revKey = getRevEditKey(row.year, row.month);
            const collectionsEdited = editedCollections.get(revKey);

            return (
              <tr key={row.uniqueKey} className={hasData ? "has-data" : ""}>
                <td className="year-cell">{row.year}</td>
                <td className="month-cell"><span className="month-name">{row.monthName}</span></td>
                {categories.map(cat => {
                  const catEntry = row.categories.find(c => c.categoryId === cat.id);
                  const key = getEditKey(row.year, row.month, cat.id);
                  const actualValue = editedData.get(key)?.actualAmount ?? toAmount(catEntry?.actualAmount);
                  const projValue = editedData.get(key)?.projectedAmount ?? toAmount(catEntry?.projectedAmount);
                  const isEdited = editedData.has(key);
                  return (
                    <Fragment key={cat.id}>
                      {showActuals && (
                        <td className={`cell actual ${isEdited && !readOnly ? "edited" : ""}`}>
                          <input type="number" className="cost-input" value={actualValue}
                            onChange={readOnly ? undefined : (e) => handleCellChange(row.year, row.month, cat.id, "actualAmount", e.target.value)}
                            readOnly={readOnly} disabled={readOnly} placeholder="0" />
                        </td>
                      )}
                      <td className={`cell projected ${isEdited && !readOnly ? "edited" : ""}`}>
                        <input type="number" className="cost-input" value={projValue}
                          onChange={readOnly ? undefined : (e) => handleCellChange(row.year, row.month, cat.id, "projectedAmount", e.target.value)}
                          readOnly={readOnly} disabled={readOnly} />
                      </td>
                    </Fragment>
                  );
                })}
                {showCollections && (
                  <>
                    {showActuals && (
                      <td className={`cell actual ${collectionsEdited ? "edited" : ""}`}>
                        <input type="number" className="cost-input"
                          value={toAmount(collectionsEdited?.actualAmount ?? collectionsRow?.actualAmount)}
                          onChange={readOnly ? undefined : (e) => handleCollectionsCellChange(row.year, row.month, "actualAmount", e.target.value)}
                          readOnly={readOnly} disabled={readOnly} placeholder="0" />
                      </td>
                    )}
                    <td className={`cell projected ${collectionsEdited ? "edited" : ""}`}>
                      <input type="number" className="cost-input"
                        value={toAmount(collectionsEdited?.projectedAmount ?? collectionsRow?.projectedAmount)}
                        onChange={readOnly ? undefined : (e) => handleCollectionsCellChange(row.year, row.month, "projectedAmount", e.target.value)}
                        readOnly={readOnly} disabled={readOnly} />
                    </td>
                  </>
                )}
                <td className="total-cell">
                  <div className="total-values">
                    {showActuals && monthTotals.actual > 0 && <span className="actual-total">A: {formatNumber(monthTotals.actual)}</span>}
                    <span className="proj-total">P: {formatNumber(monthTotals.projected)}</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td className="total-label" colSpan={2}>Grand Total (All Years)</td>
            {categories.map(cat => {
              const { catActual, catProj } = getCategoryTotals(cat.id);
              return (
                <Fragment key={cat.id}>
                  {showActuals && <td className="footer-total actual">{catActual > 0 ? formatNumber(catActual) : ""}</td>}
                  <td className="footer-total projected">{formatNumber(catProj)}</td>
                </Fragment>
              );
            })}
            {showCollections && (
              <>
                {showActuals && (
                  <td className="footer-total actual">
                    {totals.collectionsTotalActual > 0 ? formatNumber(totals.collectionsTotalActual) : ""}
                  </td>
                )}
                <td className="footer-total projected">{formatNumber(totals.collectionsTotalProjected)}</td>
              </>
            )}
            <td className="grand-total">
              <div className="total-values">
                {showActuals && totals.grandTotalActual > 0 && <span className="actual-total">A: {formatNumber(totals.grandTotalActual)}</span>}
                <span className="proj-total">P: {formatNumber(totals.grandTotalProjected)}</span>
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-brand">
          <div className="topbar-logo"><DeyaarLogo size="sm" variant="beige" /></div>
          <div className="topbar-divider" />
          <div className="topbar-title">{teamName}</div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-ghost" onClick={onBack}>&larr; Back to Portfolio</button>
        </div>
      </header>

      <main className="main-content commercial-team-page">
        <div className="dashboard-header">
          <div>
            <h1>{showCollections && categories.length === 0 ? "Collections Tracking" : showCollections ? "Collections & Cost Tracking" : "Cost Tracking"}</h1>
            <div className="dashboard-meta">
              <span className="badge brown">DEYAAR</span>
              <span className="badge beige">{teamName} Portal</span>
            </div>
          </div>
        </div>

        <div className="commercial-controls">
          <div className="control-group">
            <label>Project</label>
            <select className="select-field" value={selectedProjectId || ""}
              onChange={(e) => setSelectedProjectId(e.target.value ? parseInt(e.target.value, 10) : null)}>
              <option value="">Select a project...</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="control-group">
            <label>View</label>
            <div className="toggle-group">
              <button className={`toggle-btn ${viewMode === "entry" ? "active" : ""}`} onClick={() => setViewMode("entry")}>Data Entry</button>
              <button className={`toggle-btn ${viewMode === "summary" ? "active" : ""}`} onClick={() => setViewMode("summary")}>Summary</button>
            </div>
          </div>
        </div>

        {selectedProjectId && (
          <div className="excel-actions-bar">
            <div className="excel-info">
              <span className="excel-icon">Excel</span>
              <span>Excel Import/Export</span>
            </div>
            <div className="excel-buttons">
              <button className="btn btn-excel-template" onClick={handleDownloadTemplate} disabled={loading}>Template</button>
              <button className="btn btn-excel-download" onClick={handleDownloadExcel} disabled={loading || monthlyData.length === 0}>Download</button>
              <button className="btn btn-excel-upload" onClick={handleUploadClick} disabled={loading}>Upload</button>
              <button className="btn btn-danger" onClick={handleClearProjectData} disabled={loading}>Clear Project Data</button>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileSelect} style={{ display: "none" }} />
            </div>
          </div>
        )}

        {error && <div className="alert alert-error"><span>!</span> {error}</div>}
        {successMessage && <div className="alert alert-success"><span>OK</span> {successMessage}</div>}

        {!selectedProjectId ? (
          <div className="empty-state-card">
            <div className="empty-icon">&#128202;</div>
            <p>Select a project to view or edit {teamName.toLowerCase()} data</p>
            <span>Choose from the project dropdown above</span>
          </div>
        ) : loading ? (
          <div className="loading-state">Loading data...</div>
        ) : monthlyData.length === 0 && !showCollections ? (
          <div className="empty-state-card">
            <div className="empty-icon">&#128203;</div>
            <p>No data found for this project</p>
            <span>Upload an Excel file or initialize the current year</span>
          </div>
        ) : viewMode === "entry" ? (
          <div className="cost-entry-container">
            <div className="cost-entry-header">
              <h3>{selectedProject?.name} &mdash; All Years</h3>
              <div className="view-toggles">
                <label className="checkbox-label">
                  <input type="checkbox" checked={showActuals} onChange={(e) => setShowActuals(e.target.checked)} />
                  Show Actuals Column
                </label>
              </div>
            </div>

            {renderCostTable(false)}

            <div className={`save-bar always-visible ${hasUnsavedChanges ? "has-changes" : ""}`}>
              <span className="unsaved-indicator">
                {hasUnsavedChanges
                  ? `${editedData.size + editedCollections.size} pending change${(editedData.size + editedCollections.size) !== 1 ? "s" : ""} - Click Save to store in database`
                  : "All changes saved to database"}
              </span>
              <div className="save-actions">
                {hasUnsavedChanges && (
                  <button className="btn btn-secondary" onClick={() => { setEditedData(new Map()); setEditedCollections(new Map()); loadData(); }} disabled={saving}>
                    Discard Changes
                  </button>
                )}
                <button className="btn btn-terra btn-save-large" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "SAVE TO DATABASE"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="cost-summary-container">
            <h3>{selectedProject?.name} &mdash; All Years Summary</h3>
            {renderCostTable(true)}
          </div>
        )}
      </main>
    </div>
  );
}
