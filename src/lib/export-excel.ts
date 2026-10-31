export interface ExcelColumn<T> {
  header: string;
  accessor: keyof T | ((item: T, index: number) => string | number | null | undefined);
  width?: number;
  isText?: boolean;
}

export interface ExportToExcelOptions<T> {
  filename: string;
  sheetName?: string;
  data: T[];
  columns: ExcelColumn<T>[];
}

/**
 * Exports data to an Excel (.xlsx) file using the `xlsx` library with proper text formatting and column widths.
 * Supports both options object and positional arguments:
 * - exportToExcel({ filename, data, columns, sheetName })
 * - exportToExcel(data, filename, sheetName)
 */
export async function exportToExcel<T>(
  optionsOrData: ExportToExcelOptions<T> | T[],
  filenameArg?: string,
  sheetNameArg = "Sheet1"
): Promise<void> {
  const XLSX = await import("xlsx");

  let filename: string;
  let sheetName: string;
  let data: T[];
  let columns: ExcelColumn<T>[];

  if (Array.isArray(optionsOrData)) {
    data = optionsOrData;
    filename = filenameArg || "export";
    sheetName = sheetNameArg;
    if (data.length > 0 && typeof data[0] === "object" && data[0] !== null) {
      columns = Object.keys(data[0] as object).map((key) => ({
        header: key,
        accessor: key as keyof T,
        isText: true,
      }));
    } else {
      columns = [];
    }
  } else {
    filename = optionsOrData.filename;
    sheetName = optionsOrData.sheetName || "Sheet1";
    data = optionsOrData.data;
    columns = optionsOrData.columns;
  }

  const rows = data.map((item, idx) => {
    const row: Record<string, any> = {};
    columns.forEach((col) => {
      const val =
        typeof col.accessor === "function"
          ? (col.accessor as (item: T, idx: number) => any)(item, idx)
          : (item as any)[col.accessor];
      row[col.header] = val ?? "—";
    });
    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set column widths
  worksheet["!cols"] = columns.map((col) => ({
    wch: col.width || Math.max(col.header.length * 2 + 2, 14),
  }));

  // Force string format on text columns (e.g., ID numbers, phone numbers, plate numbers, codes)
  // to avoid truncation of leading zeros or automatic conversion to scientific notation in Excel.
  if (worksheet["!ref"]) {
    const range = XLSX.utils.decode_range(worksheet["!ref"]);
    columns.forEach((col, cIdx) => {
      if (col.isText) {
        for (let R = range.s.r + 1; R <= range.e.r; ++R) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: cIdx });
          const cell = worksheet[cellAddress];
          if (cell) {
            cell.t = "s";
            cell.z = "@";
          }
        }
      }
    });
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));

  const validFilename = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  XLSX.writeFile(workbook, validFilename);
}

export interface ExcelSheetDefinition<T = any> {
  sheetName: string;
  data: T[];
  columns: ExcelColumn<T>[];
}

export interface ExportMultiSheetExcelOptions {
  filename: string;
  sheets: ExcelSheetDefinition<any>[];
}

/**
 * Exports multiple datasets to distinct sheets within a single Excel (.xlsx) workbook.
 */
export async function exportMultiSheetExcel(
  options: ExportMultiSheetExcelOptions
): Promise<void> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();

  for (const sheet of options.sheets) {
    const rows = sheet.data.map((item, idx) => {
      const row: Record<string, any> = {};
      sheet.columns.forEach((col) => {
        const val =
          typeof col.accessor === "function"
            ? (col.accessor as (item: any, idx: number) => any)(item, idx)
            : (item as any)[col.accessor];
        row[col.header] = val ?? "—";
      });
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);

    worksheet["!cols"] = sheet.columns.map((col) => ({
      wch: col.width || Math.max(col.header.length * 2 + 2, 14),
    }));

    if (worksheet["!ref"]) {
      const range = XLSX.utils.decode_range(worksheet["!ref"]);
      sheet.columns.forEach((col, cIdx) => {
        if (col.isText) {
          for (let R = range.s.r + 1; R <= range.e.r; ++R) {
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: cIdx });
            const cell = worksheet[cellAddress];
            if (cell) {
              cell.t = "s";
              cell.z = "@";
            }
          }
        }
      });
    }

    const safeSheetName = sheet.sheetName.replace(/[\\/*?:[\]]/g, "_").slice(0, 31) || "Sheet";
    XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);
  }

  const validFilename = options.filename.endsWith(".xlsx") ? options.filename : `${options.filename}.xlsx`;
  XLSX.writeFile(workbook, validFilename);
}
