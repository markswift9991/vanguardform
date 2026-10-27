import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { apiRequest } from "../lib/api";
import { DEFAULT_FORM_CONTENT, FORM_CONTENT_GROUPS } from "../lib/formContentDefaults";
import { useFormContent } from "../lib/useFormContent";
import { CompanyBrandingManager } from "./CompanyBrandingManager";

export function FormContentManager() {
  const { content, setContent } = useFormContent();
  const [draft, setDraft] = useState(content);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void apiRequest<Record<string, unknown>>("/api/admin/form-content")
      .then((saved) => {
        if (!active) return;
        const safeContent = { ...DEFAULT_FORM_CONTENT };
        for (const key of Object.keys(DEFAULT_FORM_CONTENT)) {
          if (typeof saved[key] === "string") safeContent[key] = saved[key];
        }
        setDraft(safeContent);
        setContent(safeContent);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Could not load saved form content.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [setContent]);

  const update = (key: string, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setMessage("");
    setError("");
  };

  const save = async () => {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      await apiRequest<{ success: boolean }>("/api/admin/form-content", {
        method: "PUT",
        body: JSON.stringify({ content: draft }),
      });
      setContent(draft);
      setMessage("Published form content.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not publish form content.");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setDraft({ ...DEFAULT_FORM_CONTENT });
    setMessage("");
    setError("");
  };

  if (loading) return <div className="loading-screen">Loading saved form content…</div>;

  const search = query.trim().toLocaleLowerCase();

  return <section className="admin-cms">
    <CompanyBrandingManager />
    <div className="admin-cms-heading">
      <div>
        <h2>Application form content</h2>
        <p>Edit existing form titles, descriptions, field labels, option labels, consent text, policy copy, and verification scripts. Changes are published to both forms immediately after saving. Field structure and validation remain fixed.</p>
      </div>
      <div className="admin-actions">
        <button className="button button-secondary" type="button" onClick={reset} disabled={busy}>Reset to defaults</button>
        <button className="button button-primary" type="button" onClick={() => void save()} disabled={busy}><Save size={15} /> {busy ? "Publishing…" : "Save and publish"}</button>
      </div>
    </div>
    <label className="field cms-search"><span>Find form content</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search labels or text" /></label>
    {message && <p className="cms-status" role="status">{message}</p>}
    {error && <p className="error-banner" role="alert">{error}</p>}
    {FORM_CONTENT_GROUPS.map((group) => <section className="cms-group" key={group.title}>
      <h3>{group.title}</h3>
      <div className="cms-fields">
        {group.keys.filter((key) => !search || key.toLocaleLowerCase().includes(search) || (draft[key] ?? "").toLocaleLowerCase().includes(search)).map((key) => <label className="field cms-field" key={`${group.title}-${key}`}>
          <span>{key}</span>
          <textarea
            rows={key.length > 120 ? 4 : 2}
            maxLength={10000}
            value={draft[key] ?? DEFAULT_FORM_CONTENT[key] ?? key}
            onChange={(event) => update(key, event.target.value)}
          />
        </label>)}
        {!group.keys.some((key) => !search || key.toLocaleLowerCase().includes(search) || (draft[key] ?? "").toLocaleLowerCase().includes(search)) && <p className="detail-help">No matching content.</p>}
      </div>
    </section>)}
  </section>;
}
