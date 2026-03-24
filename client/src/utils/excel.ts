import type ExcelJS from "exceljs";

let excelJsPromise: Promise<typeof import("exceljs")> | null = null;

export function loadExcelJs() {
  if (!excelJsPromise) {
    excelJsPromise = import("exceljs");
  }
  return excelJsPromise;
}

export interface ExcelColumn {
  header: string;
  key: string;
  width: number;
}

export async function exportToExcel(
  data: Record<string, unknown>[],
  columns: ExcelColumn[],
  sheetName: string,
  fileName: string,
): Promise<void> {
  const ExcelJS = await loadExcelJs();
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  worksheet.columns = columns.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width,
  }));

  data.forEach((row) => worksheet.addRow(row));

  const buffer = await workbook.xlsx.writeBuffer();
  triggerDownload(buffer as ArrayBuffer, fileName);
}

export async function importFromExcel(
  file: File,
): Promise<Record<string, string>[]> {
  const ExcelJS = await loadExcelJs();
  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error("No worksheet found in Excel file");

  const headerRow = worksheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const val = cell.value;
    headers[colNumber - 1] = val === null || val === undefined ? "" : String(val).trim();
  });

  if (headers.length === 0) throw new Error("No headers found in Excel file");

  const results: Record<string, string>[] = [];
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const obj: Record<string, string> = {};
    headers.forEach((header, index) => {
      if (!header) return;
      const cell = row.getCell(index + 1);
      const val = cell.value;
      obj[header] = val === null || val === undefined ? "" : String(val);
    });
    results.push(obj);
  });

  return results;
}

function triggerDownload(buffer: ArrayBuffer, fileName: string): void {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
