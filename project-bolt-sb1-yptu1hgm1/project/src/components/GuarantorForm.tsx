import { useEffect, useRef, useState, type FormEvent } from "react";
import { AlertCircle, Mail, MapPinned, Phone, Scale, ShieldCheck } from "lucide-react";
import { AddressAutocomplete } from "./AddressAutocomplete";
import { DocumentScanner } from "./CameraPhotoCapture";
import { NigeriaLocationFields } from "./NigeriaLocationFields";
import { StateOriginFields } from "./StateOriginFields";
import { VideoRecordingCapture } from "./VideoRecordingCapture";
import { useFormContent } from "../lib/useFormContent";
import { CompanyLogo } from "./CompanyLogo";
import type { GuarantorContext, GuarantorSubmission } from "../types";

export function GuarantorForm({ context, onSubmit, busy, error }: { context: GuarantorContext; onSubmit: (values: GuarantorSubmission) => void; busy: boolean; error: string }) {
  const { text: t } = useFormContent();
  const companyEmail = t("info@vanguardvelocitydelivery.com");
  const companyPhone = t("07073798548");
  const [values, setValues] = useState<GuarantorSubmission>({ guarantor_address: "", guarantor_state: "", guarantor_city: "", guarantor_postal_code: "", state_of_origin: "", state_of_origin_city: "", state_of_origin_address: "", guarantor_phone: context.guarantorPhone, relationship: "", occupation: "", nin: "", nin_document: null, video: null, digital_signature: "", confirmation: false, work_policy_accepted: false, location: null });
  const [validationError, setValidationError] = useState("");
  const submitErrorRef = useRef<HTMLDivElement>(null);
  const submitMessage = error || validationError;
  useEffect(() => {
    if (!submitMessage) return;
    const frame = window.requestAnimationFrame(() => {
      submitErrorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      submitErrorRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [submitMessage]);
  const set = <K extends keyof GuarantorSubmission>(key: K, value: GuarantorSubmission[K]) => setValues((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^\d{11}$/.test(values.nin)) { setValidationError(t("Enter the NIN as exactly 11 digits.")); return; }
    if (!values.nin_document) { setValidationError(t("Add your NIN document before submitting.")); return; }
    if (!values.video) { setValidationError(t("Add your video verification before submitting.")); return; }
    if (!values.work_policy_accepted) { setValidationError(t("Read and accept the work policy and legal declaration before submitting.")); return; }
    setValidationError("");
    onSubmit({ ...values, location: null });
  };

  return <form className="application-form guarantor-form" onSubmit={submit}>
    <div className="form-intro guarantor-form-header">
      <div className="guarantor-header-content">
        <div className="guarantor-header-logo"><CompanyLogo /></div>
        <p className="eyebrow">{t("Vanguard Velocity Delivery")}</p>
        <h1>{t("Guarantor Verification")}</h1>
        <p className="intro-copy">{t("You are verifying the application of")} <strong>{context.riderName}</strong>.</p>
        <div className="guarantor-company-details">
          <a className="company-contact-item" href={`mailto:${companyEmail}`}><Mail size={14} aria-hidden="true" />{companyEmail}</a>
          <a className="company-contact-item" href={`tel:${companyPhone.replace(/[^\d+]/g, "")}`}><Phone size={14} aria-hidden="true" />{companyPhone}</a>
          <span className="company-contact-item"><MapPinned size={14} aria-hidden="true" />{t("68 Community Road Pineapple Estate Ololo, Offin Wagbare, Igbogbo, Lagos State")}</span>
        </div>
      </div>
    </div>
    <section className="legal-declaration" aria-labelledby="legal-declaration-title">
      <div className="legal-declaration-icon"><Scale aria-hidden="true" /></div>
      <div>
        <h2 id="legal-declaration-title">{t("Legal declaration")}</h2>
        <p>{t("By filling out this form, you, as the guarantor, legally vouch for the integrity of the rider and accept full financial and legal liability for any breach, damages, or non-compliance that may arise during their engagement as a dispatch rider with Vanguard Velocity Delivery. This declaration is binding and will be used as part of the company’s verification process.")}</p>
      </div>
    </section>
    <section className="form-section">
      <div className="section-heading"><div><h2>{t("Guarantor information")}</h2><p>{t("Complete this form yourself; this private link can only be used once.")}</p></div></div>
      <div className="form-grid">
        <ReadonlyField label="Full name" value={context.guarantorName} />
        <ReadonlyField label="Phone number on invitation" value={context.guarantorPhone} />
        <div className="location-fields-heading"><h3>{t("State of origin")}</h3><p>{t("Provide the state, city, and address where you are from.")}</p></div>
        <StateOriginFields
          state={values.state_of_origin}
          city={values.state_of_origin_city}
          address={values.state_of_origin_address}
          onStateChange={(value) => set("state_of_origin", value)}
          onCityChange={(value) => set("state_of_origin_city", value)}
          onAddressChange={(value) => set("state_of_origin_address", value)}
        />
        <div className="location-fields-heading"><h3>{t("Residential location")}</h3><p>{t("Select your residential state and city / area to look up the postal code.")}</p></div>
        <div className="field field-wide"><span>{t("Residential address")} *</span><AddressAutocomplete value={values.guarantor_address} onChange={(value) => set("guarantor_address", value)} required /></div>
        <NigeriaLocationFields
          state={values.guarantor_state}
          city={values.guarantor_city}
          postalCode={values.guarantor_postal_code}
          onStateChange={(value) => set("guarantor_state", value)}
          onCityChange={(value) => set("guarantor_city", value)}
          onPostalCodeChange={(value) => set("guarantor_postal_code", value)}
        />
        <TextField label="Phone number confirmation" type="tel" value={values.guarantor_phone} onChange={(value) => set("guarantor_phone", value)} required />
        <TextField label="Relationship to rider" value={values.relationship} onChange={(value) => set("relationship", value)} required />
        <TextField label="Occupation" value={values.occupation} onChange={(value) => set("occupation", value)} required />
        <NinField value={values.nin} onChange={(value) => set("nin", value)} />
        <div className="field field-wide"><span>{t("NIN document scan")} *</span><DocumentScanner documentLabel={t("NIN document scan")} onCapture={(file) => set("nin_document", file)} /></div>
        <div className="field field-wide">
          <span>{t("Video verification")} *</span>
          <VideoRecordingCapture
            fullName={context.guarantorName}
            riderName={context.riderName}
            nin={values.nin}
            script={t("My name is [Full Name]. My NIN is [NIN Number]. I am a guarantor for [Rider Full Name], who is applying as a dispatch rider for Vanguard Velocity Delivery. I have reviewed the company rules and agree to support the rider in following them and to cooperate with Vanguard Velocity Delivery if the rider does not comply.")}
            onCapture={(file) => set("video", file)}
          />
        </div>
        <TextField label="Digital signature (type full name)" value={values.digital_signature} onChange={(value) => set("digital_signature", value)} required />
      </div>
      <label className="check-line terms-check"><input type="checkbox" checked={values.confirmation} onChange={(event) => set("confirmation", event.target.checked)} required /><span>{t("I confirm that the information I provided is accurate.")}</span></label>
    </section>
    <section className="form-section">
      <div className="section-heading"><div><h2>{t("Work policy")}</h2><p>{t("Review the rider’s order-logging requirement.")}</p></div></div>
      <div className="policy-callout"><div className="policy-callout-icon"><ShieldCheck aria-hidden="true" /></div><div><h3>{t("Rider work policy")}</h3><p>{t("The rider may accept third-party platform orders and work offline only if every order is logged on the registered company account.")}</p></div></div>
    </section>
    <div className="submit-bar guarantor-submit-bar">
      <label className="check-line terms-check guarantor-submit-ack">
        <input type="checkbox" checked={values.work_policy_accepted} onChange={(event) => set("work_policy_accepted", event.target.checked)} required />
        <span>{t("I have read and agree to the Work Policy and the Legal Declaration above, including the guarantor responsibility described in it.")}</span>
      </label>
      {submitMessage && <div ref={submitErrorRef} className="error-banner submit-error" role="alert" tabIndex={-1}><AlertCircle size={18} />{submitMessage}</div>}
      <button className="button button-primary" type="submit" disabled={busy}>{busy ? t("Locating and submitting…") : t("Submit verification")}</button>
    </div>
  </form>;
}

function TextField({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  const { text } = useFormContent();
  return <label className="field"><span>{text(label)}{required && " *"}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} /></label>;
}

function NinField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { text } = useFormContent();
  return <label className="field"><span>{text("National Identification Number (NIN)")} *</span><input inputMode="numeric" autoComplete="off" maxLength={11} pattern="[0-9]{11}" title={text("Enter exactly 11 digits")} value={value} onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 11))} required /></label>;
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  const { text } = useFormContent();
  return <label className="field"><span>{text(label)}</span><input value={value} readOnly /></label>;
}
