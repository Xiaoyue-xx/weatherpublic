import { CHARACTER_PRESENTATIONS, OUTFIT_STYLES, SKIN_TONES } from "../data/content.js";

export const STORAGE_KEY = "what-to-wear.settings.v1";
export const STORAGE_VERSION = 1;
export const UNIT_SYSTEMS = Object.freeze(["fahrenheit", "celsius"]);

export const DEFAULT_SETTINGS = Object.freeze({
  latestLocation: null,
  units: "fahrenheit",
  character: "waves",
  skinTone: "medium",
  style: "campus-casual",
});

function finiteCoordinate(value, minimum, maximum) {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum;
}

export function sanitizePersistedLocation(location) {
  if (
    !location
    || typeof location.name !== "string"
    || typeof location.label !== "string"
    || !finiteCoordinate(location.latitude, -90, 90)
    || !finiteCoordinate(location.longitude, -180, 180)
  ) {
    return null;
  }

  return Object.freeze({
    id: Number.isInteger(location.id) ? location.id : null,
    name: location.name,
    label: location.label,
    admin1: typeof location.admin1 === "string" ? location.admin1 : null,
    countryCode: location.countryCode === "US" ? "US" : null,
    latitude: Number(location.latitude.toFixed(3)),
    longitude: Number(location.longitude.toFixed(3)),
    timezone: typeof location.timezone === "string" ? location.timezone : null,
  });
}

export function loadPersistedSettings(storage) {
  if (!storage || typeof storage.getItem !== "function") return DEFAULT_SETTINGS;

  try {
    const serialized = storage.getItem(STORAGE_KEY);
    if (!serialized) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(serialized);
    if (parsed?.version !== STORAGE_VERSION) return DEFAULT_SETTINGS;

    return Object.freeze({
      latestLocation: sanitizePersistedLocation(parsed.latestLocation),
      units: UNIT_SYSTEMS.includes(parsed.units) ? parsed.units : DEFAULT_SETTINGS.units,
      character: CHARACTER_PRESENTATIONS.includes(parsed.character)
        ? parsed.character
        : parsed.character === "male" ? "crop"
          : parsed.character === "female" ? "waves" : DEFAULT_SETTINGS.character,
      skinTone: SKIN_TONES.some(({ id }) => id === parsed.skinTone)
        ? parsed.skinTone
        : DEFAULT_SETTINGS.skinTone,
      style: OUTFIT_STYLES.includes(parsed.style) ? parsed.style : DEFAULT_SETTINGS.style,
    });
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function persistApprovedSettings(storage, state) {
  if (!storage || typeof storage.setItem !== "function") return false;

  const payload = {
    version: STORAGE_VERSION,
    latestLocation: sanitizePersistedLocation(state.activeLocation),
    units: UNIT_SYSTEMS.includes(state.units) ? state.units : DEFAULT_SETTINGS.units,
    character: CHARACTER_PRESENTATIONS.includes(state.preferences?.character)
      ? state.preferences.character
      : DEFAULT_SETTINGS.character,
    skinTone: SKIN_TONES.some(({ id }) => id === state.preferences?.skinTone)
      ? state.preferences.skinTone
      : DEFAULT_SETTINGS.skinTone,
    style: OUTFIT_STYLES.includes(state.preferences?.style)
      ? state.preferences.style
      : DEFAULT_SETTINGS.style,
  };

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}
