import { Mail, MapPinned, Phone } from "lucide-react";
import { useFormContent } from "../lib/useFormContent";
import { CompanyLogo } from "./CompanyLogo";

export function RiderHeader() {
  const { text } = useFormContent();
  const email = text("info@vanguardvelocitydelivery.com");
  const phone = text("07073798548");
  return (
    <header className="brand-header rider-brand-header">
      <div className="brand-symbol"><CompanyLogo /></div>
      <div className="brand-title">
        <p className="eyebrow">{text("Vanguard Velocity Delivery")}</p>
        <h1>{text("Dispatch Rider Application")}</h1>
        <div className="guarantor-company-details">
          <a className="company-contact-item" href={`mailto:${email}`}><Mail size={14} aria-hidden="true" />{email}</a>
          <a className="company-contact-item" href={`tel:${phone.replace(/[^\d+]/g, "")}`}><Phone size={14} aria-hidden="true" />{phone}</a>
          <span className="company-contact-item"><MapPinned size={14} aria-hidden="true" /> {text("68 Community Road Pineapple Estate Ololo, Offin Wagbare, Igbogbo, Lagos State")}</span>
        </div>
      </div>
    </header>
  );
}