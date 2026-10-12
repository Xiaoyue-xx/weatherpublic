const GEOCODING_ENDPOINT = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_ENDPOINT = "https://api.open-meteo.com/v1/forecast";

export const REQUEST_TIMING = Object.freeze({
  slowMs: 3_000,
  timeoutMs: 10_000,
});

export const FORECAST_FIELDS = Object.freeze({
  current: Object.freeze([
    "temperature_2m",
    "apparent_temperature",
    "weather_code",
    "is_day",
    "wind_speed_10m",
  ]),
  hourly: Object.freeze(["apparent_temperature"]),
  daily: Object.freeze([
    "weather_code",
    "temperature_2m_max",
    "temperature_2m_min",
    "apparent_temperature_max",
    "apparent_temperature_mean",
    "apparent_temperature_min",
    "precipitation_probability_max",
    "precipitation_sum",
    "snowfall_sum",
    "uv_index_max",
    "wind_speed_10m_max",
    "wind_gusts_10m_max",
  ]),
});

export class WeatherServiceError extends Error {
  constructor(code, message, options = {}) {
    super(message, { cause: options.cause });
    this.name = "WeatherServiceError";
    this.code = code;
    this.status = options.status ?? null;
  }
}

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function arrayNumber(source, key, index) {
  return finiteNumber(Array.isArray(source?.[key]) ? source[key][index] : null);
}

function validateCoordinates({ latitude, longitude }) {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new RangeError("latitude must be between -90 and 90");
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new RangeError("longitude must be between -180 and 180");
  }
}

export function buildGeocodingUrl(query, count = 8) {
  const normalizedQuery = typeof query === "string" ? query.trim() : "";
  if (normalizedQuery.length < 2) return null;
  if (!Number.isInteger(count) || count < 1 || count > 20) {
    throw new RangeError("count must be an integer between 1 and 20");
  }

  const url = new URL(GEOCODING_ENDPOINT);
  url.searchParams.set("name", normalizedQuery);
  url.searchParams.set("count", String(count));
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");
  url.searchParams.set("countryCode", "US");
  return url;
}

export function buildForecastUrl(location) {
  validateCoordinates(location);
  const url = new URL(FORECAST_ENDPOINT);
  url.searchParams.set("latitude", String(location.latitude));
  url.searchParams.set("longitude", String(location.longitude));
  url.searchParams.set("current", FORECAST_FIELDS.current.join(","));
  url.searchParams.set("hourly", FORECAST_FIELDS.hourly.join(","));
  url.searchParams.set("daily", FORECAST_FIELDS.daily.join(","));
  url.searchParams.set("temperature_unit", "fahrenheit");
  url.searchParams.set("wind_speed_unit", "mph");
  url.searchParams.set("precipitation_unit", "inch");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "7");
  url.searchParams.set("timeformat", "iso8601");
  return url;
}

export async function requestJson(url, {
  fetchImpl = globalThis.fetch,
  signal,
  onSlow,
  slowMs = REQUEST_TIMING.slowMs,
  timeoutMs = REQUEST_TIMING.timeoutMs,
} = {}) {
  if (typeof fetchImpl !== "function") {
    throw new TypeError("A fetch implementation is required");
  }

  const controller = new AbortController();
  let timedOut = false;
  const forwardAbort = () => controller.abort(signal?.reason);
  if (signal?.aborted) forwardAbort();
  signal?.addEventListener("abort", forwardAbort, { once: true });

  const slowTimer = setTimeout(() => {
    try {
      onSlow?.();
    } catch {
      // UI callbacks must not change request behavior.
    }
  }, slowMs);
  const timeoutTimer = setTimeout(() => {
    timedOut = true;
    controller.abort("timeout");
  }, timeoutMs);

  try {
    const response = await fetchImpl(url, { signal: controller.signal });
    if (!response?.ok) {
      throw new WeatherServiceError(
        "service",
        `Open-Meteo request failed with status ${response?.status ?? "unknown"}`,
        { status: response?.status },
      );
    }

    let payload;
    try {
      payload = await response.json();
    } catch (cause) {
      throw new WeatherServiceError("invalid-response", "Open-Meteo returned invalid JSON", {
        cause,
      });
    }

    if (payload?.error) {
      throw new WeatherServiceError(
        "service",
        typeof payload.reason === "string" ? payload.reason : "Open-Meteo rejected the request",
        { status: response.status },
      );
    }
    return payload;
  } catch (cause) {
    if (cause instanceof WeatherServiceError) throw cause;
    if (timedOut) {
      throw new WeatherServiceError("timeout", "The weather request timed out", { cause });
    }
    if (signal?.aborted || controller.signal.aborted) {
      throw new WeatherServiceError("aborted", "The weather request was cancelled", { cause });
    }
    throw new WeatherServiceError("network", "The weather service could not be reached", { cause });
  } finally {
    clearTimeout(slowTimer);
    clearTimeout(timeoutTimer);
    signal?.removeEventListener("abort", forwardAbort);
  }
}

export function normalizeGeocodingResponse(payload) {
  if (!Array.isArray(payload?.results)) return [];

  return payload.results
    .filter((result) => (
      result?.country_code === "US"
      && typeof result.name === "string"
      && finiteNumber(result.latitude) !== null
      && finiteNumber(result.longitude) !== null
    ))
    .map((result) => {
      const admin1 = typeof result.admin1 === "string" && result.admin1.trim()
        ? result.admin1.trim()
        : null;
      return Object.freeze({
        id: Number.isInteger(result.id) ? result.id : null,
        name: result.name,
        admin1,
        countryCode: "US",
        latitude: result.latitude,
        longitude: result.longitude,
        timezone: typeof result.timezone === "string" ? result.timezone : null,
        label: admin1 ? `${result.name}, ${admin1}` : result.name,
      });
    });
}

export async function searchUsLocations(query, options = {}) {
  const url = buildGeocodingUrl(query, options.count);
  if (!url) return [];
  const payload = await requestJson(url, options);
  return normalizeGeocodingResponse(payload);
}

export function normalizeForecastResponse(payload) {
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.daily?.time)) {
    throw new WeatherServiceError(
      "invalid-response",
      "Open-Meteo forecast did not include daily dates",
    );
  }

  const latitude = finiteNumber(payload.latitude);
  const longitude = finiteNumber(payload.longitude);
  if (latitude === null || longitude === null) {
    throw new WeatherServiceError(
      "invalid-response",
      "Open-Meteo forecast did not include valid coordinates",
    );
  }

  const hourlyTimes = Array.isArray(payload.hourly?.time) ? payload.hourly.time : [];
  const hourlyValues = Array.isArray(payload.hourly?.apparent_temperature)
    ? payload.hourly.apparent_temperature
    : [];
  const hourlyByDate = new Map();
  for (let index = 0; index < hourlyTimes.length; index += 1) {
    const time = hourlyTimes[index];
    if (typeof time !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(time)) continue;
    const date = time.slice(0, 10);
    const entries = hourlyByDate.get(date) ?? [];
    entries.push(Object.freeze({
      time,
      apparentTemperatureF: finiteNumber(hourlyValues[index]),
    }));
    hourlyByDate.set(date, entries);
  }

  const days = payload.daily.time.slice(0, 7).map((date, index) => Object.freeze({
    date: typeof date === "string" ? date : null,
    hourly: Object.freeze([...(hourlyByDate.get(date) ?? [])]),
    daily: Object.freeze({
      temperatureMaxF: arrayNumber(payload.daily, "temperature_2m_max", index),
      temperatureMinF: arrayNumber(payload.daily, "temperature_2m_min", index),
      apparentTemperatureMaxF: arrayNumber(payload.daily, "apparent_temperature_max", index),
      apparentTemperatureMeanF: arrayNumber(payload.daily, "apparent_temperature_mean", index),
      apparentTemperatureMinF: arrayNumber(payload.daily, "apparent_temperature_min", index),
      precipitationProbabilityMax: arrayNumber(
        payload.daily,
        "precipitation_probability_max",
        index,
      ),
      precipitationSumInches: arrayNumber(payload.daily, "precipitation_sum", index),
      snowfallInches: arrayNumber(payload.daily, "snowfall_sum", index),
      uvIndexMax: arrayNumber(payload.daily, "uv_index_max", index),
      windSpeedMaxMph: arrayNumber(payload.daily, "wind_speed_10m_max", index),
      windGustMaxMph: arrayNumber(payload.daily, "wind_gusts_10m_max", index),
      weatherCode: arrayNumber(payload.daily, "weather_code", index),
    }),
  }));

  return Object.freeze({
    location: Object.freeze({
      latitude,
      longitude,
      elevationMeters: finiteNumber(payload.elevation),
      timezone: typeof payload.timezone === "string" ? payload.timezone : null,
      timezoneAbbreviation: typeof payload.timezone_abbreviation === "string"
        ? payload.timezone_abbreviation
        : null,
      utcOffsetSeconds: finiteNumber(payload.utc_offset_seconds),
    }),
    current: Object.freeze({
      time: typeof payload.current?.time === "string" ? payload.current.time : null,
      temperatureF: finiteNumber(payload.current?.temperature_2m),
      apparentTemperatureF: finiteNumber(payload.current?.apparent_temperature),
      weatherCode: finiteNumber(payload.current?.weather_code),
      isDay: finiteNumber(payload.current?.is_day),
      windSpeedMph: finiteNumber(payload.current?.wind_speed_10m),
    }),
    days: Object.freeze(days),
  });
}

export async function fetchForecast(location, options = {}) {
  const payload = await requestJson(buildForecastUrl(location), options);
  const normalized = normalizeForecastResponse(payload);
  const now = typeof options.now === "function" ? options.now : () => new Date().toISOString();
  return Object.freeze({
    ...normalized,
    source: Object.freeze({ provider: "Open-Meteo", fetchedAt: now() }),
  });
}
