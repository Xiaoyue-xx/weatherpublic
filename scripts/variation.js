import {
  CHARACTER_PRESENTATIONS,
  OUTFIT_CATEGORIES,
  OUTFIT_STYLES,
  REMINDER_CONTENT,
  applyProtectiveLayers,
  getOutfitRecipes,
} from "../data/content.js";

export const OUTFIT_COLOR_VARIANT_COUNT = 3;

/**
 * FNV-1a is a small, deterministic 32-bit non-cryptographic hash. Each content
 * choice hashes the same normalized seed with a distinct salt, preventing the
 * outfit, color, and reminder arrays from sharing a random index or state.
 */
export function stableHash(value) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function normalizedCoordinate(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${label} must be a finite number`);
  }
  return Object.is(value, -0) ? "0.000" : value.toFixed(3);
}

export function createVariationSeed({ latitude, longitude, date, character, style }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) {
    throw new TypeError("date must be a local ISO date");
  }
  if (!CHARACTER_PRESENTATIONS.includes(character)) {
    throw new RangeError(`Unknown character presentation: ${character}`);
  }
  if (!OUTFIT_STYLES.includes(style)) {
    throw new RangeError(`Unknown style: ${style}`);
  }

  return [
    normalizedCoordinate(latitude, "latitude"),
    normalizedCoordinate(longitude, "longitude"),
    date,
    character,
    style,
  ].join("|");
}

export function stableIndex(seed, salt, itemCount) {
  if (!Number.isInteger(itemCount) || itemCount < 1) {
    throw new RangeError("itemCount must be a positive integer");
  }
  return stableHash(`${salt}|${seed}`) % itemCount;
}

export function selectContentVariants({
  latitude,
  longitude,
  date,
  character,
  style,
  category,
  modifiers = {},
  reminderTypes = [],
}) {
  if (!OUTFIT_CATEGORIES.includes(category)) {
    throw new RangeError(`Unknown category: ${category}`);
  }

  const seed = createVariationSeed({ latitude, longitude, date, character, style });
  const eligibleOutfits = getOutfitRecipes(category, style, character);
  const outfitIndex = stableIndex(seed, "outfit", eligibleOutfits.length);
  const colorIndex = stableIndex(seed, "outfit-color", OUTFIT_COLOR_VARIANT_COUNT);
  const outfit = applyProtectiveLayers(eligibleOutfits[outfitIndex], modifiers);
  const uniqueReminderTypes = [...new Set(reminderTypes)];

  const reminders = uniqueReminderTypes.map((type) => {
    const content = REMINDER_CONTENT[type];
    if (!content) throw new RangeError(`Unknown reminder type: ${type}`);
    const wordingIndex = stableIndex(seed, `${type}-copy`, content.wording.length);
    return Object.freeze({
      type,
      wordingIndex,
      iconId: content.iconId,
      text: content.wording[wordingIndex],
    });
  });

  return Object.freeze({
    outfitIndex,
    colorIndex,
    outfit,
    reminders: Object.freeze(reminders),
  });
}
