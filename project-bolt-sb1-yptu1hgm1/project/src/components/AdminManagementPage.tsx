import { useEffect, useState, type FormEvent } from "react";
import { UserPlus } from "lucide-react";
import { apiRequest } from "../lib/api";
import { FormContentManager } from "./FormContentManager";
import { AdminTelegramSettings } from "./AdminTelegramSettings";

type AdminPage = "content" | "users" | "notifications";

export function AdminManagementPage({ page }: { page: AdminPage }) {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    void apiRequest<{ user_id: string }>("/api/admin/me")
      .then(() => { if (active) setAuthorized(true); })
      .catch((authError: unknown) => {
        if (active && authError instanceof Error && !authError.message.includes("sign-in is required") && !authError.message.includes("session expired")) {
          setError(authError.message);
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const createAdmin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await apiRequest<{ success: boolean; bootstrap: boolean }>("/api/admin/register", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setEmail("");
      setPassword("");
      setNotice("Administrator account created.");
    } catch (registrationError) {
      setError(registrationError instanceof Error ? registrationError.message : "Could not create administrator.");
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    setBusy(true);
    setError("");
    try {
      await apiRequest<{ success: boolean }>("/api/admin/logout", { method: "POST" });
      window.location.assign("/admin/login");
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : "Could not sign out.");
      setBusy(false);
    }
  };

  if (loading) return <main className="admin-shell"><div className="loading-screen">Verifying administrator access…</div></main>;
  if (!authorized) return <main className="admin-shell"><section className="admin-login">
    <p className="eyebrow">Vanguard Velocity Delivery</p>
    <h1>Administrator sign in required</h1>
    {error && <p className="error-banner" role="alert">{error}</p>}
    <p>Sign in to manage application content and administrator accounts.</p>
    <a className="button button-primary admin-login-link" href="/admin/login">Go to admin login</a>
  </section></main>;

  return <main className="admin-shell">
    <header className="admin-header">
      <div><p className="eyebrow">Vanguard Velocity Delivery</p><h1>{page === "content" ? "Form content management" : page === "users" ? "Administrator accounts" : "Telegram notifications"}</h1></div>
      <button className="button button-secondary" type="button" onClick={() => void signOut()} disabled={busy}>Sign out</button>
    </header>
    {error && <p className="error-banner" role="alert">{error}</p>}
    {page === "content" ? <section className="admin-content"><FormContentManager /></section> : page === "notifications" ? <section className="admin-content"><AdminTelegramSettings /></section> : <section className="admin-content admin-account-content">
      <h2><UserPlus size={19} /> Register administrator</h2>
      <p>Only signed-in administrators can create additional accounts. Use a unique email and a password of at least 12 characters.</p>
      {notice && <p className="cms-status" role="status">{notice}</p>}
      <form className="admin-register-form" onSubmit={(event) => void createAdmin(event)}>
        <label className="field"><span>Administrator email</span><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <label className="field"><span>Password (at least 12 characters)</span><input type="password" autoComplete="new-password" minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
        <button className="button button-primary" type="submit" disabled={busy}><UserPlus size={16} /> {busy ? "Creating account…" : "Create administrator"}</button>
      </form>
    </section>}
  </main>;
}
