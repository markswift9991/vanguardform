import { useState } from "react";
import { CheckCircle2, Copy, ExternalLink, MessageCircle, RotateCcw } from "lucide-react";
import { useFormContent } from "../lib/useFormContent";

export interface GuarantorLinkInfo { guarantorName: string; guarantorPhone: string; riderName: string; link: string }

export function SuccessScreen({ riderName, links, onNewApplication, notificationWarning = "" }: { riderName: string; links: GuarantorLinkInfo[]; onNewApplication: () => void; notificationWarning?: string }) {
  const { text } = useFormContent();
  const [copied, setCopied] = useState<number | null>(null);
  const copy = async (link: string, index: number) => { await navigator.clipboard.writeText(link); setCopied(index); };
  return <section className="success-panel"><div className="success-mark"><CheckCircle2 size={30} /></div><p className="eyebrow">{text("Application received")}</p><h1>{text("Thank you, [riderName]").replace("[riderName]", riderName)}</h1><p className="intro-copy">{text("Your application is saved. Guarantor forms are now available through these private links. Each guarantor should open and complete only their own form.")}</p>{notificationWarning && <p className="error-banner notification-warning" role="status">{notificationWarning}</p>}<div className="link-list">{links.map((item, index) => {
    const message = `Hello ${item.guarantorName}, ${item.riderName} has listed you as a guarantor for Vanguard Velocity Delivery. Please complete your verification using this secure link: ${item.link}`;
    const whatsappLink = `https://wa.me/?text=${encodeURIComponent(message)}`;
    return <div className="link-item" key={item.link}><div><strong>{item.guarantorName}</strong><span>{item.guarantorPhone}</span></div><a className="button button-secondary review-form-link" href={item.link} target="_blank" rel="noreferrer" aria-label={`Review ${item.guarantorName}'s guarantor form`}><ExternalLink size={16} /> Review form</a><button className="icon-button" type="button" onClick={() => void copy(item.link, index)} aria-label="Copy guarantor link"><Copy size={17} /></button><a className="button whatsapp-button" href={whatsappLink} target="_blank" rel="noreferrer" aria-label={`Share ${item.guarantorName}'s link on WhatsApp`}><MessageCircle size={16} /> WhatsApp</a>{copied === index && <small>Copied</small>}</div>;
  })}</div><button className="button button-secondary" type="button" onClick={onNewApplication}><RotateCcw size={16} /> {text("Start another application")}</button></section>;
}