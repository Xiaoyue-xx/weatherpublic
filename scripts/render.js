import { getAssetHref } from "../data/assets.js?chibi-2026-10-12-v3";
import { SKIN_TONES, getCharacterLabel } from "../data/content.js";
import { renderPixelArt } from "./pixel-art.js?chibi-2026-10-12-v3";
import { deriveRecommendationCore } from "./recommendation.js";

const DATE_LONG = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "short",
  day: "numeric",
});
const DATE_WEEKDAY = new Intl.DateTimeFormat("en-US", { weekday: "short" });
const DATE_SHORT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

function localDate(isoDate) {
  return new Date(`${isoDate}T12:00:00Z`);
}

export function formatForecastDate(isoDate, format = "long") {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate ?? "")) return "Date unavailable";
  const date = localDate(isoDate);
  if (format === "weekday") return DATE_WEEKDAY.format(date);
  if (format === "short") return DATE_SHORT.format(date);
  return DATE_LONG.format(date);
}

export function displayTemperature(value, unit) {
  return Number.isFinite(value) ? `${Math.round(value)}${unit}` : "—";
}

export function convertForecastTemperature(valueF, units) {
  if (!Number.isFinite(valueF)) return null;
  return units === "celsius" ? (valueF - 32) * (5 / 9) : valueF;
}

export function buildForecastRowModel(day, units, selectedDate) {
  const core = deriveRecommendationCore(day);
  const unit = units === "celsius" ? "°C" : "°F";
  return Object.freeze({
    date: day.date,
    weekday: formatForecastDate(day.date, "weekday"),
    calendarDate: formatForecastDate(day.date, "short"),
    condition: core.condition.label,
    iconId: core.weatherIconId,
    high: displayTemperature(convertForecastTemperature(day.daily.temperatureMaxF, units), unit),
    low: displayTemperature(convertForecastTemperature(day.daily.temperatureMinF, units), unit),
    selected: day.date === selectedDate,
  });
}

export function buildStatusPresentation(state, { online = true } = {}) {
  if (state.recommendation?.status === "missing-data") {
    return Object.freeze({
      status: "missing-data",
      eyebrow: "Weather details unavailable",
      title: "This day needs more data.",
      message: "Open-Meteo did not provide enough apparent-temperature information to make a reliable outfit recommendation. Try refreshing or choose another location.",
      iconId: "weather-unknown",
      busy: false,
      retry: true,
      chooseLocation: true,
    });
  }

  if (state.request.status === "loading" || state.request.status === "slow") {
    const slow = state.request.status === "slow";
    return Object.freeze({
      status: slow ? "slow" : "loading",
      eyebrow: slow ? "Slow connection" : "Live weather",
      title: slow ? "Still connecting…" : "Checking the forecast…",
      message: slow
        ? "Open-Meteo is taking longer than usual. Keep this page open or choose a different location."
        : `Loading fresh weather for ${state.activeLocation?.label ?? "your location"}.`,
      iconId: slow ? "status-slow" : "status-loading",
      busy: true,
      retry: false,
      chooseLocation: true,
    });
  }

  if (state.request.status === "error") {
    const code = !online ? "offline" : state.request.errorCode;
    const copy = {
      offline: ["You appear to be offline.", "Reconnect to the internet, then retry the weather request."],
      timeout: ["The weather request timed out.", "Open-Meteo did not respond within ten seconds. Retry when your connection is steadier."],
      network: ["The weather service could not be reached.", "Check your connection and retry, or choose another location."],
      "invalid-response": ["Weather details arrived incomplete.", "Open-Meteo returned an unexpected response. Retry to request fresh data."],
      service: ["Open-Meteo is unavailable right now.", "The weather service returned an error. Wait a moment and retry."],
    }[code] ?? ["Weather could not be loaded.", "Retry the request or choose another location."];
    return Object.freeze({
      status: code ?? "error",
      eyebrow: "Weather unavailable",
      title: copy[0],
      message: copy[1],
      iconId: code === "offline" ? "status-offline" : "status-retry",
      busy: false,
      retry: Boolean(state.activeLocation),
      chooseLocation: true,
    });
  }

  return Object.freeze({
    status: "idle",
    eyebrow: "Weather outfits for your day",
    title: "Ready for the forecast?",
    message: "Choose a US city to see a seven-day forecast, a complete outfit, and what to bring.",
    iconId: "weather-partly-cloudy",
    busy: false,
    retry: false,
    chooseLocation: true,
  });
}

function useSymbol(svg, symbolId) {
  svg.replaceChildren();
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", getAssetHref(symbolId));
  svg.append(use);
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value ?? "";
}

function renderEmptyState(state) {
  const empty = document.querySelector("[data-empty-state]");
  const experience = document.querySelector("[data-weather-experience]");
  if (!empty || !experience) return;
  empty.hidden = false;
  experience.hidden = true;
  const presentation = buildStatusPresentation(state, {
    online: globalThis.navigator?.onLine !== false,
  });
  empty.dataset.status = presentation.status;
  empty.setAttribute("aria-busy", String(presentation.busy));
  setText("[data-empty-eyebrow]", presentation.eyebrow);
  setText("[data-empty-title]", presentation.title);
  setText("[data-empty-message]", presentation.message);
  setText("[data-app-status]", `${presentation.title} ${presentation.message}`);
  useSymbol(document.querySelector("[data-empty-icon]"), presentation.iconId);
  document.querySelector("[data-loading-skeleton]").hidden = !presentation.busy;
  document.querySelector("[data-retry-weather]").hidden = !presentation.retry;
  empty.querySelector("[data-open-location]").hidden = !presentation.chooseLocation;
}

function renderDateControls(state) {
  const strip = document.querySelector("[data-date-strip]");
  const template = document.querySelector("#date-button-template");
  if (!strip || !template) return;
  strip.replaceChildren();
  state.forecast.days.forEach((day, index) => {
    const button = template.content.firstElementChild.cloneNode(true);
    button.dataset.date = day.date;
    button.setAttribute("aria-pressed", String(day.date === state.selectedDate));
    button.setAttribute("aria-label", `${index === 0 ? "Today, " : ""}${formatForecastDate(day.date)}`);
    button.querySelector(".date-weekday").textContent = index === 0 ? "Today" : formatForecastDate(day.date, "weekday");
    button.querySelector(".date-calendar").textContent = formatForecastDate(day.date, "short");
    strip.append(button);
  });
}

function renderWeatherFacts(recommendation) {
  const facts = document.querySelector("[data-weather-facts]");
  if (!facts) return;
  const display = recommendation.weather.display;
  const rows = [
    ["High / low", `${displayTemperature(display.highTemperature, display.temperatureUnit)} / ${displayTemperature(display.lowTemperature, display.temperatureUnit)}`],
    ["Precipitation", Number.isFinite(display.precipitationProbability) ? `${Math.round(display.precipitationProbability)}% chance` : "Not available"],
    ["Wind", Number.isFinite(display.windSpeed) ? `${Math.round(display.windSpeed)} ${display.windUnit}` : "Not available"],
    ["UV index", Number.isFinite(display.uvIndex) ? `${Math.round(display.uvIndex)}` : "Not available"],
  ];
  facts.replaceChildren();
  for (const [term, value] of rows) {
    const wrapper = document.createElement("div");
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = term;
    dd.textContent = value;
    wrapper.append(dt, dd);
    facts.append(wrapper);
  }
}

function renderCharacter(recommendation) {
  const svg = document.querySelector("[data-character-art]");
  if (!svg) return;
  const { palette, layers, accessibleSummary } = recommendation.outfit;
  const tone = SKIN_TONES.find(({ id }) => id === recommendation.preferences.skinTone) ?? SKIN_TONES[2];
  renderPixelArt(svg, layers, {
    tone,
    palette: [palette.primary, palette.secondary, palette.dark, palette.shoe],
    ariaLabel: `${tone.label} skin. ${accessibleSummary}`,
  });
}

function outfitLabels(recommendation) {
  const labels = [...recommendation.outfit.items];
  if (recommendation.modifiers.snow) labels[labels.length - 1] = "waterproof winter boots";
  if (recommendation.modifiers.rain) labels.push("water-resistant shell");
  else if (recommendation.modifiers.wind) labels.push("wind-resistant layer");
  return labels;
}

function renderOutfit(recommendation) {
  const list = document.querySelector("[data-outfit-items]");
  if (!list) return;
  list.replaceChildren();
  outfitLabels(recommendation).forEach((item, index) => {
    const entry = document.createElement("li");
    entry.textContent = item;
    entry.style.setProperty("--item-color", index % 2 === 0 ? recommendation.outfit.palette.primary : recommendation.outfit.palette.secondary);
    list.append(entry);
  });
}

function renderReminders(recommendation) {
  const container = document.querySelector("[data-reminders]");
  if (!container) return;
  container.replaceChildren();
  if (recommendation.reminders.length === 0) {
    const empty = document.createElement("p");
    empty.className = "no-reminders";
    empty.textContent = "No extra weather items are needed for this forecast.";
    container.append(empty);
    return;
  }
  for (const reminder of recommendation.reminders) {
    const article = document.createElement("article");
    article.className = "reminder";
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("viewBox", "0 0 96 96");
    icon.setAttribute("aria-hidden", "true");
    useSymbol(icon, reminder.iconId);
    const copy = document.createElement("div");
    const title = document.createElement("strong");
    const text = document.createElement("p");
    title.textContent = reminder.type;
    text.textContent = reminder.text;
    copy.append(title, text);
    article.append(icon, copy);
    container.append(article);
  }
}

function renderForecast(state) {
  const list = document.querySelector("[data-forecast-list]");
  const template = document.querySelector("#forecast-row-template");
  if (!list || !template) return;
  list.replaceChildren();
  for (const day of state.forecast.days) {
    const model = buildForecastRowModel(day, state.units, state.selectedDate);
    const row = template.content.firstElementChild.cloneNode(true);
    row.dataset.date = model.date;
    row.setAttribute("aria-label", `${model.weekday}, ${model.condition}, high ${model.high}, low ${model.low}`);
    if (model.selected) row.setAttribute("aria-current", "date");
    row.querySelector("strong").textContent = model.weekday;
    row.querySelector("small").textContent = model.calendarDate;
    useSymbol(row.querySelector(".forecast-icon"), model.iconId);
    row.querySelector(".forecast-condition").textContent = model.condition;
    row.querySelector(".forecast-temperatures").textContent = `${model.high} / ${model.low}`;
    list.append(row);
  }
}

export function renderApp(state) {
  setText("[data-location-label]", state.activeLocation?.label ?? "Choose location");
  document.querySelectorAll("[data-unit]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.unit === state.units));
  });
  const characterLabel = getCharacterLabel(state.preferences.character);
  const skinToneLabel = SKIN_TONES.find(({ id }) => id === state.preferences.skinTone)?.label ?? "Medium";
  const styleLabel = {
    "campus-casual": "Campus Casual",
    sporty: "Sporty",
    streetwear: "Streetwear",
  }[state.preferences.style];
  setText("[data-preference-summary]", `${characterLabel} · ${skinToneLabel} · ${styleLabel}`);

  const recommendation = state.recommendation;
  if (!state.forecast || recommendation?.status !== "ready") {
    renderEmptyState(state);
    return;
  }

  document.querySelector("[data-empty-state]").hidden = true;
  document.querySelector("[data-weather-experience]").hidden = false;
  renderDateControls(state);
  renderWeatherFacts(recommendation);
  renderCharacter(recommendation);
  renderOutfit(recommendation);
  renderReminders(recommendation);
  renderForecast(state);

  const display = recommendation.weather.display;
  const current = recommendation.contextLabel === "Current";
  const primary = current && Number.isFinite(display.currentTemperature)
    ? display.currentTemperature
    : display.representativeApparentTemperature;
  setText("[data-context-label]", `${recommendation.contextLabel} weather`);
  setText("[data-selected-date]", formatForecastDate(recommendation.date));
  setText("[data-source-badge]", recommendation.source.provider);
  setText("[data-primary-temperature]", displayTemperature(primary, display.temperatureUnit));
  setText("[data-condition]", recommendation.weather.condition.label);
  setText("[data-feels-like]", current && Number.isFinite(display.currentApparentTemperature)
    ? `Feels like ${displayTemperature(display.currentApparentTemperature, display.temperatureUnit)}`
    : `Representative feel ${displayTemperature(display.representativeApparentTemperature, display.temperatureUnit)}`);
  setText("[data-recommendation-text]", recommendation.recommendationText);
  setText("[data-data-context]", `${recommendation.location.label} · ${recommendation.contextLabel} · ${display.temperatureUnit} · ${recommendation.source.provider}`);
  setText("[data-fetched-time]", `Updated ${new Date(recommendation.source.fetchedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`);
  setText("[data-app-status]", `${recommendation.contextLabel} recommendation ready for ${recommendation.location.label}, ${formatForecastDate(recommendation.date)}.`);
  useSymbol(document.querySelector("[data-weather-icon]"), recommendation.weatherIconId);
}
