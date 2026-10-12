/**
 * Pure weather-to-recommendation rules.
 *
 * Provider adapters must normalize temperatures to Fahrenheit, wind speeds to
 * miles per hour, and hourly timestamps to local provider time before calling
 * this module. Display-unit conversion happens after recommendation derivation.
 */

/**
 * @typedef {object} NormalizedHourlyWeather
 * @property {number|null} hour Local hour from 0 through 23.
 * @property {number|null} apparentTemperatureF
 *
 * @typedef {object} NormalizedDailyWeather
 * @property {number|null} apparentTemperatureMeanF
 * @property {number|null} apparentTemperatureMinF
 * @property {number|null} apparentTemperatureMaxF
 * @property {number|null} precipitationProbabilityMax
 * @property {number|null} snowfallInches
 * @property {number|null} uvIndexMax
 * @property {number|null} windSpeedMaxMph
 * @property {number|null} windGustMaxMph
 * @property {number|null} weatherCode
 *
 * @typedef {object} NormalizedWeatherDay
 * @property {string|null} date Local ISO calendar date.
 * @property {NormalizedHourlyWeather[]} hourly
 * @property {NormalizedDailyWeather} daily
 */

export const TEMPERATURE_CATEGORIES = Object.freeze({
  HOT: "hot",
  WARM: "warm",
  COMFORTABLE: "comfortable",
  CHILLY: "chilly",
  COLD: "cold",
});

export const MODIFIER_TYPES = Object.freeze([
  "rain",
  "snow",
  "wind",
  "uv",
  "hydration",
  "layers",
  "thunderstorm",
]);

const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82]);
const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86]);
const THUNDERSTORM_CODES = new Set([95, 96, 99]);

const WMO_CONDITIONS = new Map([
  [0, ["clear", "Clear", "weather-clear"]],
  [1, ["mainly-clear", "Mainly clear", "weather-partly-cloudy"]],
  [2, ["partly-cloudy", "Partly cloudy", "weather-partly-cloudy"]],
  [3, ["overcast", "Overcast", "weather-cloudy"]],
  [45, ["fog", "Fog", "weather-fog"]],
  [48, ["rime-fog", "Rime fog", "weather-fog"]],
  [51, ["drizzle-light", "Light drizzle", "weather-rain"]],
  [53, ["drizzle", "Drizzle", "weather-rain"]],
  [55, ["drizzle-heavy", "Heavy drizzle", "weather-rain"]],
  [56, ["freezing-drizzle-light", "Light freezing drizzle", "weather-rain"]],
  [57, ["freezing-drizzle-heavy", "Heavy freezing drizzle", "weather-rain"]],
  [61, ["rain-light", "Light rain", "weather-rain"]],
  [63, ["rain", "Rain", "weather-rain"]],
  [65, ["rain-heavy", "Heavy rain", "weather-rain"]],
  [66, ["freezing-rain-light", "Light freezing rain", "weather-rain"]],
  [67, ["freezing-rain-heavy", "Heavy freezing rain", "weather-rain"]],
  [71, ["snow-light", "Light snow", "weather-snow"]],
  [73, ["snow", "Snow", "weather-snow"]],
  [75, ["snow-heavy", "Heavy snow", "weather-snow"]],
  [77, ["snow-grains", "Snow grains", "weather-snow"]],
  [80, ["rain-showers-light", "Light rain showers", "weather-rain"]],
  [81, ["rain-showers", "Rain showers", "weather-rain"]],
  [82, ["rain-showers-heavy", "Heavy rain showers", "weather-rain"]],
  [85, ["snow-showers-light", "Light snow showers", "weather-snow"]],
  [86, ["snow-showers-heavy", "Heavy snow showers", "weather-snow"]],
  [95, ["thunderstorm", "Thunderstorm", "weather-thunderstorm"]],
  [96, ["thunderstorm-hail-light", "Thunderstorm with light hail", "weather-thunderstorm"]],
  [99, ["thunderstorm-hail-heavy", "Thunderstorm with heavy hail", "weather-thunderstorm"]],
]);

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function localHour(time) {
  if (Number.isInteger(time) && time >= 0 && time <= 23) {
    return time;
  }

  if (typeof time !== "string") {
    return null;
  }

  const match = time.match(/^\d{4}-\d{2}-\d{2}T(\d{2}):/);
  return match ? Number(match[1]) : null;
}

function median(values) {
  const sorted = [...values].sort((first, second) => first - second);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

/** @returns {NormalizedWeatherDay} */
export function normalizeWeatherDay(input = {}) {
  const dailyInput = input.daily ?? {};
  const hourlyInput = Array.isArray(input.hourly) ? input.hourly : [];

  return {
    date: typeof input.date === "string" ? input.date : null,
    hourly: hourlyInput.map((entry) => ({
      hour: localHour(entry?.time ?? entry?.hour),
      apparentTemperatureF: finiteNumber(entry?.apparentTemperatureF),
    })),
    daily: {
      apparentTemperatureMeanF: finiteNumber(dailyInput.apparentTemperatureMeanF),
      apparentTemperatureMinF: finiteNumber(dailyInput.apparentTemperatureMinF),
      apparentTemperatureMaxF: finiteNumber(dailyInput.apparentTemperatureMaxF),
      precipitationProbabilityMax: finiteNumber(dailyInput.precipitationProbabilityMax),
      snowfallInches: finiteNumber(dailyInput.snowfallInches),
      uvIndexMax: finiteNumber(dailyInput.uvIndexMax),
      windSpeedMaxMph: finiteNumber(dailyInput.windSpeedMaxMph),
      windGustMaxMph: finiteNumber(dailyInput.windGustMaxMph),
      weatherCode: finiteNumber(dailyInput.weatherCode),
    },
  };
}

export function representativeApparentTemperature(weatherDay) {
  const normalized = normalizeWeatherDay(weatherDay);
  const daytimeValues = normalized.hourly
    .filter(({ hour, apparentTemperatureF }) => (
      hour >= 8 && hour <= 18 && apparentTemperatureF !== null
    ))
    .map(({ apparentTemperatureF }) => apparentTemperatureF);

  if (daytimeValues.length >= 3) {
    return { valueF: median(daytimeValues), source: "daytime-median" };
  }

  if (normalized.daily.apparentTemperatureMeanF !== null) {
    return { valueF: normalized.daily.apparentTemperatureMeanF, source: "daily-mean" };
  }

  const { apparentTemperatureMinF: minimum, apparentTemperatureMaxF: maximum } = normalized.daily;
  if (minimum !== null && maximum !== null) {
    return { valueF: (minimum + maximum) / 2, source: "daily-min-max-mean" };
  }

  return null;
}

export function categorizeApparentTemperature(valueF) {
  if (!Number.isFinite(valueF)) {
    return null;
  }
  if (valueF >= 85) return TEMPERATURE_CATEGORIES.HOT;
  if (valueF >= 70) return TEMPERATURE_CATEGORIES.WARM;
  if (valueF >= 55) return TEMPERATURE_CATEGORIES.COMFORTABLE;
  if (valueF >= 40) return TEMPERATURE_CATEGORIES.CHILLY;
  return TEMPERATURE_CATEGORIES.COLD;
}

export function mapWmoCondition(weatherCode) {
  const code = finiteNumber(weatherCode);
  const mapped = WMO_CONDITIONS.get(code);

  if (!mapped) {
    return {
      code,
      id: "unknown",
      label: "Conditions unavailable",
      iconId: "weather-unknown",
      hasRain: false,
      hasSnow: false,
      hasThunderstorm: false,
    };
  }

  return {
    code,
    id: mapped[0],
    label: mapped[1],
    iconId: mapped[2],
    hasRain: RAIN_CODES.has(code),
    hasSnow: SNOW_CODES.has(code),
    hasThunderstorm: THUNDERSTORM_CODES.has(code),
  };
}

export function deriveModifiers(weatherDay) {
  const { daily } = normalizeWeatherDay(weatherDay);
  const condition = mapWmoCondition(daily.weatherCode);
  const hasTemperatureRange = (
    daily.apparentTemperatureMinF !== null && daily.apparentTemperatureMaxF !== null
  );

  return {
    rain: (daily.precipitationProbabilityMax ?? -Infinity) >= 40 || condition.hasRain,
    snow: (daily.snowfallInches ?? 0) > 0 || condition.hasSnow,
    wind: (daily.windSpeedMaxMph ?? -Infinity) >= 20
      || (daily.windGustMaxMph ?? -Infinity) >= 25,
    uv: (daily.uvIndexMax ?? -Infinity) >= 3,
    hydration: (daily.apparentTemperatureMaxF ?? -Infinity) >= 85,
    layers: hasTemperatureRange
      && daily.apparentTemperatureMaxF - daily.apparentTemperatureMinF >= 15,
    thunderstorm: condition.hasThunderstorm,
  };
}

export function selectWeatherIcon(condition, modifiers) {
  if (modifiers.thunderstorm) return "weather-thunderstorm";
  if (modifiers.snow) return "weather-snow";
  if (modifiers.rain) return "weather-rain";
  return condition.iconId;
}

export function activeReminderTypes(modifiers) {
  const types = [];
  if (modifiers.thunderstorm) types.push("thunderstorm");
  if (modifiers.snow) {
    types.push("snow");
  } else if (modifiers.rain) {
    types.push("rain");
  }
  for (const type of ["wind", "uv", "hydration", "layers"]) {
    if (modifiers[type]) types.push(type);
  }
  return types;
}

export function deriveRecommendationCore(weatherDay) {
  const normalizedWeather = normalizeWeatherDay(weatherDay);
  const representativeTemperature = representativeApparentTemperature(normalizedWeather);

  if (!representativeTemperature) {
    return {
      status: "missing-data",
      reason: "apparent-temperature-unavailable",
      weather: normalizedWeather,
      category: null,
      modifiers: null,
      condition: mapWmoCondition(normalizedWeather.daily.weatherCode),
      weatherIconId: "weather-unknown",
      reminderTypes: [],
    };
  }

  const condition = mapWmoCondition(normalizedWeather.daily.weatherCode);
  const modifiers = deriveModifiers(normalizedWeather);

  return {
    status: "ready",
    reason: null,
    weather: normalizedWeather,
    representativeTemperature,
    category: categorizeApparentTemperature(representativeTemperature.valueF),
    modifiers,
    condition,
    weatherIconId: selectWeatherIcon(condition, modifiers),
    reminderTypes: activeReminderTypes(modifiers),
  };
}
