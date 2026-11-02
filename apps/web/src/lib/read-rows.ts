import { cellToString, parseCsv } from "@velora/core";
import { readSheet } from "read-excel-file/browser";

/** A spreadsheet's rows as text: Excel .xlsx (first sheet), or CSV / TSV / semicolon-separated text. */
export async function readRows(file: File): Promise<string[][]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xls")) throw new Error("Old .xls files aren’t supported. In Excel choose File → Save As → .xlsx or CSV, then import that.");
  if (name.endsWith(".xlsx") || file.type.includes("spreadsheetml")) {
    const rows = (await readSheet(file)) as unknown[][];
    return rows.map((r) => r.map(cellToString));
  }
  return parseCsv(await file.text());
}
