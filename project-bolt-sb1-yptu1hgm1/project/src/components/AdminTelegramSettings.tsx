import { useEffect, useState, type FormEvent } from "react";
import { Bell, Save, Trash2 } from "lucide-react";
import { apiRequest } from "../lib/api";

interface TelegramSettingsStatus {
  configured: boolean;
  encryption_key_configured: boolean;
}

export function AdminTelegramSettings() {
  const [status, setStatus] = useState<TelegramSettingsStatus | null>(null);
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = async () => {
    const result = await apiRequest<TelegramSettingsStatus>("/api/admin/telegram-settings");
    setStatus(result);
  };

  useEffect(() => {
    let active = true;
    void apiRequest<TelegramSettingsStatus>("/api/admin/telegram-settings")
      .then((result) => { if (active) setStatus(result); })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Could not load Telegram settings.");
      });
    return () => { active = false; };
  }, []);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await apiRequest<{ success: boolean }>("/api/admin/telegram-settings", {
        method: "PUT",
        body: JSON.stringify({ bot_token: botToken, chat_id: chatId }),
      });
      setBotToken("");
      setChatId("");
      await refresh();
      setNotice("Telegram notifications are enabled.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save Telegram settings.");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await apiRequest<{ success: boolean }>("/api/admin/telegram-settings", { method: "DELETE" });
      await refresh();
      setNotice("Telegram notifications have been disabled.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not disable Telegram notifications.");
    } finally {
      setBusy(false);
    }
  };

  return <section className="admin-account-content telegram-settings">
    <h2><Bell size={19} /> Telegram notifications</h2>
    <p>Send a notification to your Telegram chat or channel after each rider application is saved. NINs, documents, videos, and precise location are never included in the message.</p>
    {status && <p className={status.configured ? "telegram-status is-enabled" : "telegram-status"}>
      {status.configured ? "Notifications are configured." : "Notifications are not configured."}
    </p>}
    {status && !status.encryption_key_configured && <p className="error-banner" role="alert">The server is missing TELEGRAM_SETTINGS_ENCRYPTION_KEY. Set this secret in the hosting environment before saving bot credentials.</p>}
    {notice && <p className="cms-status" role="status">{notice}</p>}
    {error && <p className="error-banner" role="alert">{error}</p>}
    <form className="admin-register-form" onSubmit={(event) => void save(event)}>
      <label className="field">
        <span>Telegram bot token</span>
        <input type="password" autoComplete="new-password" value={botToken} onChange={(event) => setBotToken(event.target.value)} required maxLength={256} placeholder="Enter token from BotFather" />
      </label>
      <label className="field">
        <span>Telegram chat ID or channel username</span>
        <input value={chatId} onChange={(event) => setChatId(event.target.value)} required maxLength={200} placeholder="-1001234567890 or @channelname" />
      </label>
      <p className="detail-help">For security, the existing token is never shown. Enter both values to replace or enable the integration. The token is encrypted before it is stored in PostgreSQL.</p>
      <div className="admin-actions">
        <button className="button button-primary" type="submit" disabled={busy || !status?.encryption_key_configured}><Save size={15} />{busy ? "Saving…" : "Save Telegram settings"}</button>
        {status?.configured && <button className="button button-secondary" type="button" onClick={() => void disable()} disabled={busy}><Trash2 size={15} />Disable notifications</button>}
      </div>
    </form>
  </section>;
}
