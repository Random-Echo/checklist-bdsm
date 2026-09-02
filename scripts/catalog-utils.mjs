import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const catalogFile = path.join(root, "practice-catalog.js");
export const CATALOG_MARKER = "const CATALOG = ";
export const CATALOG_END_MARKER = ";\n  const profile";
export const ANATOMY_KEYS = Object.freeze(["penis", "testicles", "vulva", "vagina", "breasts", "prostate"]);
export const REQUIREMENT_SUBJECTS = Object.freeze(["self", "partner"]);
export const AXIS_SLOT_KEYS = Object.freeze({
  single: Object.freeze(["interest"]),
  "give-receive": Object.freeze(["give", "receive"]),
  "ds-role": Object.freeze(["dominant", "submissive"])
});

export function extractCatalogBundle(text, source = "practice-catalog.js", file = path.join(root, source)) {
  const start = text.indexOf(CATALOG_MARKER);
  const end = text.indexOf(CATALOG_END_MARKER, start);

  if (start === -1 || end === -1) {
    throw new Error(`Impossible d'extraire CATALOG depuis ${source}.`);
  }

  const jsonStart = start + CATALOG_MARKER.length;
  return {
    text,
    source,
    file,
    start,
    end,
    jsonStart,
    catalog: JSON.parse(text.slice(jsonStart, end))
  };
}

export function readCatalogBundle(file = catalogFile) {
  const text = fs.readFileSync(file, "utf8");
  return extractCatalogBundle(text, path.basename(file), file);
}

export function writeCatalogBundle(bundle, catalog = bundle.catalog) {
  const updated = `${bundle.text.slice(0, bundle.jsonStart)}${JSON.stringify(catalog)}${bundle.text.slice(bundle.end)}`;
  fs.writeFileSync(bundle.file || path.join(root, bundle.source), updated, "utf8");
}

export function requirementEntries(entity) {
  const out = [];
  for (const [slot, alternatives] of Object.entries(entity?.interaction?.requirementsBySlot || {})) {
    for (const alternative of Array.isArray(alternatives) ? alternatives : []) {
      for (const req of Array.isArray(alternative?.all) ? alternative.all : []) {
        out.push({ source:"slot", slot, ...req });
      }
    }
  }
  for (const [scenario, bySlot] of Object.entries(entity?.interaction?.requirementsByScenario || {})) {
    for (const [slot, alternatives] of Object.entries(bySlot || {})) {
      for (const alternative of Array.isArray(alternatives) ? alternatives : []) {
        for (const req of Array.isArray(alternative?.all) ? alternative.all : []) {
          out.push({ source:"scenario", scenario, slot, ...req });
        }
      }
    }
  }
  return out;
}

export function slotSetForAxis(axis) {
  return new Set(AXIS_SLOT_KEYS[axis] || []);
}

export function isKnownAnatomy(value) {
  return ANATOMY_KEYS.includes(value);
}

export function isKnownRequirementSubject(value) {
  return REQUIREMENT_SUBJECTS.includes(value);
}
