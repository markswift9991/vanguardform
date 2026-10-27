import { useEffect, useState, type ChangeEvent } from "react";
import { ImagePlus, Trash2, Upload } from "lucide-react";
import { apiRequest } from "../lib/api";

export function CompanyBrandingManager() {
  const [file, setFile] = useState<File | null>(null);
  const [logoAvailable, setLogoAvailable] = useState(false);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const checkLogo = async () => {
    const response = await fetch(`/api/company-logo?v=${Date.now()}`, { cache: "no-store" });
    if (response.status === 404) {
      setLogoAvailable(false);
      return false;
    }
    if (!response.ok) throw new Error(`Could not retrieve the company logo (HTTP ${response.status}).`);
    const contentType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
    if (!contentType || !["image/png", "image/jpeg", "image/webp"].includes(contentType)) {
      throw new Error("The logo endpoint did not return a supported image.");
    }
    setLogoAvailable(true);
    return true;
  };

  useEffect(() => {
    void checkLogo().catch((checkError: unknown) => {
      setError(checkError instanceof Error ? checkError.message : "Could not check the current company logo.");
    });
  }, []);

  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] ?? null);
    setError("");
    setNotice("");
  };

  const uploadLogo = async () => {
    if (!file) {
      setError("Choose a PNG, JPEG, or WebP logo first.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const body = new FormData();
      body.append("logo", file);
      await apiRequest<{ success: boolean }>("/api/admin/company-logo", { method: "PUT", body });
      const isAvailable = await checkLogo();
      if (!isAvailable) {
        throw new Error("The upload was accepted, but the logo is not available to the forms. Confirm the admin page and forms use the same API server and database.");
      }
      setFile(null);
      setRevision((value) => value + 1);
      setNotice("Company logo updated.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Could not upload the company logo.");
    } finally {
      setBusy(false);
    }
  };

  const removeLogo = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await apiRequest<{ success: boolean }>("/api/admin/company-logo", { method: "DELETE" });
      setLogoAvailable(false);
      setFile(null);
      setNotice("Company logo removed. The default mark will be shown.");
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Could not remove the company logo.");
    } finally {
      setBusy(false);
    }
  };

  return <section className="branding-manager">
    <div>
      <h3><ImagePlus size={18} /> Company logo</h3>
      <p>Upload a PNG, JPEG, or WebP logo (maximum 2 MB). It appears centered in both application headers.</p>
    </div>
    {logoAvailable && <img className="branding-preview" src={`/api/company-logo?revision=${revision}`} alt="Current company logo" />}
    <label className="field">
      <span>Choose logo image</span>
      <input type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseFile} />
    </label>
    {file && <small>{file.name} ({Math.ceil(file.size / 1024)} KB)</small>}
    <div className="admin-actions">
      <button className="button button-primary" type="button" onClick={() => void uploadLogo()} disabled={busy || !file}><Upload size={15} /> {busy ? "Saving…" : "Upload logo"}</button>
      {logoAvailable && <button className="button button-secondary" type="button" onClick={() => void removeLogo()} disabled={busy}><Trash2 size={15} /> Remove logo</button>}
    </div>
    {notice && <p className="cms-status" role="status">{notice}</p>}
    {error && <p className="error-banner" role="alert">{error}</p>}
  </section>;
}
