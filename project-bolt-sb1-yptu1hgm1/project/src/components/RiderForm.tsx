import { useEffect, useRef, useState, type FormEvent } from "react";
import { AlertCircle, Plus, Trash2 } from "lucide-react";
import { AddressAutocomplete } from "./AddressAutocomplete";
import { DocumentScanner } from "./CameraPhotoCapture";
import { NigeriaLocationFields } from "./NigeriaLocationFields";
import { StateOriginFields } from "./StateOriginFields";
import { TermsConditions } from "./TermsConditions";
import { VideoRecordingCapture } from "./VideoRecordingCapture";
import { nigerianStates } from "../lib/nigerianStates";
import { useFormContent } from "../lib/useFormContent";
import type { EmploymentEntry, RiderFormValues } from "../types";

const emptyEmployment: EmploymentEntry = { company_name: "", supervisor_name: "", contact_phone: "", dates_of_employment: "", goods_delivered: "" };

export function RiderForm({ onSubmit, busy, error }: { onSubmit: (values: RiderFormValues) => void; busy: boolean; error: string }) {
  const { text: t } = useFormContent();
  const [values, setValues] = useState<RiderFormValues>({ full_name: "", date_of_birth: "", place_of_birth: "", state_of_origin: "", state_of_origin_city: "", state_of_origin_address: "", residential_address: "", residential_state: "", residential_city: "", residential_postal_code: "", phone_number: "", email_address: "", marital_status: "", emergency_contact_name: "", emergency_contact_phone: "", relationship_to_emergency_contact: "", has_delivery_experience: null, employment_history: [], communication_skills: null, motorcycle_safety: null, motorcycle_maintenance: null, health_challenge: null, health_details: "", skills_experience: "", nin: "", nin_document: null, identity_card_front: null, identity_card_back: null, video: null, guarantor1: { name: "", phone_number: "" }, guarantor2: { name: "", phone_number: "" }, location: null, work_policy_accepted: false, terms_accepted: false, terms_signature: "" });
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
  const set = <K extends keyof RiderFormValues>(key: K, value: RiderFormValues[K]) => setValues((current) => ({ ...current, [key]: value }));
  const setGuarantor = (index: 1 | 2, key: "name" | "phone_number", value: string) => { const property = index === 1 ? "guarantor1" : "guarantor2"; set(property, { ...values[property], [key]: value }); };
  const setEmployment = (index: number, key: keyof EmploymentEntry, value: string) => set("employment_history", values.employment_history.map((item, i) => i === index ? { ...item, [key]: value } : item));
  const setExperience = (value: boolean) => {
    setValues((current) => ({ ...current, has_delivery_experience: value, employment_history: value && current.employment_history.length === 0 ? [{ ...emptyEmployment }] : current.employment_history }));
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!values.work_policy_accepted) { setValidationError(t("Review and accept the earnings and work policy before submitting.")); return; }
    if (!/^\d{11}$/.test(values.nin)) { setValidationError(t("Enter the NIN as exactly 11 digits.")); return; }
    if (!values.nin_document) { setValidationError(t("Add the rider's NIN document before submitting.")); return; }
    if (!values.identity_card_front || !values.identity_card_back) { setValidationError(t("Scan both the front and back of the rider identity card before submitting.")); return; }
    if (!values.video) { setValidationError(t("Add the rider's video verification before submitting.")); return; }
    if (values.has_delivery_experience && !values.employment_history.some((item) => item.company_name.trim())) { setValidationError(t("Add at least one previous employer, or select No for prior experience.")); return; }
    setValidationError("");
    onSubmit({ ...values, location: null, skills_experience: values.has_delivery_experience ? "Previous delivery experience" : "No previous delivery experience" });
  };

  return <form className="application-form" onSubmit={submit}>
    <section className="form-section"><Section title={t("Earnings and work policy")} sub={t("Please review the earnings allocation and operating requirements before continuing.")} />
      <div className="earnings-copy">
        <p><strong>{t("Total earnings structure:")}</strong> {t("All earnings are allocated as follows: 30% for petrol to cover fuel, 30% for the rider as the rider’s share, 30% for company operations, and 10% for vehicle maintenance. These allocations make up 100% of total earnings.")}</p>
        <p><strong>{t("Operational requirements:")}</strong> {t("Riders may accept orders from third-party delivery platforms and may work offline. Every order accepted or completed, regardless of source, must also be accurately logged on the registered Vanguard Velocity Delivery company account. Riders are expected to follow company delivery procedures, use assigned vehicles responsibly, and comply with all applicable safety requirements.")}</p>
      </div>
      <label className="check-line terms-check policy-ack"><input type="checkbox" checked={values.work_policy_accepted} onChange={(event) => set("work_policy_accepted", event.target.checked)} required /><span>{t("I have read and understood the earnings allocation and agree to follow the Work Policy, including logging every order on my registered company account.")}</span></label>
    </section>
    <section className="form-section"><Section title={t("Personal information")} sub={t("Your contact and next-of-kin details")} /><div className="form-grid">
      <TextField label="Full name" required value={values.full_name} onChange={(v) => set("full_name", v)} />
      <TextField label="Date of birth (DD/MM/YYYY)" required type="date" value={values.date_of_birth} onChange={(v) => set("date_of_birth", v)} />
      <SelectField label="Place of birth" value={values.place_of_birth} onChange={(v) => set("place_of_birth", v)} options={nigerianStates} required />
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
      <div className="field field-wide"><span>{t("Residential address")} *</span><AddressAutocomplete value={values.residential_address} onChange={(value) => set("residential_address", value)} required /></div>
      <NigeriaLocationFields
        state={values.residential_state}
        city={values.residential_city}
        postalCode={values.residential_postal_code}
        onStateChange={(value) => set("residential_state", value)}
        onCityChange={(value) => set("residential_city", value)}
        onPostalCodeChange={(value) => set("residential_postal_code", value)}
      />
      <TextField label="Phone number" required type="tel" value={values.phone_number} onChange={(v) => set("phone_number", v)} />
      <TextField label="Email address" type="email" value={values.email_address} onChange={(v) => set("email_address", v)} />
      <SelectField label="Marital status" value={values.marital_status} onChange={(v) => set("marital_status", v)} options={["Single", "Married", "Separated", "Widowed"]} />
      <TextField label="Next of kin full name" required value={values.emergency_contact_name} onChange={(v) => set("emergency_contact_name", v)} />
      <TextField label="Next of kin phone number" required type="tel" value={values.emergency_contact_phone} onChange={(v) => set("emergency_contact_phone", v)} />
      <TextField label="Relationship to next of kin" required value={values.relationship_to_emergency_contact} onChange={(v) => set("relationship_to_emergency_contact", v)} />
    </div></section>
    <section className="form-section"><Section title="Driving and delivery experience" sub="Previous dispatch or delivery work" /><Choice label="Do you have prior experience as a dispatch rider or delivery personnel?" value={values.has_delivery_experience} onChange={setExperience} />
      {values.has_delivery_experience && <div className="repeat-list">{values.employment_history.map((item, index) => <div className="repeat-item" key={index}><div className="repeat-title"><strong>{t("Previous employer")} {index + 1}</strong>{values.employment_history.length > 1 && <button className="icon-button danger" type="button" aria-label={t("Remove employer")} onClick={() => set("employment_history", values.employment_history.filter((_, i) => i !== index))}><Trash2 size={16} /></button>}</div><div className="form-grid"><TextField label="Company name" value={item.company_name} onChange={(v) => setEmployment(index, "company_name", v)} /><TextField label="Contact person / supervisor name" value={item.supervisor_name} onChange={(v) => setEmployment(index, "supervisor_name", v)} /><TextField label="Contact phone number" type="tel" value={item.contact_phone} onChange={(v) => setEmployment(index, "contact_phone", v)} /><TextField label="Dates of employment (from - to)" value={item.dates_of_employment} onChange={(v) => setEmployment(index, "dates_of_employment", v)} /><TextField label="Type of goods delivered" wide value={item.goods_delivered} onChange={(v) => setEmployment(index, "goods_delivered", v)} /></div></div>)}<button className="button button-secondary" type="button" onClick={() => set("employment_history", [...values.employment_history, { ...emptyEmployment }])}><Plus size={16} /> {t("Add employer")}</button></div>}
    </section>
    <section className="form-section"><Section title="Skills and abilities" sub="Safety, communication, and fitness for duties" /><div className="choice-list"><Choice label="Do you possess good communication skills?" value={values.communication_skills} onChange={(value) => set("communication_skills", value)} /><Choice label="Are you able to operate a motorcycle safely and efficiently?" value={values.motorcycle_safety} onChange={(value) => set("motorcycle_safety", value)} /><Choice label="Do you have basic mechanical knowledge of motorcycles?" value={values.motorcycle_maintenance} onChange={(value) => set("motorcycle_maintenance", value)} /><Choice label="Do you have a health challenge or medical condition that may affect your ability to perform dispatch duties safely?" value={values.health_challenge} onChange={(value) => set("health_challenge", value)} /></div>{values.health_challenge && <label className="field health-details"><span>Describe the condition and any necessary accommodation</span><textarea rows={3} value={values.health_details} onChange={(event) => set("health_details", event.target.value)} /></label>}</section>
    <section className="form-section"><Section title="Identity and guarantors" sub="Your identity documents and two guarantor contacts" /><div className="form-grid"><NinField value={values.nin} onChange={(value) => set("nin", value)} /><div className="field field-wide"><span>{t("NIN document scan")} *</span><DocumentScanner documentLabel={t("NIN document scan")} onCapture={(file) => set("nin_document", file)} /></div><div className="field field-wide"><span>{t("Rider identity card — front")} *</span><DocumentScanner documentLabel={t("Rider identity card — front")} onCapture={(file) => set("identity_card_front", file)} /></div><div className="field field-wide"><span>{t("Rider identity card — back")} *</span><DocumentScanner documentLabel={t("Rider identity card — back")} onCapture={(file) => set("identity_card_back", file)} /></div><div className="field field-wide"><span>{t("Video verification")} *</span><VideoRecordingCapture fullName={values.full_name} nin={values.nin} script={t("My name is [Full Name]. My NIN is [NIN Number]. I am applying as a dispatch rider for Vanguard Velocity Delivery, and I agree to take full liability and responsibility for the vehicle assigned to me under company rules.")} onCapture={(file) => set("video", file)} /></div></div><h3 className="subsection-title">{t("Guarantor details")}</h3><div className="form-grid">{([1, 2] as const).map((index) => <div className="guarantor-card" key={index}><strong>{t("Guarantor")} {index}</strong><TextField label="Full name" required value={values[`guarantor${index}`].name} onChange={(v) => setGuarantor(index, "name", v)} /><TextField label="Phone number" required type="tel" value={values[`guarantor${index}`].phone_number} onChange={(v) => setGuarantor(index, "phone_number", v)} /></div>)}</div></section>
    <TermsConditions accepted={values.terms_accepted} signature={values.terms_signature} onAccepted={(v) => set("terms_accepted", v)} onSignature={(v) => set("terms_signature", v)} />
    <div className="submit-bar"><div className="submit-bar-message"><p>{t("Your information is submitted securely for application review.")}</p>{submitMessage && <div ref={submitErrorRef} className="error-banner submit-error" role="alert" tabIndex={-1}><AlertCircle size={18} />{submitMessage}</div>}</div><button className="button button-primary" type="submit" disabled={busy}>{busy ? t("Locating and submitting…") : t("Submit application")}</button></div>
  </form>;
}

function Section({ title, sub }: { title: string; sub: string }) { const { text } = useFormContent(); return <div className="section-heading"><div><h2>{text(title)}</h2><p>{text(sub)}</p></div></div>; }
function NinField({ value, onChange }: { value: string; onChange: (value: string) => void }) { const { text } = useFormContent(); return <label className="field"><span>{text("National Identification Number (NIN)")} *</span><input inputMode="numeric" autoComplete="off" maxLength={11} pattern="[0-9]{11}" title={text("Enter exactly 11 digits")} value={value} onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 11))} required /></label>; }
function TextField({ label, value, onChange, type = "text", required = false, wide = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; wide?: boolean }) { const { text } = useFormContent(); return <label className={`field${wide ? " field-wide" : ""}`}><span>{text(label)}{required && " *"}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} /></label>; }
function SelectField({ label, value, onChange, options, required = false }: { label: string; value: string; onChange: (value: string) => void; options: readonly string[]; required?: boolean }) { const { text } = useFormContent(); return <label className="field"><span>{text(label)}{required && " *"}</span><select value={value} onChange={(event) => onChange(event.target.value)} required={required}><option value="">{text("Select")}</option>{options.map((option) => <option key={option}>{text(option)}</option>)}</select></label>; }
function Choice({ label, value, onChange }: { label: string; value: boolean | null; onChange: (value: boolean) => void }) { const { text } = useFormContent(); return <fieldset className="choice-field"><legend>{text(label)}</legend><label><input type="radio" name={label} checked={value === true} onChange={() => onChange(true)} required /> {text("Yes")}</label><label><input type="radio" name={label} checked={value === false} onChange={() => onChange(false)} /> {text("No")}</label></fieldset>; }