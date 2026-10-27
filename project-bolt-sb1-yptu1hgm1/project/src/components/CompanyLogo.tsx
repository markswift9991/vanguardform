import { useEffect, useState } from "react";
import { Bike } from "lucide-react";

export function CompanyLogo({ className = "" }: { className?: string }) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    void fetch(`/api/company-logo?v=${Date.now()}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const contentType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
        if (!contentType || !["image/png", "image/jpeg", "image/webp"].includes(contentType)) return;
        const logoBlob = await response.blob();
        objectUrl = URL.createObjectURL(logoBlob);
        if (active) setLogoUrl(objectUrl);
        else URL.revokeObjectURL(objectUrl);
      })
      .catch(() => {
        if (active) setLogoUrl(null);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, []);

  if (logoUrl) return <img className={`company-logo ${className}`} src={logoUrl} alt="Vanguard Velocity Delivery logo" />;
  return <Bike className={className} size={25} aria-hidden="true" />;
}
