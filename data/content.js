export const CHARACTER_OPTIONS = Object.freeze([
  Object.freeze({ id: "crop", label: "Cropped" }),
  Object.freeze({ id: "curls", label: "Curls" }),
  Object.freeze({ id: "waves", label: "Long waves" }),
  Object.freeze({ id: "bob", label: "Soft bob" }),
]);
export const CHARACTER_PRESENTATIONS = Object.freeze(CHARACTER_OPTIONS.map(({ id }) => id));
export const SKIN_TONES = Object.freeze([
  Object.freeze({ id: "deep", label: "Deep", base: "#6f3f31", shadow: "#512b23", blush: "#a95f55" }),
  Object.freeze({ id: "dark", label: "Dark", base: "#92573f", shadow: "#6f3d2e", blush: "#c77468" }),
  Object.freeze({ id: "medium", label: "Medium", base: "#c98262", shadow: "#a85f49", blush: "#df8c82" }),
  Object.freeze({ id: "tan", label: "Tan", base: "#dfa07b", shadow: "#bd755b", blush: "#ea9188" }),
  Object.freeze({ id: "light", label: "Light", base: "#f2bd9e", shadow: "#db9477", blush: "#ee9b98" }),
]);

export function getCharacterLabel(character) {
  return CHARACTER_OPTIONS.find(({ id }) => id === character)?.label ?? character;
}
export const OUTFIT_CATEGORIES = Object.freeze([
  "hot",
  "warm",
  "comfortable",
  "chilly",
  "cold",
]);
export const OUTFIT_STYLES = Object.freeze(["campus-casual", "sporty", "streetwear"]);

function slug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function recipe(category, style, variation, items) {
  return Object.freeze({
    id: `${category}-${style}-${variation + 1}`,
    category,
    style,
    variation,
    items: Object.freeze(items),
  });
}

function recipeCell(category, style, outfits) {
  return Object.freeze(outfits.map((items, index) => recipe(category, style, index, items)));
}

export const OUTFIT_RECIPES = Object.freeze({
  hot: Object.freeze({
    "campus-casual": recipeCell("hot", "campus-casual", [
      ["graphic tee", "denim shorts", "canvas sneakers"],
      ["tank", "cargo shorts", "low-top sneakers"],
      ["lightweight tee", "linen trousers", "canvas shoes"],
    ]),
    sporty: recipeCell("hot", "sporty", [
      ["performance tee", "running shorts", "trainers"],
      ["athletic tank", "bike shorts", "trainers"],
      ["mesh tee", "track shorts", "running shoes"],
    ]),
    streetwear: recipeCell("hot", "streetwear", [
      ["oversized tee", "cargo shorts", "high-tops"],
      ["boxy tank", "lightweight parachute pants", "sneakers"],
      ["jersey", "denim shorts", "skate shoes"],
    ]),
  }),
  warm: Object.freeze({
    "campus-casual": recipeCell("warm", "campus-casual", [
      ["tee", "straight jeans", "sneakers"],
      ["polo", "chinos", "canvas shoes"],
      ["lightweight shirt", "relaxed trousers", "sneakers"],
    ]),
    sporty: recipeCell("warm", "sporty", [
      ["training tee", "joggers", "trainers"],
      ["athletic polo", "track pants", "sneakers"],
      ["quarter-zip tee", "shorts", "running shoes"],
    ]),
    streetwear: recipeCell("warm", "streetwear", [
      ["overshirt and tee", "cargos", "high-tops"],
      ["rugby shirt", "loose jeans", "skate shoes"],
      ["cropped or boxy jacket and tank", "parachute pants", "sneakers"],
    ]),
  }),
  comfortable: Object.freeze({
    "campus-casual": recipeCell("comfortable", "campus-casual", [
      ["long-sleeve tee", "jeans", "sneakers"],
      ["sweatshirt", "chinos", "casual shoes"],
      ["cardigan and tee", "trousers", "sneakers"],
    ]),
    sporty: recipeCell("comfortable", "sporty", [
      ["track jacket and tee", "joggers", "trainers"],
      ["hoodie", "leggings or joggers", "running shoes"],
      ["crewneck", "track pants", "sneakers"],
    ]),
    streetwear: recipeCell("comfortable", "streetwear", [
      ["flannel and tee", "cargos", "high-tops"],
      ["denim jacket and tee", "wide-leg jeans", "skate shoes"],
      ["hoodie", "utility pants", "sneakers"],
    ]),
  }),
  chilly: Object.freeze({
    "campus-casual": recipeCell("chilly", "campus-casual", [
      ["sweater and tee", "jeans", "warm shoes"],
      ["fleece", "corduroy pants", "sneakers"],
      ["light puffer and long-sleeve", "trousers", "boots"],
    ]),
    sporty: recipeCell("chilly", "sporty", [
      ["insulated track jacket and base layer", "joggers", "trainers"],
      ["fleece hoodie", "thermal leggings or joggers", "running shoes"],
      ["windbreaker and crewneck", "track pants", "sneakers"],
    ]),
    streetwear: recipeCell("chilly", "streetwear", [
      ["bomber and hoodie", "cargos", "boots"],
      ["oversized coat and knit", "wide-leg pants", "high-tops"],
      ["puffer vest and hoodie", "utility pants", "boots"],
    ]),
  }),
  cold: Object.freeze({
    "campus-casual": recipeCell("cold", "campus-casual", [
      ["insulated parka and sweater", "thermal pants", "winter boots"],
      ["puffer and fleece", "jeans", "boots"],
      ["wool-style coat and knit", "lined trousers", "boots"],
    ]),
    sporty: recipeCell("cold", "sporty", [
      ["insulated jacket and thermal base", "joggers", "winter shoes"],
      ["long puffer and fleece", "thermal leggings or joggers", "boots"],
      ["weather shell and insulating midlayer", "thermal pants", "boots"],
    ]),
    streetwear: recipeCell("cold", "streetwear", [
      ["oversized puffer and hoodie", "cargos", "boots"],
      ["parka and layered knit", "wide-leg pants", "winter boots"],
      ["shearling-style jacket and thermal top", "dark denim", "boots"],
    ]),
  }),
});

export const REMINDER_CONTENT = Object.freeze({
  rain: Object.freeze({
    iconId: "reminder-umbrella",
    wording: Object.freeze([
      "Pack an umbrella before you head out.",
      "Rain is possible—bring a light rain layer.",
      "Keep an umbrella close for your walk.",
    ]),
  }),
  snow: Object.freeze({
    iconId: "reminder-waterproof-footwear",
    wording: Object.freeze([
      "Choose waterproof shoes for snow.",
      "Snow is in the forecast—wear grippy, water-resistant footwear.",
      "Keep your feet warm and dry with winter-ready shoes.",
    ]),
  }),
  wind: Object.freeze({
    iconId: "reminder-wind-layer",
    wording: Object.freeze([
      "Add a wind-resistant outer layer.",
      "It will be breezy—bring a jacket that blocks the wind.",
      "A light windbreaker will help on exposed walks.",
    ]),
  }),
  uv: Object.freeze({
    iconId: "reminder-sun-protection",
    wording: Object.freeze([
      "Add sunscreen, sunglasses, or a hat.",
      "UV protection is useful today—cover up and use sunscreen.",
      "Bring sun protection for time outdoors.",
    ]),
  }),
  hydration: Object.freeze({
    iconId: "reminder-water-bottle",
    wording: Object.freeze([
      "Carry water and take regular drink breaks.",
      "It will feel hot—bring a refillable water bottle.",
      "Stay hydrated during your walk across campus.",
    ]),
  }),
  layers: Object.freeze({
    iconId: "reminder-removable-layer",
    wording: Object.freeze([
      "Temperatures will shift—wear removable layers.",
      "A layer you can take off will help with today's temperature swing.",
      "Plan for a cooler start or finish with an extra layer.",
    ]),
  }),
  thunderstorm: Object.freeze({
    iconId: "reminder-storm",
    wording: Object.freeze([
      "Thunderstorms are possible—check conditions before leaving.",
      "Watch the latest forecast and consider delaying outdoor travel.",
      "Storms may interrupt your route—stay weather-aware.",
    ]),
  }),
});

export function getOutfitRecipes(category, style, character) {
  if (!OUTFIT_CATEGORIES.includes(category)) throw new RangeError(`Unknown category: ${category}`);
  if (!OUTFIT_STYLES.includes(style)) throw new RangeError(`Unknown style: ${style}`);
  if (!CHARACTER_PRESENTATIONS.includes(character)) {
    throw new RangeError(`Unknown character presentation: ${character}`);
  }

  return OUTFIT_RECIPES[category][style].map((baseRecipe) => Object.freeze({
    ...baseRecipe,
    character,
    fitId: `${baseRecipe.id}-${character}`,
    layerKeys: Object.freeze(baseRecipe.items.map((item) => `${character}:${slug(item)}`)),
    accessibleSummary: `${getCharacterLabel(character)} character wearing ${baseRecipe.items.join(", ")}.`,
  }));
}

export function applyProtectiveLayers(fittedRecipe, modifiers = {}) {
  const items = [...fittedRecipe.items];
  const protectionLayers = [];
  const carryItems = [];
  let footwearOverride = null;

  if (modifiers.rain) {
    protectionLayers.push("water-resistant shell");
    carryItems.push("umbrella");
  }
  if (modifiers.snow) {
    items[items.length - 1] = "waterproof winter boots";
    footwearOverride = `${fittedRecipe.character}:waterproof-winter-boots`;
  }
  if (modifiers.wind) {
    const rainLayerIndex = protectionLayers.indexOf("water-resistant shell");
    if (rainLayerIndex >= 0) {
      protectionLayers[rainLayerIndex] = "wind-resistant rain shell";
    } else {
      protectionLayers.push("wind-resistant outer layer");
    }
  }

  const completeItems = [...items, ...protectionLayers];
  return Object.freeze({
    ...fittedRecipe,
    items: Object.freeze(items),
    protectionLayers: Object.freeze(protectionLayers),
    carryItems: Object.freeze(carryItems),
    footwearOverride,
    accessibleSummary: `${getCharacterLabel(fittedRecipe.character)} character wearing ${completeItems.join(", ")}.`,
  });
}
