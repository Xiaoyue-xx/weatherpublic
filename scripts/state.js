import {
  COLOR_PALETTES,
  composeOutfitLayerIds,
  getAssembledOutfit,
} from "../data/assets.js?chibi-2026-10-12-v2";
import { CHARACTER_PRESENTATIONS, OUTFIT_STYLES, SKIN_TONES } from "../data/content.js";
import { deriveRecommendationCore } from "./recommendation.js";
import {
  UNIT_SYSTEMS,
  loadPersistedSettings,
  persistApprovedSettings,
  sanitizePersistedLocation,
} from "./persistence.js";
import { selectContentVariants } from "./variation.js";
import { fetchForecast } from "./weather-service.js";

const RECOMMENDATION_TEXT = Object.freeze({
  hot: "Choose lightweight, breathable pieces for the heat.",
  warm: "Wear light everyday layers that stay comfortable outside.",
  comfortable: "A balanced outfit should work well through the day.",
  chilly: "Add a warm layer that is easy to adjust.",
  cold: "Choose insulated layers and weather-ready footwear.",
});

function convertTemperature(valueF, units) {
  if (valueF === null || !Number.isFinite(valueF)) return null;
  return units === "celsius" ? (valueF - 32) * (5 / 9) : valueF;
}

function convertWind(valueMph, units) {
  if (valueMph === null || !Number.isFinite(valueMph)) return null;
  return units === "celsius" ? valueMph * 1.609344 : valueMph;
}

function convertPrecipitation(valueInches, units) {
  if (valueInches === null || !Number.isFinite(valueInches)) return null;
  return units === "celsius" ? valueInches * 25.4 : valueInches;
}

function emptyRecommendation(
  state,
  status = state.request.status,
  reason = state.request.errorCode,
) {
  return Object.freeze({
    location: state.activeLocation,
    date: state.selectedDate,
    contextLabel: null,
    units: state.units,
    weather: null,
    preferences: state.preferences,
    category: null,
    modifiers: null,
    outfit: null,
    weatherIconId: "weather-unknown",
    recommendationText: null,
    reminders: Object.freeze([]),
    source: state.forecast?.source ?? null,
    status,
    reason,
  });
}

function displayWeather(selectedDay, current, representativeTemperature, units) {
  const daily = selectedDay.daily;
  return Object.freeze({
    temperatureUnit: units === "celsius" ? "°C" : "°F",
    windUnit: units === "celsius" ? "km/h" : "mph",
    precipitationUnit: units === "celsius" ? "mm" : "in",
    currentTemperature: convertTemperature(current?.temperatureF ?? null, units),
    currentApparentTemperature: convertTemperature(
      current?.apparentTemperatureF ?? null,
      units,
    ),
    representativeApparentTemperature: convertTemperature(
      representativeTemperature.valueF,
      units,
    ),
    highTemperature: convertTemperature(daily.temperatureMaxF, units),
    lowTemperature: convertTemperature(daily.temperatureMinF, units),
    apparentHighTemperature: convertTemperature(daily.apparentTemperatureMaxF, units),
    apparentLowTemperature: convertTemperature(daily.apparentTemperatureMinF, units),
    windSpeed: convertWind(daily.windSpeedMaxMph, units),
    windGust: convertWind(daily.windGustMaxMph, units),
    precipitation: convertPrecipitation(daily.precipitationSumInches, units),
    snowfall: convertPrecipitation(daily.snowfallInches, units),
    precipitationProbability: daily.precipitationProbabilityMax,
    uvIndex: daily.uvIndexMax,
  });
}

export function deriveAppRecommendation(state) {
  if (!state.activeLocation || !state.forecast || !state.selectedDate) {
    return emptyRecommendation(state);
  }

  const dayIndex = state.forecast.days.findIndex(({ date }) => date === state.selectedDate);
  if (dayIndex < 0) {
    return emptyRecommendation(state, "missing-data", "selected-day-unavailable");
  }

  const selectedDay = state.forecast.days[dayIndex];
  const core = deriveRecommendationCore(selectedDay);
  if (core.status !== "ready") {
    return Object.freeze({
      ...emptyRecommendation(state, core.status, core.reason),
      contextLabel: dayIndex === 0 ? "Current" : "Forecast",
      weather: Object.freeze({
        current: dayIndex === 0 ? state.forecast.current : null,
        hourly: selectedDay.hourly,
        daily: selectedDay.daily,
        condition: core.condition,
        display: null,
      }),
      source: state.forecast.source,
    });
  }

  const variants = selectContentVariants({
    latitude: state.activeLocation.latitude,
    longitude: state.activeLocation.longitude,
    date: state.selectedDate,
    character: state.preferences.character,
    style: state.preferences.style,
    category: core.category,
    modifiers: core.modifiers,
    reminderTypes: core.reminderTypes,
  });
  const assembled = getAssembledOutfit(variants.outfit.fitId);
  if (!assembled) {
    return emptyRecommendation(state, "error", "outfit-assets-unavailable");
  }
  const current = dayIndex === 0 ? state.forecast.current : null;

  return Object.freeze({
    location: state.activeLocation,
    date: state.selectedDate,
    contextLabel: dayIndex === 0 ? "Current" : "Forecast",
    units: state.units,
    weather: Object.freeze({
      current,
      hourly: selectedDay.hourly,
      daily: selectedDay.daily,
      condition: core.condition,
      display: displayWeather(
        selectedDay,
        current,
        core.representativeTemperature,
        state.units,
      ),
    }),
    preferences: state.preferences,
    category: core.category,
    modifiers: core.modifiers,
    outfit: Object.freeze({
      recipeId: variants.outfit.id,
      fitId: variants.outfit.fitId,
      colorIndex: variants.colorIndex,
      palette: COLOR_PALETTES[variants.colorIndex],
      items: variants.outfit.items,
      carryItems: variants.outfit.carryItems,
      layers: composeOutfitLayerIds(assembled, core.modifiers),
      accessibleSummary: variants.outfit.accessibleSummary,
    }),
    weatherIconId: core.weatherIconId,
    recommendationText: RECOMMENDATION_TEXT[core.category],
    reminders: variants.reminders,
    source: state.forecast.source,
    status: "ready",
    reason: null,
  });
}

export function createAppStore({
  storage = globalThis.localStorage,
  fetchForecastImpl = fetchForecast,
} = {}) {
  const persisted = loadPersistedSettings(storage);
  let requestController = null;
  let requestSequence = 0;
  const listeners = new Set();
  let state = {
    activeLocation: persisted.latestLocation,
    selectedDate: null,
    units: persisted.units,
    preferences: Object.freeze({
      character: persisted.character,
      skinTone: persisted.skinTone,
      style: persisted.style,
    }),
    request: Object.freeze({ status: "idle", errorCode: null }),
    forecast: null,
    recommendation: null,
  };
  state = Object.freeze({ ...state, recommendation: deriveAppRecommendation(state) });

  function publish(nextValues, { persist = false } = {}) {
    const nextState = { ...state, ...nextValues };
    state = Object.freeze({
      ...nextState,
      recommendation: deriveAppRecommendation(nextState),
    });
    if (persist) persistApprovedSettings(storage, state);
    for (const listener of listeners) listener(state);
  }

  async function selectLocation(location) {
    if (!sanitizePersistedLocation(location)) {
      throw new TypeError("A valid location is required");
    }
    requestController?.abort("location-changed");
    requestController = new AbortController();
    requestSequence += 1;
    const sequence = requestSequence;
    publish({
      activeLocation: location,
      selectedDate: null,
      forecast: null,
      request: Object.freeze({ status: "loading", errorCode: null }),
    }, { persist: true });

    try {
      const forecast = await fetchForecastImpl(location, {
        signal: requestController.signal,
        onSlow: () => {
          if (sequence !== requestSequence) return;
          publish({ request: Object.freeze({ status: "slow", errorCode: null }) });
        },
      });
      if (sequence !== requestSequence) return state;
      publish({
        forecast,
        selectedDate: forecast.days[0]?.date ?? null,
        request: Object.freeze({ status: "ready", errorCode: null }),
      });
      return state;
    } catch (error) {
      if (sequence !== requestSequence) return state;
      const errorCode = typeof error?.code === "string" ? error.code : "unknown";
      if (errorCode === "aborted") return state;
      publish({
        forecast: null,
        selectedDate: null,
        request: Object.freeze({ status: "error", errorCode }),
      });
      return state;
    }
  }

  function selectDate(date) {
    if (!state.forecast?.days.some((day) => day.date === date)) {
      throw new RangeError(`Date is not in the active forecast: ${date}`);
    }
    publish({ selectedDate: date });
  }

  function setUnits(units) {
    if (!UNIT_SYSTEMS.includes(units)) throw new RangeError(`Unknown units: ${units}`);
    publish({ units }, { persist: true });
  }

  function setPreferences(nextPreferences) {
    const character = nextPreferences.character ?? state.preferences.character;
    const skinTone = nextPreferences.skinTone ?? state.preferences.skinTone;
    const style = nextPreferences.style ?? state.preferences.style;
    if (!CHARACTER_PRESENTATIONS.includes(character)) {
      throw new RangeError(`Unknown character presentation: ${character}`);
    }
    if (!SKIN_TONES.some(({ id }) => id === skinTone)) {
      throw new RangeError(`Unknown skin tone: ${skinTone}`);
    }
    if (!OUTFIT_STYLES.includes(style)) throw new RangeError(`Unknown style: ${style}`);
    publish({ preferences: Object.freeze({ character, skinTone, style }) }, { persist: true });
  }

  return Object.freeze({
    getState: () => state,
    subscribe(listener) {
      if (typeof listener !== "function") throw new TypeError("A listener function is required");
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    selectLocation,
    selectDate,
    setUnits,
    setPreferences,
    refresh: () => (
      state.activeLocation ? selectLocation(state.activeLocation) : Promise.resolve(state)
    ),
    destroy() {
      requestSequence += 1;
      requestController?.abort("store-destroyed");
      listeners.clear();
    },
  });
}
