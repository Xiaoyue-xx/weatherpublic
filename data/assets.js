import {
  CHARACTER_PRESENTATIONS,
  OUTFIT_CATEGORIES,
  OUTFIT_STYLES,
  getOutfitRecipes,
} from "./content.js";

export const SVG_SPRITE_PATH = "assets/art.svg";
export const PIXEL_CHARACTER_SPRITE_PATH = "assets/pixel-characters.svg";

export const COLOR_PALETTES = Object.freeze([
  Object.freeze({ primary: "#ed75ad", secondary: "#82b9df", dark: "#414b68", shoe: "#fff4dc" }),
  Object.freeze({ primary: "#7cab84", secondary: "#e7c568", dark: "#344b40", shoe: "#f4ead4" }),
  Object.freeze({ primary: "#8172d8", secondary: "#e9aa8d", dark: "#392f59", shoe: "#f7eee2" }),
]);

export const ASSET_INVENTORY = Object.freeze({
  characters: Object.freeze([
    "character-crop", "character-curls", "character-waves", "character-bob",
  ]),
  upperBody: Object.freeze([
    "upper-tee", "upper-tank", "upper-polo", "upper-shirt", "upper-long-sleeve",
    "upper-sweatshirt", "upper-cardigan", "upper-track-jacket", "upper-hoodie",
    "upper-crewneck", "upper-flannel", "upper-denim-jacket", "upper-sweater",
    "upper-fleece", "upper-light-puffer", "upper-insulated-track", "upper-windbreaker",
    "upper-bomber", "upper-coat", "upper-puffer-vest", "upper-parka", "upper-puffer",
    "upper-wool-coat", "upper-shell", "upper-shearling",
  ]),
  lowerBody: Object.freeze([
    "lower-denim-shorts", "lower-cargo-shorts", "lower-bike-shorts",
    "lower-running-shorts", "lower-track-shorts", "lower-jeans", "lower-trousers",
    "lower-chinos", "lower-joggers", "lower-leggings", "lower-parachute",
    "lower-wide-leg", "lower-thermal", "lower-utility",
  ]),
  footwear: Object.freeze([
    "footwear-canvas", "footwear-low-top", "footwear-trainers", "footwear-running",
    "footwear-high-tops", "footwear-skate", "footwear-casual", "footwear-warm",
    "footwear-boots", "footwear-winter",
  ]),
  modifiers: Object.freeze([
    "modifier-rain-shell", "modifier-wind-layer", "modifier-insulated-layer",
    "modifier-puffer", "modifier-cap", "modifier-knit-hat", "modifier-gloves",
    "modifier-waterproof-boots",
  ]),
  weather: Object.freeze([
    "weather-clear", "weather-clear-night", "weather-partly-cloudy", "weather-cloudy",
    "weather-rain", "weather-snow", "weather-wind", "weather-thunderstorm",
    "weather-fog", "weather-unknown",
  ]),
  reminders: Object.freeze([
    "reminder-umbrella", "reminder-waterproof-footwear", "reminder-wind-layer",
    "reminder-sun-protection", "reminder-water-bottle", "reminder-removable-layer",
    "reminder-storm",
  ]),
  status: Object.freeze([
    "status-location", "status-loading", "status-slow", "status-offline",
    "status-retry", "status-information",
  ]),
  decorative: Object.freeze([
    "decor-sparkle", "decor-star", "decor-blob", "decor-dots", "decor-heart",
    "decor-flower", "decor-skyline", "decor-sticker",
  ]),
});

export const PIXEL_CHARACTER_ASSET_IDS = Object.freeze([
  ...ASSET_INVENTORY.characters,
  ...ASSET_INVENTORY.upperBody,
  ...ASSET_INVENTORY.lowerBody,
  ...ASSET_INVENTORY.footwear,
  ...ASSET_INVENTORY.modifiers,
]);

const PIXEL_CHARACTER_ASSET_ID_SET = new Set(PIXEL_CHARACTER_ASSET_IDS);

export function getAssetHref(symbolId, prefix = "") {
  const path = PIXEL_CHARACTER_ASSET_ID_SET.has(symbolId)
    ? PIXEL_CHARACTER_SPRITE_PATH
    : SVG_SPRITE_PATH;
  return `${prefix}${path}#${symbolId}`;
}

const UPPER_RULES = [
  [/shearling/, "upper-shearling"],
  [/weather shell/, "upper-shell"],
  [/wool-style coat/, "upper-wool-coat"],
  [/parka/, "upper-parka"],
  [/puffer vest/, "upper-puffer-vest"],
  [/puffer/, "upper-puffer"],
  [/oversized coat/, "upper-coat"],
  [/insulated track/, "upper-insulated-track"],
  [/insulated jacket|light puffer/, "upper-light-puffer"],
  [/windbreaker/, "upper-windbreaker"],
  [/bomber/, "upper-bomber"],
  [/denim jacket/, "upper-denim-jacket"],
  [/track jacket/, "upper-track-jacket"],
  [/fleece hoodie|hoodie/, "upper-hoodie"],
  [/fleece/, "upper-fleece"],
  [/cardigan/, "upper-cardigan"],
  [/flannel/, "upper-flannel"],
  [/sweater|knit/, "upper-sweater"],
  [/sweatshirt/, "upper-sweatshirt"],
  [/crewneck/, "upper-crewneck"],
  [/long-sleeve/, "upper-long-sleeve"],
  [/polo/, "upper-polo"],
  [/tank/, "upper-tank"],
  [/overshirt|shirt|rugby/, "upper-shirt"],
  [/tee|jersey/, "upper-tee"],
];

const LOWER_RULES = [
  [/thermal/, "lower-thermal"],
  [/leggings/, "lower-leggings"],
  [/utility|cargos$/, "lower-utility"],
  [/wide-leg|loose jeans/, "lower-wide-leg"],
  [/parachute/, "lower-parachute"],
  [/joggers/, "lower-joggers"],
  [/track pants/, "lower-joggers"],
  [/chinos|corduroy/, "lower-chinos"],
  [/trousers|lined trousers/, "lower-trousers"],
  [/jeans|denim$/, "lower-jeans"],
  [/cargo shorts/, "lower-cargo-shorts"],
  [/bike shorts/, "lower-bike-shorts"],
  [/track shorts/, "lower-track-shorts"],
  [/denim shorts/, "lower-denim-shorts"],
  [/running shorts|shorts$/, "lower-running-shorts"],
];

const FOOTWEAR_RULES = [
  [/winter/, "footwear-winter"],
  [/boots/, "footwear-boots"],
  [/warm shoes/, "footwear-warm"],
  [/casual shoes/, "footwear-casual"],
  [/high-tops/, "footwear-high-tops"],
  [/skate/, "footwear-skate"],
  [/running/, "footwear-running"],
  [/trainers/, "footwear-trainers"],
  [/low-top/, "footwear-low-top"],
  [/canvas|sneakers/, "footwear-canvas"],
];

function matchLayer(item, rules, role) {
  const match = rules.find(([pattern]) => pattern.test(item));
  if (!match) throw new Error(`No ${role} SVG layer for: ${item}`);
  return match[1];
}

export function resolveRecipeLayers(items, character) {
  if (!CHARACTER_PRESENTATIONS.includes(character)) {
    throw new RangeError(`Unknown character presentation: ${character}`);
  }
  if (!Array.isArray(items) || items.length !== 3) {
    throw new TypeError("A semantic recipe must contain upper, lower, and footwear items");
  }

  return Object.freeze([
    `character-${character}`,
    matchLayer(items[1], LOWER_RULES, "lower-body"),
    matchLayer(items[0], UPPER_RULES, "upper-body"),
    matchLayer(items[2], FOOTWEAR_RULES, "footwear"),
  ]);
}

export const ASSEMBLED_OUTFITS = Object.freeze(CHARACTER_PRESENTATIONS.flatMap((character) => (
  OUTFIT_CATEGORIES.flatMap((category) => (
    OUTFIT_STYLES.flatMap((style) => (
      getOutfitRecipes(category, style, character).map((outfit) => Object.freeze({
        fitId: outfit.fitId,
        recipeId: outfit.id,
        character,
        category,
        style,
        variation: outfit.variation,
        layerIds: resolveRecipeLayers(outfit.items, character),
        accessibleSummary: outfit.accessibleSummary,
      }))
    ))
  ))
)));

export const PROTECTION_LAYER_IDS = Object.freeze({
  rain: "modifier-rain-shell",
  wind: "modifier-wind-layer",
  snowFootwear: "modifier-waterproof-boots",
});

const OUTFIT_BY_FIT_ID = new Map(ASSEMBLED_OUTFITS.map((outfit) => [outfit.fitId, outfit]));

export function getAssembledOutfit(fitId) {
  return OUTFIT_BY_FIT_ID.get(fitId) ?? null;
}

export function composeOutfitLayerIds(assembledOutfit, modifiers = {}) {
  if (!assembledOutfit || !Array.isArray(assembledOutfit.layerIds)) {
    throw new TypeError("An assembled outfit is required");
  }

  const [character, lowerBody, upperBody, baseFootwear] = assembledOutfit.layerIds;
  const protection = [];
  if (modifiers.rain) {
    protection.push(PROTECTION_LAYER_IDS.rain);
  } else if (modifiers.wind) {
    protection.push(PROTECTION_LAYER_IDS.wind);
  }
  const footwear = modifiers.snow ? PROTECTION_LAYER_IDS.snowFootwear : baseFootwear;
  return Object.freeze([character, lowerBody, upperBody, ...protection, footwear]);
}
