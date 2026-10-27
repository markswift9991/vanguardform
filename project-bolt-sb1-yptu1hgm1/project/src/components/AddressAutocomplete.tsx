import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { MapPin } from "lucide-react";
import { useFormContent } from "../lib/useFormContent";

interface PhotonFeature {
  properties?: {
    name?: string;
    housenumber?: string;
    street?: string;
    district?: string;
    city?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  searchContext?: string;
}

function formatAddress(feature: PhotonFeature) {
  const address = feature.properties;
  if (!address) return "";
  const street = [address.housenumber, address.street].filter(Boolean).join(" ");
  return [...new Set([
    street || address.name,
    address.district,
    address.city || address.county,
    address.state,
    address.postcode,
    address.country,
  ].filter((part): part is string => Boolean(part)))].join(", ");
}

export function AddressAutocomplete({ value, onChange, required = false, searchContext = "" }: AddressAutocompleteProps) {
  const { text } = useFormContent();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const selectedAddress = useRef<string | null>(null);
  const listId = useRef(`address-suggestions-${crypto.randomUUID()}`);

  useEffect(() => {
    if (selectedAddress.current === value) {
      selectedAddress.current = null;
      return;
    }
    selectedAddress.current = null;
    const query = value.trim();
    if (query.length < 3) {
      setSuggestions([]);
      setError("");
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({
        q: [query, searchContext].filter(Boolean).join(", "),
        lat: "9.08",
        lon: "8.67",
        limit: "5",
        lang: "en",
      });
      void fetch(`https://photon.komoot.io/api/?${params}`, { signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) throw new Error(text("Address suggestions are temporarily unavailable."));
          return response.json() as Promise<{ features?: PhotonFeature[] }>;
        })
        .then((data) => {
          const addresses = (data.features ?? []).map(formatAddress).filter(Boolean);
          setSuggestions([...new Set(addresses)].slice(0, 5));
          setActiveIndex(-1);
        })
        .catch((searchError: unknown) => {
          if (controller.signal.aborted) return;
          setSuggestions([]);
          setError(searchError instanceof Error ? searchError.message : text("Address suggestions are temporarily unavailable."));
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 450);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchContext, text, value]);

  const chooseAddress = (address: string) => {
    selectedAddress.current = address;
    onChange(address);
    setSuggestions([]);
    setError("");
    setActiveIndex(-1);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && suggestions.length) {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % suggestions.length);
    } else if (event.key === "ArrowUp" && suggestions.length) {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      chooseAddress(suggestions[activeIndex]);
    } else if (event.key === "Escape") {
      setSuggestions([]);
      setActiveIndex(-1);
    }
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value);

  return <div className="address-autocomplete">
    <input
      type="text"
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder={text("Start typing your address")}
      autoComplete="street-address"
      required={required}
      role="combobox"
      aria-autocomplete="list"
      aria-expanded={suggestions.length > 0}
      aria-controls={listId.current}
      aria-activedescendant={activeIndex >= 0 ? `${listId.current}-${activeIndex}` : undefined}
    />
    {loading && <span className="address-search-status" role="status">{text("Searching addresses…")}</span>}
    {error && <span className="address-search-status address-search-error" role="status">{error} {text("You can enter the full address manually.")}</span>}
    {suggestions.length > 0 && <ul id={listId.current} className="address-suggestions" role="listbox">
      {suggestions.map((address, index) => <li key={`${address}-${index}`} role="presentation">
        <button
          id={`${listId.current}-${index}`}
          type="button"
          role="option"
          aria-selected={index === activeIndex}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => chooseAddress(address)}
        >
          <MapPin size={15} aria-hidden="true" />
          <span>{address}</span>
        </button>
      </li>)}
    </ul>}
    <span className="address-search-status">Address text is sent to Photon (OpenStreetMap) to find suggestions. Suggestions are optional.</span>
  </div>;
}
