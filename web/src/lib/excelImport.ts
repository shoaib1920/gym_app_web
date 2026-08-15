import * as XLSX from "xlsx";

export interface ParsedSheet {
  headers: string[];
  rows: string[][];
}

/**
 * Reads the first sheet as a raw grid (header: 1) rather than
 * XLSX.utils.sheet_to_json's default object-per-row mode — gym spreadsheets
 * in the wild have inconsistent, sometimes duplicate or blank, header
 * names, and a raw grid lets ImportPage's column-mapping step handle that
 * instead of silently dropping columns.
 */
export async function parseSpreadsheet(file: File): Promise<ParsedSheet> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: "" });

  const [headerRow, ...dataRows] = grid;
  const headers = ((headerRow as unknown[]) ?? []).map((h, i) => {
    const label = String(h ?? "").trim();
    return label || `Column ${i + 1}`;
  });

  const rows = dataRows
    .filter((row) => (row as unknown[]).some((cell) => String(cell ?? "").trim() !== ""))
    .map((row) => headers.map((_, i) => String((row as unknown[])[i] ?? "").trim()));

  return { headers, rows };
}

export type ImportField =
  | "fullName"
  | "email"
  | "phone"
  | "joinedAt"
  | "planName"
  | "planPrice"
  | "billingInterval"
  | "nextDueDate"
  | "attendanceDates";

export type ColumnMapping = Record<ImportField, string | null>;

export const IMPORT_FIELDS: { key: ImportField; label: string; required?: boolean; hint?: string }[] = [
  { key: "fullName", label: "Full Name", required: true },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "joinedAt", label: "Join Date" },
  { key: "planName", label: "Plan Name" },
  { key: "planPrice", label: "Plan Price" },
  { key: "billingInterval", label: "Billing Interval", hint: "day / week / month / year" },
  { key: "nextDueDate", label: "Next Due / Paid-Until Date" },
  { key: "attendanceDates", label: "Attendance Dates", hint: "comma or newline separated" },
];

export function emptyMapping(): ColumnMapping {
  return {
    fullName: null,
    email: null,
    phone: null,
    joinedAt: null,
    planName: null,
    planPrice: null,
    billingInterval: null,
    nextDueDate: null,
    attendanceDates: null,
  };
}

const GUESS_PATTERNS: Record<ImportField, RegExp> = {
  fullName: /name/i,
  email: /e-?mail/i,
  phone: /phone|contact|mobile|cell/i,
  joinedAt: /join|start|enroll|registration date/i,
  planName: /plan|package|membership/i,
  planPrice: /price|fee|amount|cost/i,
  billingInterval: /interval|cycle|period|frequency/i,
  nextDueDate: /due|expir|next payment|renew/i,
  attendanceDates: /attendance|check-?in|visit/i,
};

/** Best-effort auto-mapping so the owner mostly just confirms instead of mapping every column by hand. */
export function guessMapping(headers: string[]): ColumnMapping {
  const mapping = emptyMapping();
  for (const field of IMPORT_FIELDS) {
    const match = headers.find((h) => GUESS_PATTERNS[field.key].test(h));
    if (match) mapping[field.key] = match;
  }
  return mapping;
}

export interface MappedRow {
  rowIndex: number;
  fullName: string;
  email?: string;
  phone?: string;
  joinedAt?: Date;
  planName?: string;
  planPriceCents?: number;
  billingInterval?: string;
  nextDueDate?: Date;
  attendanceDates: Date[];
  error?: string;
}

function cellFor(headers: string[], row: string[], header: string | null): string {
  if (!header) return "";
  const idx = headers.indexOf(header);
  return idx === -1 ? "" : (row[idx] ?? "").trim();
}

function parseFlexibleDate(raw: string): Date | undefined {
  if (!raw) return undefined;
  const parsed = new Date(raw);
  return isNaN(parsed.getTime()) ? undefined : parsed;
}

function parsePriceToCents(raw: string): number | undefined {
  if (!raw) return undefined;
  const cleaned = raw.replace(/[^0-9.]/g, "");
  if (!cleaned) return undefined;
  const value = parseFloat(cleaned);
  return isNaN(value) ? undefined : Math.round(value * 100);
}

export function mapRow(headers: string[], row: string[], mapping: ColumnMapping, rowIndex: number): MappedRow {
  const fullName = cellFor(headers, row, mapping.fullName);
  if (!fullName) {
    return { rowIndex, fullName: "", attendanceDates: [], error: "Missing full name" };
  }

  const attendanceRaw = cellFor(headers, row, mapping.attendanceDates);
  const attendanceDates = attendanceRaw
    ? attendanceRaw
        .split(/[,;\n]+/)
        .map((s) => parseFlexibleDate(s.trim()))
        .filter((d): d is Date => !!d)
    : [];

  return {
    rowIndex,
    fullName,
    email: cellFor(headers, row, mapping.email) || undefined,
    phone: cellFor(headers, row, mapping.phone) || undefined,
    joinedAt: parseFlexibleDate(cellFor(headers, row, mapping.joinedAt)),
    planName: cellFor(headers, row, mapping.planName) || undefined,
    planPriceCents: parsePriceToCents(cellFor(headers, row, mapping.planPrice)),
    billingInterval: cellFor(headers, row, mapping.billingInterval) || undefined,
    nextDueDate: parseFlexibleDate(cellFor(headers, row, mapping.nextDueDate)),
    attendanceDates,
  };
}
