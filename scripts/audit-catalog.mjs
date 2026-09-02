import {
  isKnownAnatomy,
  isKnownRequirementSubject,
  readCatalogBundle,
  requirementEntries,
  slotSetForAxis
} from "./catalog-utils.mjs";

let catalog;
try {
  catalog = readCatalogBundle().catalog;
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const entities = Array.isArray(catalog.entities) ? catalog.entities : [];
const categoryNames = Object.keys(catalog.categoryColors || {});
const categorySet = new Set(categoryNames);
const categoryEnSet = new Set(Object.keys(catalog.categoryEn || {}));
const knownAxes = new Set(["single", "give-receive", "ds-role"]);
const structuralErrors = [];
const anatomyFindings = [];
const categoryFindings = [];
const axisFindings = [];
const verbose = process.argv.includes("--verbose");

function simplify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function scenarioText(entity) {
  return Object.values(entity.scenarios || {})
    .flatMap(block => [
      block?.practice,
      block?.explanation,
      block?.practiceEn,
      block?.explanationEn
    ])
    .filter(Boolean)
    .join(" | ");
}

function mainLabel(entity) {
  const first = Object.values(entity.scenarios || {})[0] || {};
  return first.practice || first.practiceEn || entity.id;
}

function categoriesFor(entity) {
  return [...new Set(Object.values(entity.scenarios || {}).map(block => block?.category).filter(Boolean))];
}

function requiredAnatomies(entity) {
  return new Set(requirementEntries(entity).map(req => req.anatomy).filter(Boolean));
}

const anatomyRules = [
  { anatomy:"penis", pattern:/\b(penis|penien|penienne|verge|gland|cock|penile|phallus|fellation|blowjob|handjob|footjob|branlette|masturbateur|stroker|sleeve|cockwarming|cock ring|cage de chastete|chastity cage|sperme|semen|ejaculation|ejaculate|creampie)\b/ },
  { anatomy:"testicles", pattern:/\b(testicule|testicules|couille|couilles|testicular|ball stretcher|humbler)\b/ },
  { anatomy:"vulva", pattern:/\b(vulve|vulva|clitoris|clitoridien|clitoridienne|clitoral|cunnilingus|squirting|ejaculation feminine|levres genitales|labia)\b/ },
  { anatomy:"vagina", pattern:/\b(vagin|vaginal|vaginale|vagina|g-?spot|point g|speculum vaginal|fisting vaginal|penetration vaginale)\b/ },
  { anatomy:"breasts", pattern:/\b(poitrine|seins?|breasts?|nipples?|tetons?|titjob|nipple)\b/ },
  { anatomy:"prostate", pattern:/\b(prostate|prostatique|prostatic|milking)\b/ }
];

const categoryRules = [
  { category:"Médical / clinique", pattern:/\b(medical|clinique|clinicien|auscultation|stethoscope|speculum|temperature clinique|examen medical)\b/ },
  { category:"Photo / vidéo", pattern:/\b(photo|photos|video|videos|filmer|filme|camera|webcam|enregistrer|recording)\b/ },
  { category:"À distance / numérique", pattern:/\b(distance|numerique|message|sms|appel video|visio|connecte|telecommande|remote|digital|online|sextoy connecte)\b/ },
  { category:"Tiers / partenaires multiples", pattern:/\b(tiers|troisieme|autre homme|autre partenaire|partenaire masculin|partenaires multiples|multiple partners|third party|cuck|gangbang)\b/ },
  { category:"Fluides / messy play", pattern:/\b(sperme|semen|ejaculation|creampie|cracher|salive|spit|urine|uriner|pee|fluides|messy)\b/ },
  { category:"Contrôle sexuel / chasteté", pattern:/\b(chastete|orgasme|edging|privation|denial|permission de jouir|cage)\b/ },
  { category:"Jeux génitaux", pattern:/\b(genital|genitaux|penis|testicule|vulve|clitoris|prostate|gland|cock ring|ball stretcher|humbler|pince clitoridienne)\b/ },
  { category:"Pratiques sexuelles / sextoys", pattern:/\b(sextoy|gode|dildo|vibromasseur|plug|penetration|fellation|cunnilingus|masturbateur|stroker|rabbit|sleeve|footjob|handjob)\b/ },
  { category:"Bondage / accessoires BDSM", pattern:/\b(bondage|corde|cordes|attache|attacher|menottes|cuffs|restraint|shibari)\b/ },
  { category:"Impact play", pattern:/\b(impact|impacts|claque|claques|coups|fouet|martinet|spanking|paddle|canne)\b/ },
  { category:"Jeux sensoriels", pattern:/\b(sensoriel|sensations|cire|glace|plume|texture|ventouse|pinces? a tetons|poids aux tetons)\b/ },
  { category:"Dirty talk / jeu verbal", pattern:/\b(dirty talk|verbal|phrase|decrire|compliments|insulte|voix haute)\b/ },
  { category:"Humiliation / objectification", pattern:/\b(humiliation|humilier|objectification|objet|degradation|sph|small penis)\b/ },
  { category:"Adoration / fétichismes corporels", pattern:/\b(adoration|worship|venerer|lecher les pieds|pieds|talons)\b/ },
  { category:"Fétichismes / tenues", pattern:/\b(latex|lycra|spandex|nylon|fourrure|tenue|lingerie|porter)\b/ },
  { category:"Contrôle financier", pattern:/\b(argent|financier|budget|depense|finances|financial)\b/ },
  { category:"Hypnose / conditionnement", pattern:/\b(hypnose|hypnotique|conditionnement|trigger|declencheur)\b/ },
  { category:"Pet play", pattern:/\b(pet play|chiot|chaton|animal|collier pet)\b/ },
  { category:"Primal play", pattern:/\b(primal|chasse|predateur|proie|morsure)\b/ },
  { category:"CNC / contrainte consentie", pattern:/\b(cnc|contrainte consentie|forcee simulee|forced simulated|resistance)\b/ },
  { category:"Edge play / pratiques à risque", pattern:/\b(edge play|sang|aiguille|needle|cutting|scarification|asphyxie|breath)\b/ }
];

function scenarioBlockText(block) {
  return [
    block?.practice,
    block?.explanation,
    block?.practiceEn,
    block?.explanationEn
  ].filter(Boolean).join(" | ");
}

function expectedAnatomiesForBlock(block) {
  const text = simplify(scenarioBlockText(block));
  if (simplify(block?.category) === "tiers / partenaires multiples") return [];
  if (/\b(autre homme|autre partenaire|partenaire masculin|tiers|third party|third-party)\b/.test(text)) return [];

  const ignored = new Set();
  if (/\b(baillon boule|ball gag)\b/.test(text)) ignored.add("testicles");
  if (/\b(ejaculation feminine|squirting)\b/.test(text)) ignored.add("penis");
  if (/\b(gode|dildo|strap-?on|strap on|gode ceinture)\b/.test(text) && !/\b(penis|verge|gland|cock)\b/.test(text)) {
    ignored.add("penis");
  }
  if (/\b(faux seins|breast forms|soutien gorge|bra|lingerie|decollete|bust)\b/.test(text)) {
    ignored.add("breasts");
  }

  return anatomyRules
    .filter(rule => rule.pattern.test(text) && !ignored.has(rule.anatomy))
    .map(rule => rule.anatomy);
}

function expectedAnatomies(entity) {
  return [...new Set(Object.values(entity.scenarios || {}).flatMap(expectedAnatomiesForBlock))];
}

function categoryCandidates(entity) {
  const text = simplify(scenarioText(entity));
  return categoryRules.filter(rule => rule.pattern.test(text)).map(rule => rule.category);
}

function scenarioKeysForAxis(axis) {
  if (axis === "single") return new Set(["aDom", "bDom"]);
  if (axis === "give-receive" || axis === "ds-role") return new Set(["aDom", "bDom"]);
  return new Set();
}

const ids = new Set();

for (const entity of entities) {
  const id = entity?.id || "<missing-id>";
  if (!entity?.id) structuralErrors.push(`${id}: id manquant.`);
  if (ids.has(id)) structuralErrors.push(`${id}: id duplique.`);
  ids.add(id);

  const scenarios = entity?.scenarios && typeof entity.scenarios === "object" ? entity.scenarios : {};
  const scenarioKeys = Object.keys(scenarios);
  const axis = entity?.interaction?.axis || "single";
  const allowedSlots = slotSetForAxis(axis);

  if (!knownAxes.has(axis)) structuralErrors.push(`${id}: axe inconnu "${axis}".`);
  if (!scenarioKeys.length) structuralErrors.push(`${id}: aucun scenario.`);

  const categories = categoriesFor(entity);
  if (categories.length > 1) categoryFindings.push(`${id}: categories differentes selon scenario: ${categories.join(" / ")}.`);
  for (const category of categories) {
    if (!categorySet.has(category)) structuralErrors.push(`${id}: categorie sans couleur: ${category}.`);
    if (!categoryEnSet.has(category)) structuralErrors.push(`${id}: categorie sans traduction anglaise: ${category}.`);
  }

  for (const [key, block] of Object.entries(scenarios)) {
    if (!scenarioKeysForAxis(axis).has(key)) axisFindings.push(`${id}: scenario inattendu "${key}" pour axe "${axis}".`);
    if (!block?.practice) structuralErrors.push(`${id}/${key}: libelle FR manquant.`);
    if (!block?.practiceEn) structuralErrors.push(`${id}/${key}: libelle EN manquant.`);
    if (!block?.category) structuralErrors.push(`${id}/${key}: categorie manquante.`);
    if (block?.risk && !["normal", "caution", "high"].includes(block.risk)) structuralErrors.push(`${id}/${key}: risque invalide "${block.risk}".`);
    if (block?.level !== undefined && ![1, 2, 3].includes(block.level)) structuralErrors.push(`${id}/${key}: niveau invalide "${block.level}".`);
  }

  function validateAlternatives(owner, slot, alternatives) {
    if (!allowedSlots?.has(slot)) structuralErrors.push(`${id}: slot de contrainte "${owner}.${slot}" incompatible avec axe "${axis}".`);
    if (!Array.isArray(alternatives) || !alternatives.length) structuralErrors.push(`${id}: alternatives de contrainte vides pour "${owner}.${slot}".`);
    for (const alternative of Array.isArray(alternatives) ? alternatives : []) {
      if (!Array.isArray(alternative?.all) || !alternative.all.length) structuralErrors.push(`${id}: contrainte "${owner}.${slot}" sans liste all.`);
      for (const req of Array.isArray(alternative?.all) ? alternative.all : []) {
        if (!isKnownRequirementSubject(req.subject)) structuralErrors.push(`${id}: sujet de contrainte invalide "${req.subject}" dans "${owner}.${slot}".`);
        if (!isKnownAnatomy(req.anatomy)) structuralErrors.push(`${id}: anatomie invalide "${req.anatomy}" dans "${owner}.${slot}".`);
      }
    }
  }

  const requirements = entity.interaction?.requirementsBySlot || {};
  for (const [slot, alternatives] of Object.entries(requirements)) validateAlternatives("slot", slot, alternatives);

  const scenarioRequirements = entity.interaction?.requirementsByScenario || {};
  for (const [scenario, bySlot] of Object.entries(scenarioRequirements)) {
    if (!scenarioKeys.includes(scenario)) structuralErrors.push(`${id}: contraintes pour scenario inexistant "${scenario}".`);
    for (const [slot, alternatives] of Object.entries(bySlot || {})) validateAlternatives(`scenario.${scenario}`, slot, alternatives);
  }

  for (const [scenario, projection] of Object.entries(entity.interaction?.scenarioProjection || {})) {
    if (!scenarioKeys.includes(scenario)) axisFindings.push(`${id}: projection "${scenario}" sans scenario correspondant.`);
    for (const person of ["personA", "personB"]) {
      const slot = projection?.[person];
      if (!allowedSlots?.has(slot)) structuralErrors.push(`${id}: projection ${scenario}.${person}="${slot}" incompatible avec axe "${axis}".`);
    }
  }

  const expected = expectedAnatomies(entity);
  const required = requiredAnatomies(entity);
  const missing = expected.filter(anatomy => !required.has(anatomy));
  if (missing.length) {
    anatomyFindings.push({
      id,
      label: mainLabel(entity),
      category: categories[0] || "",
      axis,
      expected: [...new Set(missing)],
      required: [...required]
    });
  }

  const candidates = categoryCandidates(entity);
  const current = categories[0] || "";
  const strongCandidates = candidates.filter(category => category !== current && categorySet.has(category));
  if (strongCandidates.length && !strongCandidates.includes(current)) {
    categoryFindings.push(`${id}: categorie actuelle "${current}", candidats "${[...new Set(strongCandidates)].join(" / ")}" (${mainLabel(entity)}).`);
  }
}

const reqCount = entities.filter(entity =>
  Object.keys(entity.interaction?.requirementsBySlot || {}).length ||
  Object.keys(entity.interaction?.requirementsByScenario || {}).length
).length;
const output = {
  entities: entities.length,
  categories: categoryNames.length,
  withAnatomyRequirements: reqCount,
  structuralErrors: structuralErrors.length,
  anatomyFindings: anatomyFindings.length,
  categoryFindings: categoryFindings.length,
  axisFindings: axisFindings.length
};

console.log(`Catalogue: ${output.entities} pratiques, ${output.categories} categories, ${output.withAnatomyRequirements} pratiques avec contraintes anatomiques.`);
console.log(`Structure: ${output.structuralErrors ? "ERREUR" : "OK"} (${output.structuralErrors}).`);
console.log(`Anatomie: ${output.anatomyFindings} pratique(s) a revoir.`);
console.log(`Categories: OK (${output.categoryFindings} suggestion(s) heuristique(s) non bloquante(s)).`);
console.log(`Axes/scenarios: ${output.axisFindings} signalement(s).`);

function printSection(title, lines, limit = 60) {
  if (!lines.length) return;
  console.log(`\n${title}`);
  for (const line of lines.slice(0, limit)) {
    console.log(typeof line === "string" ? `- ${line}` : `- ${line.id}: ${line.label} | cat=${line.category} | axe=${line.axis} | attendu=${line.expected.join(",")} | requis=${line.required.join(",") || "aucun"}`);
  }
  if (lines.length > limit) console.log(`... ${lines.length - limit} autre(s) signalement(s).`);
}

printSection("Erreurs structurelles", structuralErrors, 80);
printSection("Contraintes anatomiques candidates", anatomyFindings, 120);
if (verbose) {
  printSection("Categories candidates", categoryFindings, 120);
} else if (categoryFindings.length) {
  console.log("\nCategories candidates: masquees par defaut, utilisez --verbose pour les afficher.");
}
printSection("Axes/scenarios candidats", axisFindings, 80);

if (structuralErrors.length) process.exit(1);
