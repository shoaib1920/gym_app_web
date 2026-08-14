import { useMemo, useState } from "react";
import { useGymId } from "../context/AuthContext";
import {
  parseSpreadsheet,
  guessMapping,
  emptyMapping,
  mapRow,
  IMPORT_FIELDS,
  type ColumnMapping,
  type ParsedSheet,
  type MappedRow,
} from "../lib/excelImport";
import { importRows, type ImportSummary } from "../firestore/importGym";
import { Button, Card, EmptyState, ErrorText, Icon, PageHeader, StatusPill } from "../components/ui";

type Step = "upload" | "map" | "preview" | "importing" | "done";

export default function ImportPage() {
  const gymId = useGymId();
  const [step, setStep] = useState<Step>("upload");
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>(emptyMapping());
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const mappedRows: MappedRow[] = useMemo(() => {
    if (!sheet) return [];
    return sheet.rows.map((row, i) => mapRow(sheet.headers, row, mapping, i + 2)); // +2: header row + 1-based
  }, [sheet, mapping]);

  const validCount = mappedRows.filter((r) => !r.error).length;

  const handleFile = async (file: File) => {
    setUploadError(null);
    try {
      const parsed = await parseSpreadsheet(file);
      if (parsed.rows.length === 0) {
        setUploadError("No data rows found in this file.");
        return;
      }
      setSheet(parsed);
      setMapping(guessMapping(parsed.headers));
      setStep("map");
    } catch {
      setUploadError("Couldn't read that file — make sure it's a valid .xlsx, .xls, or .csv export.");
    }
  };

  const handleImport = async () => {
    setStep("importing");
    setProgress({ done: 0, total: mappedRows.length });
    const result = await importRows(gymId, mappedRows, (done, total) => setProgress({ done, total }));
    setSummary(result);
    setStep("done");
  };

  const reset = () => {
    setSheet(null);
    setMapping(emptyMapping());
    setSummary(null);
    setUploadError(null);
    setStep("upload");
  };

  return (
    <div>
      <PageHeader
        title="Import from Excel"
        subtitle="Bring in members — and their plans, payment history, and attendance — from a spreadsheet you already keep."
      />

      {step === "upload" && (
        <Card>
          <ErrorText>{uploadError}</ErrorText>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-md rounded-xl border-2 border-dashed border-outline-variant p-xl text-center transition-colors hover:border-primary-container">
            <Icon name="upload_file" className="!text-4xl text-on-surface-variant" />
            <span className="font-label-md text-label-md text-on-surface">Click to choose a .xlsx, .xls, or .csv file</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">The first row should be column headers.</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>
        </Card>
      )}

      {step === "map" && sheet && (
        <Card>
          <h3 className="mb-md font-headline text-headline-sm font-bold text-on-surface">Map your columns</h3>
          <p className="mb-lg font-label-sm text-label-sm text-on-surface-variant">
            We guessed a few of these — check them and map anything we missed. Only Full Name is required.
          </p>

          <div className="flex flex-col gap-md">
            {IMPORT_FIELDS.map((field) => (
              <div key={field.key} className="flex items-center justify-between gap-md">
                <div>
                  <span className="font-label-md text-label-md text-on-surface">
                    {field.label}
                    {field.required && <span className="text-error"> *</span>}
                  </span>
                  {field.hint && <p className="font-label-sm text-label-sm text-on-surface-variant">{field.hint}</p>}
                </div>
                <select
                  value={mapping[field.key] ?? ""}
                  onChange={(e) => setMapping((m) => ({ ...m, [field.key]: e.target.value || null }))}
                  className="rounded-lg border border-outline-variant bg-surface-container-low px-md py-sm text-on-surface outline-none focus:border-primary-container"
                >
                  <option value="">— Not in spreadsheet —</option>
                  {sheet.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="mt-xl flex justify-end gap-md">
            <Button variant="secondary" onClick={reset}>
              Start over
            </Button>
            <Button disabled={!mapping.fullName} onClick={() => setStep("preview")}>
              Preview
            </Button>
          </div>
        </Card>
      )}

      {step === "preview" && (
        <Card>
          <h3 className="mb-xs font-headline text-headline-sm font-bold text-on-surface">Preview</h3>
          <p className="mb-lg font-label-sm text-label-sm text-on-surface-variant">
            {validCount} of {mappedRows.length} rows will be imported.
            {mappedRows.length - validCount > 0 && ` ${mappedRows.length - validCount} will be skipped.`}
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-label-sm text-label-sm">
              <thead>
                <tr className="border-b border-outline-variant text-on-surface-variant">
                  <th className="py-xs pr-md">Row</th>
                  <th className="py-xs pr-md">Name</th>
                  <th className="py-xs pr-md">Plan</th>
                  <th className="py-xs pr-md">Attendance dates</th>
                  <th className="py-xs pr-md">Status</th>
                </tr>
              </thead>
              <tbody>
                {mappedRows.slice(0, 10).map((row) => (
                  <tr key={row.rowIndex} className="border-b border-outline-variant/50">
                    <td className="py-xs pr-md text-on-surface-variant">{row.rowIndex}</td>
                    <td className="py-xs pr-md text-on-surface">{row.fullName || "—"}</td>
                    <td className="py-xs pr-md text-on-surface-variant">{row.planName ?? "—"}</td>
                    <td className="py-xs pr-md text-on-surface-variant">{row.attendanceDates.length || "—"}</td>
                    <td className="py-xs pr-md">
                      {row.error ? (
                        <StatusPill variant="error">{row.error}</StatusPill>
                      ) : (
                        <StatusPill variant="active">Ready</StatusPill>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {mappedRows.length > 10 && (
              <p className="mt-sm font-label-sm text-label-sm text-on-surface-variant">
                …and {mappedRows.length - 10} more row{mappedRows.length - 10 === 1 ? "" : "s"}.
              </p>
            )}
          </div>

          <div className="mt-xl flex justify-end gap-md">
            <Button variant="secondary" onClick={() => setStep("map")}>
              Back
            </Button>
            <Button disabled={validCount === 0} onClick={handleImport}>
              Import {validCount} member{validCount === 1 ? "" : "s"}
            </Button>
          </div>
        </Card>
      )}

      {step === "importing" && (
        <Card className="text-center">
          <Icon name="progress_activity" className="!text-4xl animate-spin text-primary-container" />
          <p className="mt-md font-label-md text-label-md text-on-surface">
            Importing {progress.done} of {progress.total}…
          </p>
        </Card>
      )}

      {step === "done" && summary && (
        <Card>
          <h3 className="mb-lg font-headline text-headline-sm font-bold text-on-surface">Import complete</h3>
          <div className="grid grid-cols-2 gap-md sm:grid-cols-3">
            <SummaryStat label="Members" value={summary.membersCreated} />
            <SummaryStat label="Payers" value={summary.payersCreated} />
            <SummaryStat label="Plans" value={summary.plansCreated} />
            <SummaryStat label="Subscriptions" value={summary.subscriptionsCreated} />
            <SummaryStat label="Attendance entries" value={summary.attendanceEntriesCreated} />
            <SummaryStat label="Skipped" value={summary.skipped.length} accent={summary.skipped.length ? "error" : undefined} />
          </div>

          {summary.skipped.length > 0 && (
            <div className="mt-lg">
              <h4 className="mb-sm font-label-md text-label-md font-bold text-on-surface">Skipped rows</h4>
              <ul className="flex flex-col gap-xs">
                {summary.skipped.map((s) => (
                  <li key={s.rowIndex} className="font-label-sm text-label-sm text-on-surface-variant">
                    Row {s.rowIndex} ({s.fullName || "unnamed"}): {s.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {summary.skipped.length === 0 && summary.membersCreated === 0 && <EmptyState>Nothing was imported.</EmptyState>}

          <div className="mt-xl flex justify-end">
            <Button onClick={reset}>Import another file</Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function SummaryStat({ label, value, accent }: { label: string; value: number; accent?: "error" }) {
  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-low p-md">
      <p className={`font-headline text-headline-md font-bold ${accent === "error" && value > 0 ? "text-error" : "text-on-surface"}`}>
        {value}
      </p>
      <p className="font-label-sm text-label-sm text-on-surface-variant">{label}</p>
    </div>
  );
}
