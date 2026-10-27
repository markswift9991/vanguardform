import { useEffect, useRef, useState } from "react";
import { nigerianStates } from "@/lib/nigerianStates";
import { useFormContent } from "../lib/useFormContent";

interface PhotonFeature {
  properties?: {
    city?: string;
    district?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

interface PhotonResponse {
  features?: PhotonFeature[];
}

interface NigeriaLocationFieldsProps {
  state: string;
  city: string;
  postalCode: string;
  onStateChange: (state: string) => void;
  onCityChange: (city: string) => void;
  onPostalCodeChange: (postalCode: string) => void;
}

const geocoderUrl = "https://photon.komoot.io/api/";

function normalize(value: string) {
  return value.trim().toLocaleLowerCase();
}

function isNigeriaFeature(feature: PhotonFeature) {
  return normalize(feature.properties?.country ?? "") === "nigeria";
}

function matchesState(feature: PhotonFeature, selectedState: string) {
  const featureState = normalize(feature.properties?.state ?? "");
  const targetState = normalize(selectedState);
  if (featureState === targetState) return true;
  return targetState === "federal capital territory"
    && (featureState.includes("abuja") || featureState.includes("federal capital"));
}

function featureLocalities(feature: PhotonFeature) {
  const properties = feature.properties;
  return [properties?.city, properties?.district, properties?.county]
    .filter((value): value is string => Boolean(value?.trim()));
}

export function NigeriaLocationFields({
  state,
  city,
  postalCode,
  onStateChange,
  onCityChange,
  onPostalCodeChange,
}: NigeriaLocationFieldsProps) {
  const { text } = useFormContent();
  const [cities, setCities] = useState<string[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingPostalCode, setLoadingPostalCode] = useState(false);
  const [citiesError, setCitiesError] = useState("");
  const [postalCodeMessage, setPostalCodeMessage] = useState("");
  const postalCodeChangeRef = useRef(onPostalCodeChange);
  postalCodeChangeRef.current = onPostalCodeChange;

  useEffect(() => {
    if (!state) {
      setCities([]);
      setCitiesError("");
      setLoadingCities(false);
      return;
    }

    const controller = new AbortController();
    setLoadingCities(true);
    setCitiesError("");
    const params = new URLSearchParams({ q: `${state}, Nigeria`, limit: "100", lang: "en" });
    void fetch(`${geocoderUrl}?${params}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(text("Could not load areas for this state."));
        return response.json() as Promise<PhotonResponse>;
      })
      .then((data) => {
        const localities = new Set<string>();
        for (const feature of data.features ?? []) {
          if (!isNigeriaFeature(feature) || !matchesState(feature, state)) continue;
          featureLocalities(feature).forEach((locality) => localities.add(locality.trim()));
        }
        setCities([...localities].sort((a, b) => a.localeCompare(b)));
        if (!localities.size) setCitiesError(text("No city or area list was returned. Please try again later."));
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setCities([]);
        setCitiesError(error instanceof Error ? error.message : text("Could not load areas for this state."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingCities(false);
      });

    return () => controller.abort();
  }, [state, text]);

  useEffect(() => {
    if (!state || !city) {
      setLoadingPostalCode(false);
      setPostalCodeMessage("");
      return;
    }
    if (city === "Other / not listed") {
      postalCodeChangeRef.current("");
      setLoadingPostalCode(false);
      setPostalCodeMessage(text("Enter the postal code manually for this area."));
      return;
    }

    const controller = new AbortController();
    setLoadingPostalCode(true);
    setPostalCodeMessage("");
    const params = new URLSearchParams({ q: `${city}, ${state}, Nigeria`, limit: "30", lang: "en" });
    void fetch(`${geocoderUrl}?${params}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(text("Could not fetch the postal code for this area."));
        return response.json() as Promise<PhotonResponse>;
      })
      .then((data) => {
        const targetCity = normalize(city);
        const postalCodes = (data.features ?? [])
          .filter((feature) => isNigeriaFeature(feature) && matchesState(feature, state))
          .filter((feature) => featureLocalities(feature).some((locality) => normalize(locality) === targetCity))
          .map((feature) => feature.properties?.postcode?.trim() ?? "")
          .filter(Boolean);
        const postalCodeValue = postalCodes[0] ?? "";
        postalCodeChangeRef.current(postalCodeValue);
        setPostalCodeMessage(postalCodeValue
          ? text("Postal code found from Photon (OpenStreetMap). Confirm it matches your exact address.")
          : text("No postal code was found for this area. You can enter it manually."));
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        postalCodeChangeRef.current("");
        setPostalCodeMessage(error instanceof Error
          ? `${error.message} ${text("You can enter it manually.")}`
          : text("Could not fetch a postal code. You can enter it manually."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingPostalCode(false);
      });

    return () => controller.abort();
  }, [city, state, text]);

  return <>
    <div className="field">
      <span>{text("Residential state")} *</span>
      <select
        value={state}
        onChange={(event) => {
          onStateChange(event.target.value);
          onCityChange("");
          onPostalCodeChange("");
        }}
        required
      >
        <option value="">{text("Select state")}</option>
        {nigerianStates.map((nigerianState) => <option key={nigerianState} value={nigerianState}>{nigerianState}</option>)}
      </select>
    </div>
    <div className="field">
      <span>{text("City / area")} *</span>
      <select
        value={city}
        onChange={(event) => {
          onCityChange(event.target.value);
          onPostalCodeChange("");
        }}
        disabled={!state || loadingCities}
        required
      >
        <option value="">{loadingCities ? "Loading areas…" : text("Select city or area")}</option>
        {cities.map((locality) => <option key={locality} value={locality}>{locality}</option>)}
        <option value="Other / not listed">{text("Other / not listed")}</option>
      </select>
      {citiesError && <small className="address-search-error">{citiesError}</small>}
    </div>
    <label className="field">
      <span>{text("ZIP / postal code")}</span>
      <input
        inputMode="numeric"
        autoComplete="postal-code"
        value={postalCode}
        onChange={(event) => onPostalCodeChange(event.target.value)}
        placeholder={loadingPostalCode ? text("Fetching postal code…") : text("Filled when available; confirm or edit")}
        maxLength={12}
        disabled={!city || loadingPostalCode && city !== "Other / not listed"}
      />
      {postalCodeMessage && <small>{postalCodeMessage}</small>}
    </label>
  </>;
}
