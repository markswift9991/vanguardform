import { Download, Eye, FileText, Printer, Video } from "lucide-react";
import type { RiderRecord } from "../types";

const fileLabels: Record<string, string> = {
  nin_document_path: "NIN document",
  identity_card_front_path: "Identity card front",
  identity_card_back_path: "Identity card back",
  video_path: "Video verification",
};

function displayLabel(value: string) {
  return value.replace(/_path$/, "").replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "Not provided";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) return new Date(value).toLocaleString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function collectFiles(record: RiderRecord) {
  const files: { id: string; label: string; video: boolean }[] = [];
  const visit = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    for (const [key, item] of Object.entries(value)) {
      if (typeof item === "string" && key.endsWith("_path") && /^[0-9a-f-]{36}$/i.test(item)) {
        files.push({ id: item, label: fileLabels[key] ?? displayLabel(key), video: key.includes("video") });
      } else if (Array.isArray(item)) item.forEach(visit);
      else if (item && typeof item === "object") visit(item);
    }
  };
  visit(record);
  return [...new Map(files.map((file) => [file.id, file])).values()];
}

function SummaryFields({ record, excluded = [] }: { record: object; excluded?: string[] }) {
  return <dl className="submission-fields">
    {Object.entries(record).filter(([key]) => !excluded.includes(key) && !key.endsWith("_path") && key !== "id" && key !== "rider_id" && key !== "verification_token")
      .map(([key, value]) => <div className="submission-field" key={key}><dt>{displayLabel(key)}</dt><dd>{displayValue(value)}</dd></div>)}
  </dl>;
}

export function RiderSubmissionSummary({ record, onPrint }: { record: RiderRecord; onPrint: () => void }) {
  const files = collectFiles(record);
  const { employment_history: employment, guarantors, ...riderFields } = record;

  return <section id="rider-submission-preview" className="submission-preview" aria-label="Application summary preview">
    <div className="submission-preview-heading">
      <div><p className="eyebrow">Submission preview</p><h3>{record.full_name}</h3></div>
      <div className="admin-actions no-print">
        <button className="button button-secondary" type="button" onClick={onPrint}><Printer size={15} /> Print / save PDF</button>
      </div>
    </div>
    <section className="submission-group"><h4>Rider application</h4><SummaryFields record={riderFields} excluded={["employment_history", "location_captured_at"]} /></section>
    {Array.isArray(employment) && employment.length > 0 && <section className="submission-group"><h4>Employment history</h4>{employment.map((entry, index) => <article className="submission-nested" key={index}><h5>Previous employer {index + 1}</h5><SummaryFields record={entry} /></article>)}</section>}
    {Array.isArray(guarantors) && <section className="submission-group"><h4>Guarantor submissions</h4>{guarantors.map((guarantor, index) => <article className="submission-nested" key={String(guarantor.id ?? index)}><h5>Guarantor {index + 1}: {displayValue(guarantor.name)}</h5><SummaryFields record={guarantor} excluded={["location_captured_at"]} /></article>)}</section>}
    <section className="submission-group">
      <h4>Uploaded documents and videos</h4>
      {files.length ? <div className="submission-files">{files.map((file) => {
        const url = `/api/admin/files/${encodeURIComponent(file.id)}`;
        return <article className="submission-file" key={file.id}>
          <h5>{file.video ? <Video size={16} /> : <FileText size={16} />}{file.label}</h5>
          {file.video
            ? <video src={url} controls preload="metadata" aria-label={file.label} />
            : <iframe src={url} title={file.label} loading="lazy" />}
          <a href={url} target="_blank" rel="noreferrer"><Eye size={14} /> Preview in new tab</a>
          <a href={url} download><Download size={14} /> Open / download</a>
        </article>;
      })}</div> : <p className="detail-help">No uploaded files are attached to this application.</p>}
    </section>
  </section>;
}
