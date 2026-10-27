import { useEffect, useState } from "react";
import { AddressAutocomplete } from "./AddressAutocomplete";
import { nigerianStates } from "@/lib/nigerianStates";
import { useFormContent } from "../lib/useFormContent";

interface PhotonFeature {
  properties?: {
    city?: string;
    district?: string;
    county?: string;
    state?: string;
    country?: string;
  };
}

interface PhotonResponse {
  features?: PhotonFeature[];
}

interface StateOriginFieldsProps {
  state: string;
  city: string;
  address: string;
  onStateChange: (state: string) => void;
  onCityChange: (city: string) => void;
  onAddressChange: (address: string) => void;
}

export function StateOriginFields({
  state,
  city,
  address,
  onStateChange,
  onCityChange,
  onAddressChange,
}: StateOriginFieldsProps) {
  const { text } = useFormContent();
  const [cities, setCities] = useState<string[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [citiesError, setCitiesError] = useState("");
  const [customCity, setCustomCity] = useState(false);

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

    void fetch(`https://photon.komoot.io/api/?${params}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(text("Could not load cities for this state."));
        return response.json() as Promise<PhotonResponse>;
      })
      .then((data) => {
        const targetState = state.toLocaleLowerCase();
        const localityNames = new Set<string>();
        for (const feature of data.features ?? []) {
          const properties = feature.properties;
          if (properties?.country?.toLocaleLowerCase() !== "nigeria") continue;
          const featureState = properties.state?.toLocaleLowerCase() ?? "";
          const matchesState = featureState === targetState
            || (targetState === "federal capital territory"
              && (featureState.includes("abuja") || featureState.includes("federal capital")));
          if (!matchesState) continue;
          for (const locality of [properties.city, properties.district, properties.county]) {
            if (locality?.trim()) localityNames.add(locality.trim());
          }
        }
        const orderedCities = [...localityNames].sort((a, b) => a.localeCompare(b));
        setCities(orderedCities);
        if (!orderedCities.length) setCitiesError(text("No city list is available for this state. Enter your city manually."));
      })
      .catch((lookupError: unknown) => {
        if (controller.signal.aborted) return;
        setCities([]);
        setCitiesError(lookupError instanceof Error
          ? `${lookupError.message} ${text("Enter your city manually.")}`
          : text("No city list is available for this state. Enter your city manually."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingCities(false);
      });

    return () => controller.abort();
  }, [state, text]);

  return <>
    <div className="field">
      <span>{text("State of origin")} *</span>
      <select
        value={state}
        onChange={(event) => {
          onStateChange(event.target.value);
          onCityChange("");
          onAddressChange("");
          setCustomCity(false);
        }}
        required
      >
        <option value="">{text("Select state")}</option>
        {nigerianStates.map((nigerianState) => <option key={nigerianState} value={nigerianState}>{nigerianState}</option>)}
      </select>
    </div>
    <div className="field">
      <span>{text("City of origin")} *</span>
      <select
        value={customCity ? "Other / not listed" : city}
        onChange={(event) => {
          const nextCity = event.target.value;
          const nextIsCustom = nextCity === "Other / not listed";
          setCustomCity(nextIsCustom);
          onCityChange(nextIsCustom ? "" : nextCity);
          onAddressChange("");
        }}
        disabled={!state || loadingCities}
        required={!customCity}
      >
        <option value="">{loadingCities ? "Loading cities…" : text("Select city")}</option>
        {cities.map((locality) => <option key={locality} value={locality}>{locality}</option>)}
        <option value="Other / not listed">{text("Other / not listed")}</option>
      </select>
      {citiesError && <small className="address-search-error">{citiesError}</small>}
      {customCity && <input
        value={city}
        onChange={(event) => onCityChange(event.target.value)}
        placeholder={text("Enter a city in [state]").replace("[state]", state)}
        autoComplete="address-level2"
        required
      />}
    </div>
    <div className="field field-wide">
      <span>{text("Address in state of origin")} *</span>
      <AddressAutocomplete
        value={address}
        onChange={onAddressChange}
        required
        searchContext={city && state ? `${city}, ${state}, Nigeria` : state ? `${state}, Nigeria` : ""}
      />
    </div>
  </>;
}
