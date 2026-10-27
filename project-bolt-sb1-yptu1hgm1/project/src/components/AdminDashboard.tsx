import { useCallback, useEffect, useState } from "react";
import { Download, ExternalLink, Eye, LogOut, Pencil, RefreshCw, Save, Search, Trash2, X } from "lucide-react";
import { apiRequest } from "../lib/api";
import type { RiderRecord } from "../types";
import { RiderSubmissionSummary } from "./RiderSubmissionSummary";
type AdminTab = "applications" | "content" | "admins";

export function AdminDashboard() {
  const [session, setSession] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<RiderRecord[]>([]);
  const [selected, setSelected] = useState<RiderRecord | null>(null);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [registration, setRegistration] = useState<{ bootstrap_open: boolean; authenticated: boolean } | null>(null);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [tab, setTab] = useState<AdminTab>("applications");

  const checkAdmin = useCallback(async () => {
    setLoading(true);
    try {
      await apiRequest<{ user_id: string }>("/api/admin/me");
      setSession(true);
      setAuthorized(true);
      setError("");
    } catch (authError) {
      setSession(false);
      setAuthorized(false);
      const message = authError instanceof Error ? authError.message : "Could not verify administrator access.";
      setError(message.includes("sign-in is required") || message.includes("session expired") ? "" : message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void checkAdmin();
  }, [checkAdmin]);

  const checkRegistration = useCallback(async () => {
    try {
      const status = await apiRequest<{ bootstrap_open: boolean; authenticated: boolean }>("/api/admin/registration-status");
      setRegistration(status);
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Could not check administrator registration.");
    }
  }, []);

  useEffect(() => { void checkRegistration(); }, [checkRegistration]);

  const loadRecords = useCallback(async () => {
    if (!authorized) return;
    setLoading(true);
    try {
      const data = await apiRequest<RiderRecord[]>("/api/admin/riders");
      setRecords(data);
      setError("");
    } catch (listError) {
      setError(listError instanceof Error ? listError.message : "Could not load applications.");
    } finally {
      setLoading(false);
    }
  }, [authorized]);

  useEffect(() => { void loadRecords(); }, [loadRecords]);

  const signIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await apiRequest<{ success: boolean }>("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setPassword("");
      window.history.replaceState(null, "", "/admin/dashboard");
      await checkAdmin();
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  };

  const registerAdmin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await apiRequest<{ success: boolean; bootstrap: boolean }>("/api/admin/register", {
        method: "POST",
        body: JSON.stringify({ email: newAdminEmail, password: newAdminPassword }),
      });
      setNewAdminEmail("");
      setNewAdminPassword("");
      if (result.bootstrap) {
        window.history.replaceState(null, "", "/admin/dashboard");
        await checkAdmin();
      } else {
        await checkRegistration();
      }
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : "Could not register administrator.");
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    setBusy(true);
    setError("");
    try {
      await apiRequest<{ success: boolean }>("/api/admin/logout", { method: "POST" });
      setSession(false);
      setAuthorized(false);
      setSelected(null);
      window.history.replaceState(null, "", "/admin/login");
      await checkRegistration();
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : "Could not sign out.");
    } finally {
      setBusy(false);
    }
  };

  const openRecord = (record: RiderRecord) => { setSelected(record); setDraft(JSON.stringify(record, null, 2)); setEditing(false); };
  const saveRecord = async () => {
    if (!selected) return;
    setBusy(true); setError("");
    try {
      const parsed = JSON.parse(draft) as RiderRecord;
      if (parsed.id !== selected.id) throw new Error("Record ID cannot be changed.");
      await apiRequest<{ success: boolean }>(`/api/admin/riders/${encodeURIComponent(selected.id)}`, {
        method: "PUT",
        body: JSON.stringify(parsed),
      });
      await loadRecords(); setSelected(null); setEditing(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save changes.");
    } finally { setBusy(false); }
  };

  const deleteRecord = async (record: RiderRecord) => {
    if (!window.confirm(`Permanently delete ${record.full_name}'s application and guarantor records?`)) return;
    setBusy(true); setError("");
    try {
      await apiRequest<{ success: boolean }>(`/api/admin/riders/${encodeURIComponent(record.id)}`, { method: "DELETE" });
      if (selected?.id === record.id) setSelected(null);
      await loadRecords();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete application.");
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = async (record: RiderRecord, status: string) => {
    setBusy(true); setError("");
    try {
      await apiRequest<{ success: boolean }>(`/api/admin/riders/${encodeURIComponent(record.id)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setRecords((current) => current.map((item) => item.id === record.id ? { ...item, status } : item));
      setSelected((current) => current?.id === record.id ? { ...current, status } : current);
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Could not update application status.");
    } finally {
      setBusy(false);
    }
  };

  const openFiles = async (record: RiderRecord) => {
    const fileIds = new Set<string>();
    const scan = (value: unknown) => {
      if (!value || typeof value !== "object") return;
      for (const [key, item] of Object.entries(value)) {
        if (typeof item === "string" && key.endsWith("_path") && /^[0-9a-f-]{36}$/i.test(item)) fileIds.add(item);
        else if (Array.isArray(item)) item.forEach(scan);
        else if (item && typeof item === "object") scan(item);
      }
    };
    scan(record);
    if (!fileIds.size) {
      setError("No uploaded files for this application.");
      return;
    }
    setError("");
    fileIds.forEach((id) => window.open(`/api/admin/files/${encodeURIComponent(id)}`, "_blank", "noopener,noreferrer"));
  };

  const exportCsv = () => {
    const headers = ["id", "created_at", "status", "full_name", "phone_number", "email_address", "residential_address"];
    const rows = filtered.map((record) => headers.map((key) => JSON.stringify(record[key] ?? "")).join(","));
    const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const anchor = document.createElement("a"); anchor.href = URL.createObjectURL(blob); anchor.download = "rider-applications.csv"; anchor.click(); URL.revokeObjectURL(anchor.href);
  };

  const filtered = records.filter((record) => `${record.full_name} ${record.phone_number} ${record.status} ${record.email_address}`.toLowerCase().includes(query.toLowerCase()));

  if (loading && !session) return <div className="loading-screen">Loading administrator access…</div>;
  if (!session || !authorized) return <main className="admin-shell"><section className="admin-login">
    <p className="eyebrow">Vanguard Velocity Delivery</p>
    <h1>{registration?.bootstrap_open ? "Create the first administrator" : "Administrator sign in"}</h1>
    {error && <p className="error-banner" role="alert">{error}</p>}
    {registration?.bootstrap_open ? <form onSubmit={(event) => void registerAdmin(event)}>
      <label className="field"><span>Email</span><input type="email" autoComplete="username" value={newAdminEmail} onChange={(event) => setNewAdminEmail(event.target.value)} required /></label>
      <label className="field"><span>Password (at least 12 characters)</span><input type="password" autoComplete="new-password" minLength={12} value={newAdminPassword} onChange={(event) => setNewAdminPassword(event.target.value)} required /></label>
      <button className="button button-primary" disabled={busy}>{busy ? "Creating account…" : "Create first administrator"}</button>
    </form> : <form onSubmit={(event) => void signIn(event)}>
      <label className="field"><span>Email</span><input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
      <label className="field"><span>Password</span><input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
      <button className="button button-primary" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
    </form>}
    <a className="admin-link" href="/">Return to application</a>
  </section></main>;

  return <main className="admin-shell"><header className="admin-header"><div><p className="eyebrow">Vanguard Velocity Delivery</p><h1>Administrator dashboard</h1></div><button className="button button-secondary" type="button" onClick={() => void signOut()} disabled={busy}><LogOut size={16} /> Sign out</button></header><nav className="admin-tabs" aria-label="Administrator sections"><button type="button" className={tab === "applications" ? "active" : ""} onClick={() => setTab("applications")}>Rider applications</button><button type="button" className={tab === "content" ? "active" : ""} onClick={() => setTab("content")}>Form content</button><button type="button" className={tab === "admins" ? "active" : ""} onClick={() => setTab("admins")}>Administrators</button></nav><section className="admin-content" hidden={tab !== "applications"}><div className="admin-toolbar"><label className="field"><span>Search applications</span><div className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, phone, email or status" /></div></label><div className="admin-actions"><button className="button button-secondary" onClick={() => void loadRecords()} type="button"><RefreshCw size={15} /> Refresh</button><button className="button button-secondary" onClick={exportCsv} type="button"><Download size={15} /> Export CSV</button></div></div>{error && <p className="error-banner" role="alert">{error}</p>}<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Applicant</th><th>Phone</th><th>Submitted</th><th>Status</th><th>Guarantors</th><th>Actions</th></tr></thead><tbody>{filtered.map((record) => <tr key={record.id}><td>{record.full_name}</td><td>{record.phone_number}</td><td>{new Date(record.created_at).toLocaleDateString()}</td><td><select aria-label={`Status for ${record.full_name}`} value={record.status} onChange={(event) => void changeStatus(record, event.target.value)} disabled={busy}><option value="pending">Pending</option><option value="under_review">Under review</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></td><td>{record.guarantors?.length ?? 0}</td><td><div className="admin-actions"><button className="icon-button" title="View and edit record" aria-label="View and edit record" onClick={() => openRecord(record)}><Pencil size={15} /></button><button className="icon-button" title="Open uploaded documents" aria-label="Open uploaded documents" onClick={() => void openFiles(record)}><ExternalLink size={15} /></button><button className="icon-button danger" title="Delete application" aria-label="Delete application" onClick={() => void deleteRecord(record)} disabled={busy}><Trash2 size={15} /></button></div></td></tr>)}</tbody></table>{!filtered.length && <div className="empty-state">{loading ? "Loading applications…" : "No matching applications."}</div>}</div>{selected && <section className="admin-detail"><div className="detail-title"><div><p className="eyebrow">Application record</p><h2>{selected.full_name}</h2></div><div className="admin-actions">{editing ? <><button className="button button-primary" onClick={() => void saveRecord()} disabled={busy} type="button"><Save size={15} /> Save all changes</button><button className="button button-secondary" onClick={() => { setEditing(false); setDraft(JSON.stringify(selected, null, 2)); setError(""); }} type="button"><X size={15} /> Cancel</button></> : <><button className="button button-secondary" onClick={() => document.getElementById("rider-submission-preview")?.scrollIntoView({ behavior: "smooth" })} type="button"><Eye size={15} /> Preview summary</button><button className="button button-secondary" onClick={() => setEditing(true)} type="button"><Pencil size={15} /> Edit all fields</button></>}<button className="icon-button" onClick={() => setSelected(null)} type="button" title="Close details" aria-label="Close details"><X size={16} /></button></div></div><RiderSubmissionSummary record={selected} onPrint={() => window.print()} />{editing && <><p className="detail-help">Edit the complete application record. Existing guarantor records can also be edited here.</p><textarea className="record-json" aria-label="Application record JSON" value={draft} onChange={(event) => setDraft(event.target.value)} spellCheck={false} /></>}</section>}</section></main>;
}