import { useState, useEffect, useCallback } from "react";
import { apiRequest } from "@/lib/api";
import { RiderHeader } from "@/components/RiderHeader";
import { RiderForm } from "@/components/RiderForm";
import { SuccessScreen, type GuarantorLinkInfo } from "@/components/SuccessScreen";
import { GuarantorForm } from "@/components/GuarantorForm";
import { AdminDashboard } from "@/components/AdminDashboard";
import { AdminManagementPage } from "@/components/AdminManagementPage";
import { useFormContent } from "@/lib/useFormContent";
import type { GuarantorSubmission, LocationData, RiderFormValues } from "@/types";
import { AlertCircle, Loader2 } from "lucide-react";

type View = "rider" | "success" | "guarantor" | "guarantor-used" | "guarantor-error" | "guarantor-complete";

interface GuarantorContext {
  token: string;
  riderName: string;
  guarantorName: string;
  guarantorPhone: string;
  guarantorId: string;
}

function App() {
  const { text } = useFormContent();
  const [currentHash, setCurrentHash] = useState(window.location.hash);
  const [view, setView] = useState<View>("rider");
  const [links, setLinks] = useState<GuarantorLinkInfo[]>([]);
  const [riderName, setRiderName] = useState("");
  const [guarantorCtx, setGuarantorCtx] = useState<GuarantorContext | null>(null);
  const [loadingGuarantor, setLoadingGuarantor] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [telegramWarning, setTelegramWarning] = useState("");

  // Route detection: #/guarantor/<token> or ?guarantor=<token>
  const detectGuarantorRoute = useCallback(async () => {
    const hash = window.location.hash;
    const params = new URLSearchParams(window.location.search);
    let token: string | null = null;

    const match = hash.match(/#\/guarantor\/([0-9a-fA-F-]+)/);
    if (match) token = match[1];
    else if (params.get("guarantor")) token = params.get("guarantor");

    if (!token) return;

    setLoadingGuarantor(true);
    try {
      const data = await apiRequest<{
        id: string;
        status: string;
        rider_name: string;
        guarantor_name: string;
        guarantor_phone: string;
      }>(`/api/guarantors/${encodeURIComponent(token)}`);

      if (data.status !== "pending") {
        setView("guarantor-used");
        return;
      }

      setGuarantorCtx({
        token,
        riderName: data.rider_name,
        guarantorName: data.guarantor_name,
        guarantorPhone: data.guarantor_phone,
        guarantorId: data.id,
      });
      setView("guarantor");
    } catch {
      setView("guarantor-error");
    } finally {
      setLoadingGuarantor(false);
    }
  }, []);

  useEffect(() => {
    detectGuarantorRoute();
  }, [detectGuarantorRoute]);

  useEffect(() => {
    const updateHash = () => setCurrentHash(window.location.hash);
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, []);

  const captureRequiredLocation = async (): Promise<LocationData> => {
    if (!window.isSecureContext) {
      throw new Error("Location access requires HTTPS. Open this site using its secure HTTPS address and try again.");
    }
    if (!navigator.geolocation) {
      throw new Error("Location is unavailable in this browser. Use an up-to-date mobile browser with location access enabled.");
    }

    const requestPosition = (options: PositionOptions) => new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });

    let position: GeolocationPosition;
    try {
      position = await requestPosition({ enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
    } catch (firstError) {
      const locationError = firstError as GeolocationPositionError;
      if (locationError.code === locationError.PERMISSION_DENIED) {
        throw new Error("Location permission is blocked. Allow location for this site in your browser settings, then submit again.");
      }
      try {
        position = await requestPosition({ enableHighAccuracy: false, timeout: 35000, maximumAge: 120000 });
      } catch (fallbackError) {
        const fallbackLocationError = fallbackError as GeolocationPositionError;
        if (fallbackLocationError.code === fallbackLocationError.PERMISSION_DENIED) {
          throw new Error("Location permission is blocked. Allow location for this site in your browser settings, then submit again.");
        }
        if (fallbackLocationError.code === fallbackLocationError.TIMEOUT) {
          throw new Error("Your device took too long to determine its location. Turn on device location services, move near a window or outdoors, and try again.");
        }
        throw new Error("Your device could not determine its location. Turn on device location services and try again.");
      }
    }

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      captured_at: new Date(position.timestamp).toISOString(),
    };
  };

  const handleRiderSubmit = async (vals: RiderFormValues) => {
    setSubmitting(true);
    setSubmitError("");
    try {
      const location = await captureRequiredLocation();
      await saveRiderApplication(vals, location);
    } catch (submitFailure) {
      setSubmitError(submitFailure instanceof Error ? submitFailure.message : "Could not submit application. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const saveRiderApplication = async (vals: RiderFormValues, location: LocationData) => {
    const rider = {
      full_name: vals.full_name,
      date_of_birth: vals.date_of_birth,
      place_of_birth: vals.place_of_birth,
      state_of_origin: vals.state_of_origin,
      state_of_origin_city: vals.state_of_origin_city,
      state_of_origin_address: vals.state_of_origin_address,
      phone_number: vals.phone_number,
      email_address: vals.email_address,
      residential_address: vals.residential_address,
      residential_state: vals.residential_state,
      residential_city: vals.residential_city,
      residential_postal_code: vals.residential_postal_code,
      emergency_contact_name: vals.emergency_contact_name,
      emergency_contact_phone: vals.emergency_contact_phone,
      relationship_to_emergency_contact: vals.relationship_to_emergency_contact,
      marital_status: vals.marital_status,
      has_delivery_experience: vals.has_delivery_experience,
      employment_history: vals.employment_history,
      communication_skills: vals.communication_skills,
      motorcycle_safety: vals.motorcycle_safety,
      motorcycle_maintenance: vals.motorcycle_maintenance,
      health_challenge: vals.health_challenge,
      health_details: vals.health_details,
      skills_experience: vals.skills_experience,
      nin: vals.nin,
      location_latitude: location.latitude,
      location_longitude: location.longitude,
      location_accuracy_meters: location.accuracy,
      location_captured_at: location.captured_at,
      work_policy_accepted: vals.work_policy_accepted,
      terms_accepted: vals.terms_accepted,
      terms_signature: vals.terms_signature,
    };
    const formData = new FormData();
    formData.append("rider", JSON.stringify(rider));
    formData.append("guarantors", JSON.stringify([vals.guarantor1, vals.guarantor2]));
    if (vals.nin_document) formData.append("rider_nin_document", vals.nin_document);
    if (vals.identity_card_front) formData.append("rider_identity_card_front", vals.identity_card_front);
    if (vals.identity_card_back) formData.append("rider_identity_card_back", vals.identity_card_back);
    if (vals.video) formData.append("rider_video", vals.video);
    const data = await apiRequest<{
      guarantors: Array<{ name: string; phone_number: string; verification_token: string }>;
      telegram_notification: "sent" | "not_configured" | "failed";
    }>("/api/applications", {
      method: "POST",
      body: formData,
    });

    const origin = window.location.origin + window.location.pathname;
    const linkInfos: GuarantorLinkInfo[] = data.guarantors.map((g: { name: string; phone_number: string; verification_token: string }) => ({
      guarantorName: g.name,
      guarantorPhone: g.phone_number,
      riderName: vals.full_name,
      link: `${origin}#/guarantor/${g.verification_token}`,
    }));

    setLinks(linkInfos);
    setRiderName(vals.full_name);
    setTelegramWarning(data.telegram_notification === "failed"
      ? "Your application was saved, but the administrator notification could not be sent. The application is still received."
      : "");
    setView("success");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleGuarantorSubmit = async (submission: GuarantorSubmission) => {
    setSubmitting(true);
    setSubmitError("");
    try {
      const location = await captureRequiredLocation();
      await saveGuarantorApplication(submission, location);
      setView("guarantor-complete");
    } catch (submitFailure) {
      setSubmitError(submitFailure instanceof Error ? submitFailure.message : "Could not submit verification. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const saveGuarantorApplication = async (submission: GuarantorSubmission, location: LocationData) => {
    if (!guarantorCtx) return;

    const formData = new FormData();
    formData.append("payload", JSON.stringify({
      guarantor_address: submission.guarantor_address,
      guarantor_state: submission.guarantor_state,
      guarantor_city: submission.guarantor_city,
      guarantor_postal_code: submission.guarantor_postal_code,
      state_of_origin: submission.state_of_origin,
      state_of_origin_city: submission.state_of_origin_city,
      state_of_origin_address: submission.state_of_origin_address,
      guarantor_phone_confirmed: submission.guarantor_phone,
      relationship: submission.relationship,
      occupation: submission.occupation,
      nin: submission.nin,
      digital_signature: submission.digital_signature,
      confirmation: submission.confirmation,
      work_policy_accepted: submission.work_policy_accepted,
      location_latitude: location.latitude,
      location_longitude: location.longitude,
      location_accuracy_meters: location.accuracy,
      location_captured_at: location.captured_at,
    }));
    if (submission.nin_document) formData.append("guarantor_nin_document", submission.nin_document);
    if (submission.video) formData.append("guarantor_video", submission.video);
    await apiRequest<{ success: boolean }>(`/api/guarantors/${encodeURIComponent(guarantorCtx.token)}`, {
      method: "POST",
      body: formData,
    });
  };

  const handleNewApplication = () => {
    setView("rider");
    setLinks([]);
    setRiderName("");
    window.location.hash = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ===== Renders =====

  if (currentHash === "#/admin" || window.location.pathname === "/admin" || window.location.pathname.startsWith("/admin/")) {
    const adminPath = window.location.pathname;
    const activePage = adminPath === "/admin/content" ? "content" : adminPath === "/admin/users" ? "users" : adminPath === "/admin/notifications" ? "notifications" : "dashboard";
    return <div className="admin-area">
      <nav className="admin-tabs" aria-label="Administrator sections">
        <a className={activePage === "dashboard" ? "active" : ""} href="/admin/dashboard">Rider applications</a>
        <a className={activePage === "content" ? "active" : ""} href="/admin/content">Form content</a>
        <a className={activePage === "users" ? "active" : ""} href="/admin/users">Administrators</a>
        <a className={activePage === "notifications" ? "active" : ""} href="/admin/notifications">Notifications</a>
      </nav>
      {activePage === "content" || activePage === "users" || activePage === "notifications"
        ? <AdminManagementPage page={activePage} />
        : <AdminDashboard />}
    </div>;
  }

  if (loadingGuarantor) {
    return (
      <div className="loading-screen"><Loader2 className="spin" /><span>Loading verification…</span></div>
    );
  }

  if (view === "guarantor-error") {
    return <Message title="Link not found" body="This guarantor verification link is invalid or has expired. Contact the rider or Vanguard Velocity Delivery for assistance." />;
  }

  if (view === "guarantor-used") {
    return <Message title="Link already used" body="This guarantor verification link has already been submitted. Each link is single-use. Contact Vanguard Velocity Delivery if you believe this is an error." />;
  }

  if (view === "guarantor-complete") {
    return <Message title={text("Verification received")} body={text("Thank you. Your guarantor verification has been securely submitted.")} />;
  }

  if (view === "guarantor" && guarantorCtx) {
    return (
      <div className="min-h-screen bg-slate-50 py-8 px-4">
        <div className="mx-auto max-w-xl">
          <GuarantorForm
            context={guarantorCtx}
            onSubmit={handleGuarantorSubmit}
            busy={submitting}
            error={submitError}
          />
        </div>
      </div>
    );
  }

  if (view === "success") {
    return (
      <div className="min-h-screen bg-slate-50 py-8 px-4">
        <SuccessScreen riderName={riderName} links={links} onNewApplication={handleNewApplication} notificationWarning={telegramWarning} />
      </div>
    );
  }

  // Default: rider form
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="mx-auto max-w-3xl">
        <RiderHeader />
        <RiderForm onSubmit={handleRiderSubmit} busy={submitting} error={submitError} />
      </div>
    </div>
  );
}

function Message({ title, body }: { title: string; body: string }) {
  return <main className="message-screen"><section className="message-panel"><AlertCircle aria-hidden="true" /><h1>{title}</h1><p>{body}</p><a href="/">Vanguard Velocity Delivery</a></section></main>;
}

export default App;
