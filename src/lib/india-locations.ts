import {
  DEFAULT_COUNTRY_NAME,
  getCityNamesForState,
  getDefaultCountryName,
  getDefaultStateForCountry,
  getStateNamesForCountry,
} from "@/lib/locations";

/** @deprecated Use `getStateNamesForCountry("India")` or locations helpers. */
export const INDIA_COUNTRY_CODE = "IN" as const;

export function getIndianStates(): string[] {
  return getStateNamesForCountry(DEFAULT_COUNTRY_NAME);
}

export function getIndianCitiesByState(): Record<string, string[]> {
  const states = getIndianStates();
  const map: Record<string, string[]> = {};
  for (const state of states) {
    map[state] = getCityNamesForState(DEFAULT_COUNTRY_NAME, state);
  }
  return map;
}

export function getCitiesForIndianState(stateName: string): string[] {
  return getCityNamesForState(DEFAULT_COUNTRY_NAME, stateName);
}

export function getAllIndianCities(): string[] {
  const all = new Set<string>();
  for (const state of getIndianStates()) {
    for (const city of getCitiesForIndianState(state)) all.add(city);
  }
  return Array.from(all).sort((a, b) => a.localeCompare(b));
}

export function getDefaultIndianState(): string {
  return getDefaultStateForCountry(getDefaultCountryName());
}
