import { City, Country, State } from "country-state-city";

const countryNameToIso = new Map<string, string>();
const stateIsoByCountryAndName = new Map<string, string>();

function stateCacheKey(countryIso: string, stateName: string): string {
  return `${countryIso}|${stateName}`;
}

function ensureCountryIndex(): void {
  if (countryNameToIso.size > 0) return;
  for (const c of Country.getAllCountries()) {
    countryNameToIso.set(c.name, c.isoCode);
  }
}

export const DEFAULT_COUNTRY_NAME = "India";

export function getCountryNames(): string[] {
  ensureCountryIndex();
  return Array.from(countryNameToIso.keys()).sort((a, b) => a.localeCompare(b));
}

export function getCountryIsoCode(countryName: string): string | undefined {
  ensureCountryIndex();
  return countryNameToIso.get(countryName);
}

export function getStateNamesForCountry(countryName: string): string[] {
  const countryIso = getCountryIsoCode(countryName);
  if (!countryIso) return [];

  return State.getStatesOfCountry(countryIso)
    .map((s) => {
      stateIsoByCountryAndName.set(stateCacheKey(countryIso, s.name), s.isoCode);
      return s.name;
    })
    .sort((a, b) => a.localeCompare(b));
}

export function getCityNamesForState(
  countryName: string,
  stateName: string
): string[] {
  const countryIso = getCountryIsoCode(countryName);
  if (!countryIso || !stateName.trim()) return [];

  let stateIso = stateIsoByCountryAndName.get(
    stateCacheKey(countryIso, stateName)
  );
  if (!stateIso) {
    const match = State.getStatesOfCountry(countryIso).find(
      (s) => s.name === stateName
    );
    stateIso = match?.isoCode;
    if (stateIso) {
      stateIsoByCountryAndName.set(
        stateCacheKey(countryIso, stateName),
        stateIso
      );
    }
  }
  if (!stateIso) return [];

  return City.getCitiesOfState(countryIso, stateIso)
    .map((c) => c.name)
    .sort((a, b) => a.localeCompare(b));
}

export function getDefaultCountryName(): string {
  const names = getCountryNames();
  if (names.includes(DEFAULT_COUNTRY_NAME)) return DEFAULT_COUNTRY_NAME;
  return names[0] ?? DEFAULT_COUNTRY_NAME;
}

export function getDefaultStateForCountry(countryName: string): string {
  return getStateNamesForCountry(countryName)[0] ?? "";
}

export function getDefaultCityForState(
  countryName: string,
  stateName: string
): string {
  return getCityNamesForState(countryName, stateName)[0] ?? "";
}
