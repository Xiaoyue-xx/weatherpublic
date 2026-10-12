import { getAssetHref } from "../data/assets.js?chibi-2026-10-12-v3";
import { CHARACTER_OPTIONS, SKIN_TONES } from "../data/content.js";
import { requestDeviceLocation } from "./device-location.js";
import { renderPixelArt } from "./pixel-art.js?chibi-2026-10-12-v3";
import { searchUsLocations } from "./weather-service.js";

function setStatus(root, message) {
  const status = root.querySelector("[data-location-status]");
  if (status) status.textContent = message;
}

function detailOutfitItems(recommendation) {
  const items = [...recommendation.outfit.items];
  if (recommendation.modifiers.snow) items[items.length - 1] = "waterproof winter boots";
  if (recommendation.modifiers.rain) items.push("water-resistant shell");
  else if (recommendation.modifiers.wind) items.push("wind-resistant layer");
  return items;
}

function appendIcon(container, iconId) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 96 96");
  svg.setAttribute("aria-hidden", "true");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", getAssetHref(iconId));
  svg.append(use);
  container.append(svg);
}

const STYLE_PREVIEWS = Object.freeze({
  "campus-casual": Object.freeze({
    label: "Campus Casual",
    layers: Object.freeze(["lower-wide-leg", "base-tunic", "upper-cardigan", "footwear-canvas"]),
    palette: Object.freeze(["#b56b9b", "#9bc7df", "#3f425f", "#fff7e8"]),
  }),
  sporty: Object.freeze({
    label: "Sporty",
    layers: Object.freeze(["lower-joggers", "base-tunic", "upper-track-jacket", "footwear-trainers"]),
    palette: Object.freeze(["#407d78", "#f1c75b", "#293d4a", "#f8f4e8"]),
  }),
  streetwear: Object.freeze({
    label: "Streetwear",
    layers: Object.freeze(["lower-parachute", "base-tunic", "upper-bomber", "footwear-high-tops"]),
    palette: Object.freeze(["#6b5bd2", "#e68f6d", "#302d49", "#f4eadb"]),
  }),
});

export function createInteractionController({
  store,
  root = document,
  searchLocations = searchUsLocations,
  locateDevice = requestDeviceLocation,
} = {}) {
  if (!store) throw new TypeError("An application store is required");
  const returnFocus = new WeakMap();
  let locationResults = [];
  let searchController = null;

  function closeDialog(dialog) {
    if (dialog?.open) dialog.close();
  }

  function preparePreferences() {
    const { character, skinTone, style } = store.getState().preferences;
    const characterInput = root.querySelector(`[name="character"][value="${character}"]`);
    const skinToneInput = root.querySelector(`[name="skinTone"][value="${skinTone}"]`);
    const styleInput = root.querySelector(`[name="style"][value="${style}"]`);
    if (characterInput) characterInput.checked = true;
    if (skinToneInput) skinToneInput.checked = true;
    if (styleInput) styleInput.checked = true;
    updatePreferencePreview(root.querySelector("[data-preferences-form]"));
  }

  function updatePreferencePreview(form) {
    if (!form) return;
    const formData = new FormData(form);
    const character = formData.get("character")?.toString();
    const skinTone = formData.get("skinTone")?.toString();
    const style = formData.get("style")?.toString();
    const characterOption = CHARACTER_OPTIONS.find(({ id }) => id === character);
    const tone = SKIN_TONES.find(({ id }) => id === skinTone);
    const previewStyle = STYLE_PREVIEWS[style];
    if (!characterOption || !tone || !previewStyle) return;

    const preview = form.querySelector("[data-preference-preview]");
    const ariaLabel = `${characterOption.label} character with ${tone.label.toLowerCase()} skin in a ${previewStyle.label.toLowerCase()} outfit`;
    renderPixelArt(preview, [`character-${character}`, ...previewStyle.layers], {
      tone,
      palette: previewStyle.palette,
      ariaLabel,
    });
    form.querySelector("[data-preference-preview-label]").textContent = `${characterOption.label} · ${tone.label} · ${previewStyle.label}`;
    form.querySelectorAll("[data-character-thumbnail]").forEach((thumbnail) => {
      renderPixelArt(thumbnail, [
        `character-${thumbnail.dataset.characterThumbnail}`,
        "lower-jeans",
        "base-tunic",
        "upper-tee",
        "footwear-canvas",
      ], { tone, palette: STYLE_PREVIEWS["campus-casual"].palette });
    });
  }

  function prepareOutfitDetails() {
    const recommendation = store.getState().recommendation;
    if (recommendation?.status !== "ready") return false;
    const summary = root.querySelector("[data-outfit-summary]");
    const list = root.querySelector("[data-outfit-detail-list]");
    summary.textContent = recommendation.outfit.accessibleSummary;
    list.replaceChildren();
    for (const item of detailOutfitItems(recommendation)) {
      const entry = document.createElement("li");
      entry.textContent = item;
      list.append(entry);
    }
    return true;
  }

  function prepareCarryDetails() {
    const recommendation = store.getState().recommendation;
    if (recommendation?.status !== "ready") return false;
    const list = root.querySelector("[data-carry-detail-list]");
    list.replaceChildren();
    if (recommendation.reminders.length === 0) {
      const message = document.createElement("p");
      message.textContent = "No extra weather items are needed for this forecast.";
      list.append(message);
      return true;
    }
    for (const reminder of recommendation.reminders) {
      const item = document.createElement("article");
      item.className = "detail-reminder";
      appendIcon(item, reminder.iconId);
      const copy = document.createElement("div");
      const heading = document.createElement("h3");
      const text = document.createElement("p");
      heading.textContent = reminder.type;
      text.textContent = reminder.text;
      copy.append(heading, text);
      item.append(copy);
      list.append(item);
    }
    return true;
  }

  function openDialog(name, trigger) {
    const dialog = root.querySelector(`[data-dialog="${name}"]`);
    if (!dialog || typeof dialog.showModal !== "function") return;
    if (name === "preferences") preparePreferences();
    if (name === "outfit" && !prepareOutfitDetails()) return;
    if (name === "carry" && !prepareCarryDetails()) return;
    returnFocus.set(dialog, trigger);
    dialog.showModal();
    if (name === "location") root.querySelector("#location-query")?.focus();
  }

  function renderLocationResults(results) {
    const container = root.querySelector("[data-location-results]");
    container.replaceChildren();
    locationResults = results;
    for (const [index, location] of results.entries()) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "location-result";
      button.dataset.locationIndex = String(index);
      const title = document.createElement("strong");
      const detail = document.createElement("span");
      title.textContent = location.label;
      detail.textContent = "United States";
      button.append(title, detail);
      container.append(button);
    }
  }

  async function submitLocationSearch(form) {
    const query = new FormData(form).get("query")?.toString().trim() ?? "";
    if (query.length < 2) {
      setStatus(root, "Enter at least two characters to search.");
      return;
    }
    searchController?.abort("new-search");
    searchController = new AbortController();
    renderLocationResults([]);
    setStatus(root, `Searching for “${query}”…`);
    try {
      const results = await searchLocations(query, { signal: searchController.signal });
      renderLocationResults(results);
      setStatus(root, results.length > 0
        ? `${results.length} US location${results.length === 1 ? "" : "s"} found.`
        : `No US locations found for “${query}”. Try a nearby city or region.`);
    } catch (error) {
      if (error?.code === "aborted") return;
      const offline = globalThis.navigator?.onLine === false;
      setStatus(root, offline
        ? "You appear to be offline. Reconnect and search again."
        : "Location search could not reach Open-Meteo. Try again.");
    }
  }

  async function selectLocation(location, dialog) {
    closeDialog(dialog);
    await store.selectLocation(location);
  }

  async function useDeviceLocation(button) {
    const dialog = button.closest("dialog");
    button.disabled = true;
    setStatus(root, "Asking your browser for device location…");
    try {
      const location = await locateDevice();
      setStatus(root, "Device location found. Loading weather…");
      await selectLocation(location, dialog);
    } catch (error) {
      setStatus(root, error?.message ?? "Device location could not be used. Search for a US city instead.");
    } finally {
      button.disabled = false;
    }
  }

  function handleClick(event) {
    const closeButton = event.target.closest("[data-close-dialog]");
    if (closeButton) {
      closeDialog(closeButton.closest("dialog"));
      return;
    }
    const openButton = event.target.closest("[data-open-location], [data-open-preferences], [data-open-outfit], [data-open-carry]");
    if (openButton) {
      const name = openButton.hasAttribute("data-open-location") ? "location"
        : openButton.hasAttribute("data-open-preferences") ? "preferences"
          : openButton.hasAttribute("data-open-outfit") ? "outfit" : "carry";
      openDialog(name, openButton);
      return;
    }
    const resultButton = event.target.closest("[data-location-index]");
    if (resultButton) {
      const location = locationResults[Number(resultButton.dataset.locationIndex)];
      if (location) selectLocation(location, resultButton.closest("dialog"));
      return;
    }
    const deviceButton = event.target.closest("[data-use-device-location]");
    if (deviceButton) useDeviceLocation(deviceButton);
  }

  function handleSubmit(event) {
    if (event.target.matches("[data-location-form]")) {
      event.preventDefault();
      submitLocationSearch(event.target);
      return;
    }
    if (event.target.matches("[data-preferences-form]")) {
      event.preventDefault();
      const formData = new FormData(event.target);
      store.setPreferences({
        character: formData.get("character"),
        skinTone: formData.get("skinTone"),
        style: formData.get("style"),
      });
      closeDialog(event.target.closest("dialog"));
    }
  }

  function handleChange(event) {
    if (event.target.matches("[data-preferences-form] input")) {
      updatePreferencePreview(event.target.form);
    }
  }

  function handleClose(event) {
    if (!event.target.matches("dialog")) return;
    returnFocus.get(event.target)?.focus();
    returnFocus.delete(event.target);
  }

  function handleBackdrop(event) {
    if (event.target.matches("dialog")) closeDialog(event.target);
  }

  root.addEventListener("click", handleClick);
  root.addEventListener("submit", handleSubmit);
  root.addEventListener("change", handleChange);
  root.addEventListener("close", handleClose, true);
  root.addEventListener("pointerdown", handleBackdrop);

  return Object.freeze({
    openDialog,
    destroy() {
      searchController?.abort("controller-destroyed");
      root.removeEventListener("click", handleClick);
      root.removeEventListener("submit", handleSubmit);
      root.removeEventListener("change", handleChange);
      root.removeEventListener("close", handleClose, true);
      root.removeEventListener("pointerdown", handleBackdrop);
    },
  });
}
