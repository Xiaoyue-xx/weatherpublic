import { PIXEL_CHARACTER_SPRITE_PATH } from "../data/assets.js";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const renderVersions = new WeakMap();
let spritePromise = null;
let shadeCounter = 0;

function loadSprite() {
  if (!spritePromise) {
    spritePromise = fetch(PIXEL_CHARACTER_SPRITE_PATH)
      .then((response) => {
        if (!response.ok) throw new Error(`Pixel sprite request failed: ${response.status}`);
        return response.text();
      })
      .then((source) => {
        const sprite = new DOMParser().parseFromString(source, "image/svg+xml");
        if (sprite.querySelector("parsererror")) throw new Error("Pixel sprite is invalid SVG");
        return sprite;
      });
  }
  return spritePromise;
}

function copyExpandedNode(source, sprite, ownerDocument) {
  if (source.nodeType !== 1) return ownerDocument.importNode(source, false);

  if (source.localName === "use") {
    const referenceId = source.getAttribute("href")?.replace(/^#/, "");
    const reference = referenceId ? sprite.getElementById(referenceId) : null;
    if (!reference) throw new Error(`Missing internal pixel layer: ${referenceId}`);
    const group = ownerDocument.createElementNS(SVG_NAMESPACE, "g");
    for (const attribute of source.attributes) {
      if (attribute.name !== "href") group.setAttribute(attribute.name, attribute.value);
    }
    for (const child of reference.childNodes) {
      group.append(copyExpandedNode(child, sprite, ownerDocument));
    }
    return group;
  }

  const clone = ownerDocument.importNode(source, false);
  for (const child of source.childNodes) {
    clone.append(copyExpandedNode(child, sprite, ownerDocument));
  }
  return clone;
}

function setPalette(svg, tone, palette) {
  svg.style.setProperty("--skin-tone", tone.base);
  svg.style.setProperty("--skin-shadow", tone.shadow);
  svg.style.setProperty("--skin-blush", tone.blush);
  svg.style.setProperty("--garment-primary", palette[0]);
  svg.style.setProperty("--garment-secondary", palette[1]);
  svg.style.setProperty("--garment-dark", palette[2]);
  svg.style.setProperty("--shoe-color", palette[3]);
}

export async function renderPixelArt(svg, layers, { tone, palette, ariaLabel } = {}) {
  if (!svg || !tone || !Array.isArray(palette) || palette.length !== 4) return false;
  const version = (renderVersions.get(svg) ?? 0) + 1;
  renderVersions.set(svg, version);
  svg.replaceChildren();
  svg.dataset.pixelStatus = "loading";
  setPalette(svg, tone, palette);
  if (ariaLabel) svg.setAttribute("aria-label", ariaLabel);

  try {
    const sprite = await loadSprite();
    if (renderVersions.get(svg) !== version) return false;
    const style = svg.ownerDocument.createElementNS(SVG_NAMESPACE, "style");
    style.textContent = sprite.querySelector("style")?.textContent ?? "";
    svg.append(style);

    // Each svg gets its own copy of the shared bevel filter so element ids stay unique.
    const shadeId = `pixel-shade-${++shadeCounter}`;
    const shade = svg.ownerDocument.importNode(sprite.getElementById("pixel-shade"), true);
    shade.setAttribute("id", shadeId);
    const defs = svg.ownerDocument.createElementNS(SVG_NAMESPACE, "defs");
    defs.append(shade);
    svg.append(defs);

    for (const layerId of layers) {
      const symbol = sprite.getElementById(layerId);
      if (!symbol) throw new Error(`Missing pixel layer: ${layerId}`);
      const group = svg.ownerDocument.createElementNS(SVG_NAMESPACE, "g");
      group.dataset.pixelLayer = layerId;
      group.setAttribute("filter", `url(#${shadeId})`);
      for (const child of symbol.childNodes) {
        group.append(copyExpandedNode(child, sprite, svg.ownerDocument));
      }
      svg.append(group);
    }
    svg.dataset.pixelStatus = "ready";
    return true;
  } catch (error) {
    svg.dataset.pixelStatus = "error";
    console.error("Pixel artwork could not be rendered", error);
    return false;
  }
}
