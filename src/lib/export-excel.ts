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
 */
export async function exportToExcel<T>({
  filename,
  sheetName = "Sheet1",
  data,
  columns,
}: ExportToExcelOptions<T>): Promise<void> {
  const XLSX = await import("xlsx");

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
