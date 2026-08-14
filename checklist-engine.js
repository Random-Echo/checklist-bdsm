
const CHECKLIST_VARIANT = window.CHECKLIST_VARIANT;
const CHECKLIST_DATA = window.CHECKLIST_DATA;
if (!CHECKLIST_VARIANT || !CHECKLIST_DATA) throw new Error("Checklist configuration missing.");
const initialItems = CHECKLIST_DATA.items;
const categoryColors = CHECKLIST_DATA.categoryColors;
// v123 — moteur commun optimisé : catalogue statique compact, rendu en une passe,
// colonnes et sélecteurs DOM mis en cache, métriques du tirage calculées en une passe.
const APP_VERSION = "v123";

const LANG_KEY = window.CHECKLIST_SITE.languageKey;
const LEGACY_LANG_KEY = window.CHECKLIST_SITE.legacyLanguageKey;
const CATEGORY_EN = CHECKLIST_DATA.categoryEn;
const I18N = CHECKLIST_DATA.i18n;

// v123 — convention spatiale unique : homme/bleu à gauche, femme/prune à droite.
// Chaque variante déclare quel rôle BDSM correspond à chaque côté.
const ROLE_VISUAL_ORDER = (() => {
  const order = Array.isArray(CHECKLIST_VARIANT.visualRoleOrder) ? CHECKLIST_VARIANT.visualRoleOrder : ["sub","dom"];
  return order.length === 2 && new Set(order).size === 2 && order.every(role => role === "sub" || role === "dom")
    ? [...order]
    : ["sub","dom"];
})();
function visualRolePair(subValue, domValue) {
  return ROLE_VISUAL_ORDER.map(role => role === "sub" ? subValue : domValue);
}

let currentLang = (() => {
  const saved = localStorage.getItem(LANG_KEY);
  if (saved === "fr" || saved === "en") return saved;
  const systemLang = String(navigator.language || "").toLowerCase();
  return systemLang.startsWith("fr") ? "fr" : "en";
})();

function t(key) {
  return (I18N[currentLang] && I18N[currentLang][key]) ?? I18N.fr[key] ?? key;
}

function localizedCategory(categoryName) {
  return currentLang === "en" ? (CATEGORY_EN[categoryName] || categoryName) : categoryName;
}

function localizedPractice(item) {
  return currentLang === "en" && item.practiceEn ? item.practiceEn : item.practice;
}

function localizedExplanation(item) {
  return currentLang === "en" && item.explanationEn ? item.explanationEn : item.explanation;
}

function practiceCountText(n) {
  if (currentLang === "fr") return `${n} pratique${n > 1 ? "s" : ""}`;
  return `${n} practice${n === 1 ? "" : "s"}`;
}

function applyStaticLanguage() {
  document.documentElement.lang = currentLang;
  document.title = `${t("appTitle")} ${APP_VERSION}`;

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    el.textContent = t(key);
  });
  document.querySelectorAll("[data-i18n-html]").forEach(el => {
    const key = el.dataset.i18nHtml;
    el.innerHTML = t(key);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach(el => {
    el.setAttribute("aria-label", t(el.dataset.i18nAriaLabel));
  });

}

function renderLanguageButtons() {
  document.querySelectorAll("[data-lang-choice]").forEach(btn => {
    const active = btn.dataset.langChoice === currentLang;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });
}


function updateHelpLanguage() {
  if (!helpModal) return;

  document.querySelectorAll("[data-help-lang]").forEach(block => {
    block.hidden = block.dataset.helpLang !== currentLang;
  });

  if (currentLang === "fr") {
    helpKicker.textContent = "Guide intégré";
    helpTitle.textContent = "Comment utiliser la checklist ?";
    openHelpBtn.setAttribute("aria-label", "Aide");
    openHelpBtn.title = "Aide";
    closeHelpBtn.setAttribute("aria-label", "Fermer");
    closeHelpBtn.title = "Fermer";
  } else {
    helpKicker.textContent = "Built-in guide";
    helpTitle.textContent = "How to use the checklist";
    openHelpBtn.setAttribute("aria-label", "Help");
    openHelpBtn.title = "Help";
    closeHelpBtn.setAttribute("aria-label", "Close");
    closeHelpBtn.title = "Close";
  }
}


function updateAdultInfoLanguage() {
  const fr = currentLang === "fr";
  if (adultGate) adultGate.setAttribute("aria-labelledby", fr ? "adultGateTitleFr" : "adultGateTitleEn");
  if (infoModalTitle) infoModalTitle.textContent = fr ? "Informations" : "Information";
  if (closeInfoModalBtn) {
    closeInfoModalBtn.setAttribute("aria-label", fr ? "Fermer" : "Close");
    closeInfoModalBtn.title = fr ? "Fermer" : "Close";
  }
}

function focusTrapIn(container, event) {
  if (!container || event.key !== "Tab") return;
  const focusable = [...container.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    .filter(el => !el.hidden && el.offsetParent !== null);
  if (!focusable.length) return;
  const first = focusable[0], last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}

function acceptAdultGate() {
  try {
    localStorage.setItem(window.CHECKLIST_SITE.adultKey, "true");
    localStorage.setItem(window.CHECKLIST_SITE.legacyAdultKey, "true");
  } catch (_) {}
  document.documentElement.classList.remove("adult-gate-required");
  if (adultGate) adultGate.setAttribute("aria-hidden", "true");
  setAppBackgroundInert(false);
}

function leaveAdultGate() {
  if (history.length > 1) {
    history.back();
    setTimeout(() => { try { window.location.replace("about:blank"); } catch (_) {} }, 250);
  } else {
    try { window.location.replace("about:blank"); } catch (_) {}
  }
}

function openInfoModal(section="adult", opener=null) {
  if (!infoModal) return;
  lastInfoOpener = opener || document.activeElement;
  updateAdultInfoLanguage();
  infoModal.hidden = false;
  infoModal.setAttribute("aria-hidden", "false");
  setAppBackgroundInert(true);
  requestAnimationFrame(() => {
    const suffix = currentLang === "fr" ? "Fr" : "En";
    const target = document.getElementById(`info${section.charAt(0).toUpperCase()+section.slice(1)}${suffix}`);
    if (target) target.scrollIntoView({block:"start"});
    if (closeInfoModalBtn) closeInfoModalBtn.focus();
  });
}

function closeInfoModal() {
  if (!infoModal) return;
  infoModal.hidden = true;
  infoModal.setAttribute("aria-hidden", "true");
  setAppBackgroundInert(false);
  if (lastInfoOpener && typeof lastInfoOpener.focus === "function") lastInfoOpener.focus();
}

function setAppBackgroundInert(active) {
  for (const el of [document.querySelector("header"), document.querySelector("main"), document.querySelector("footer.site-footer")]) {
    if (el && "inert" in el) el.inert = !!active;
  }
}

function openHelpModal() {
  updateHelpLanguage();
  helpModal.hidden = false;
  helpModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("help-open");
  setAppBackgroundInert(true);
  helpBody.scrollTop = 0;
  requestAnimationFrame(() => closeHelpBtn.focus());
}

function closeHelpModal() {
  helpModal.hidden = true;
  helpModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("help-open");
  setAppBackgroundInert(false);
  if (openHelpBtn) openHelpBtn.focus();
}

function setLanguage(lang, persist = true) {
  const next = lang === "fr" ? "fr" : "en";
  currentLang = next;
  if (persist) {
    localStorage.setItem(LANG_KEY, currentLang);
    localStorage.setItem(LEGACY_LANG_KEY, currentLang);
  }

  applyStaticLanguage();
  renderLanguageButtons();
  updateHelpLanguage();
  updateAdultInfoLanguage();
  renderCategoryControls();
  renderExperienceModeUI();
  renderRoleUI();
  renderColumnControls();
  renderQuickFilters();
  renderSessionPanel();
  renderExchangeInfo();
  render();
  updateCompatibilityIndicator();
}

// Moteur commun : chaque variante fournit son propre espace de stockage.
const VARIANT_STORAGE_KEYS = Object.freeze({
  items: `${CHECKLIST_VARIANT.storageNamespace}_v1`,
  scoreSchema: `${CHECKLIST_VARIANT.storageNamespace}_scoreSchema_v2`,
  safety: `${CHECKLIST_VARIANT.storageNamespace}_safety_v1`,
  columns: `${CHECKLIST_VARIANT.storageNamespace}_columns_v5`,
  legacyColumns: `${CHECKLIST_VARIANT.storageNamespace}_columns_v4`,
  role: `${CHECKLIST_VARIANT.storageNamespace}_role_v1`,
  otherRoleColumns: `${CHECKLIST_VARIANT.storageNamespace}_otherRoleColumns_v1`,
  readOnly: `${CHECKLIST_VARIANT.storageNamespace}_readOnly_v1`,
  lastModified: `${CHECKLIST_VARIANT.storageNamespace}_lastModified_v1`,
  lastExchange: `${CHECKLIST_VARIANT.storageNamespace}_lastExchange_v1`,
  session: `${CHECKLIST_VARIANT.storageNamespace}_session_v1`,
  modifiedScopes: `${CHECKLIST_VARIANT.storageNamespace}_modifiedScopes_v1`,
  experienceMode: `${CHECKLIST_VARIANT.storagePrefix}Checklist_experienceMode_v1`,
  collapsedCategories: `${CHECKLIST_VARIANT.storagePrefix}Checklist_collapsedCategories_v1`,
  randomPrefs: `${CHECKLIST_VARIANT.storagePrefix}Checklist_randomPrefs_v1`,
  randomHistory: `${CHECKLIST_VARIANT.storagePrefix}Checklist_randomHistory_v1`
});
const STORAGE_KEY = VARIANT_STORAGE_KEYS.items;
const SCORE_SCHEMA_KEY = VARIANT_STORAGE_KEYS.scoreSchema;
const SCORE_SCHEMA_VALUE = "favorite4-fantasy5-real0to4-v1";
const BACKUP_VARIANT_ID = CHECKLIST_VARIANT.id;
const ALLOW_UNTAGGED_BACKUPS = !!CHECKLIST_VARIANT.allowUntaggedBackups;
const SAFETY_KEY = VARIANT_STORAGE_KEYS.safety;
const COLUMN_PREFS_KEY = VARIANT_STORAGE_KEYS.columns;
const LEGACY_COLUMN_PREFS_KEY = VARIANT_STORAGE_KEYS.legacyColumns;
const ROLE_KEY = VARIANT_STORAGE_KEYS.role;
const OTHER_ROLE_COLUMNS_KEY = VARIANT_STORAGE_KEYS.otherRoleColumns;
const READONLY_KEY = VARIANT_STORAGE_KEYS.readOnly;
const LAST_MODIFIED_KEY = VARIANT_STORAGE_KEYS.lastModified;
const LAST_EXCHANGE_KEY = VARIANT_STORAGE_KEYS.lastExchange;
const SESSION_KEY = VARIANT_STORAGE_KEYS.session;
const MODIFIED_SCOPES_KEY = VARIANT_STORAGE_KEYS.modifiedScopes;
const EXPERIENCE_MODE_KEY = VARIANT_STORAGE_KEYS.experienceMode;
const COLLAPSED_CATEGORIES_KEY = VARIANT_STORAGE_KEYS.collapsedCategories;
const RANDOM_PREFS_KEY = VARIANT_STORAGE_KEYS.randomPrefs;
const RANDOM_HISTORY_KEY = VARIANT_STORAGE_KEYS.randomHistory;
const scoreColors = ["var(--s0)","var(--s1)","var(--s3)","var(--s4)","var(--s5)","var(--s2)"];
const FAVORITE_SCORE = 4;
const FANTASY_SCORE = 5;
const SCORE_BUTTON_ORDER = [0,1,FANTASY_SCORE,2,3,FAVORITE_SCORE];

const fixedColumns = [
  { key:"num", labelKey:"columnNum", shortKey:"columnNum", defaultVisibleMobile:false },
  { key:"category", labelKey:"columnCategory", shortKey:"columnCategory" },
  { key:"practice", labelKey:"columnPractice", shortKey:"columnPractice" },
];

const scrollColumns = [
  { key:"explanation", labelKey:"columnExplanation", shortKey:"columnExplanation", defaultVisibleMobile:false },
  ...visualRolePair(
    { key:"wantSub", labelKey:"columnWantSub", shortKey:"columnWantSubShort", owner:"sub" },
    { key:"wantDom", labelKey:"columnWantDom", shortKey:"columnWantDomShort", owner:"dom" }
  ),
  ...visualRolePair(
    { key:"priorSub", labelKey:"columnPriorSub", shortKey:"columnPriorSubShort", owner:"sub" },
    { key:"priorDom", labelKey:"columnPriorDom", shortKey:"columnPriorDomShort", owner:"dom" }
  ),
  ...visualRolePair(
    { key:"afterSub", labelKey:"columnAfterSub", shortKey:"columnAfterSubShort", owner:"sub" },
    { key:"afterDom", labelKey:"columnAfterDom", shortKey:"columnAfterDomShort", owner:"dom" }
  ),
  { key:"doneTogether", labelKey:"columnTogether", shortKey:"columnTogetherShort" },
  { key:"notes", labelKey:"columnNotes", shortKey:"columnNotesShort" },
];

function columnLabel(col) { return t(col.labelKey); }
function columnShort(col) { return t(col.shortKey); }

function validScore(v, legacyNoFantasy=false, legacyNoFavorite=false) {
  if (!Number.isInteger(v)) return null;
  // v99 : 0=🚫, 1=Pas maintenant, 2=Neutre, 3=🔥 Envie, 4=Favori, 5=💭 Fantasme.
  if (v >= 0 && v <= 3) return v;
  if (v === FAVORITE_SCORE) return legacyNoFavorite ? 3 : FAVORITE_SCORE;
  if (v === FANTASY_SCORE) return legacyNoFantasy ? 3 : FANTASY_SCORE;
  return null;
}

function isRealWorldScore(v) {
  const n = validScore(v);
  return Number.isInteger(n) && n >= 0 && n <= FAVORITE_SCORE;
}
function meetsRealMinimum(v, min) {
  const n = validScore(v);
  return isRealWorldScore(n) && n >= min;
}
function favoriteSymbol(role=null) {
  if (role === "sub") return "⭐";
  if (role === "dom") return "👑";
  return "★";
}
function scoreLabel(value, compact=false, role=null) {
  const v = validScore(value);
  if (v === null) return t("unknown");
  if (v === FANTASY_SCORE) return compact ? "💭" : t("scoreFantasy");
  if (v === FAVORITE_SCORE) {
    const symbol = favoriteSymbol(role);
    return compact ? symbol : `${symbol} ${t("favoriteWord")}`;
  }
  if (currentLang === "fr") {
    const full = ["🚫 Limite", "Pas maintenant", "Neutre", "🔥 Envie"];
    const short = ["🚫", "Pas maintenant", "Neutre", "🔥"];
    return (compact ? short : full)[v];
  }
  const full = ["🚫 Limit", "Not now", "Neutral", "🔥 Want to"];
  const short = ["🚫", "Not now", "Neutral", "🔥"];
  return (compact ? short : full)[v];
}
function scoreButtonLabel(value, role=null) {
  const v = validScore(value);
  if (v === null) return t("unknown");
  if (v === FANTASY_SCORE) return currentLang === "fr" ? "💭<br>Fantasme" : "💭<br>Fantasy";
  if (v === FAVORITE_SCORE) return `${favoriteSymbol(role)}<br>${t("favoriteWord")}`;
  if (currentLang === "fr") return ["🚫", "Pas<br>maintenant", "Neutre", "🔥<br>Envie"][v];
  return ["🚫", "Not<br>now", "Neutral", "🔥<br>Want"][v];
}
function scoreDescription(value) {
  const v = validScore(value);
  if (v === null) return t("unknown");
  if (v === FANTASY_SCORE) return t("scoreFantasyDesc");
  if (v === FAVORITE_SCORE) return t("scoreFavoriteDesc");
  const keys = ["scoreLimitDesc","scoreLaterDesc","scoreNeutralDesc","scoreWantDesc"];
  return t(keys[v]);
}
function scoreChoiceTitle(value, role=null) {
  const v = validScore(value);
  if (v === null) return t("unknown");
  return `${scoreLabel(v, false, role)} — ${scoreDescription(v)}`;
}

function riskLabel(risk) {
  if (risk === "high") return t("riskHigh").replace(/^.*?:\s*/, "");
  if (risk === "caution") return t("riskCaution").replace(/^.*?:\s*/, "");
  return t("riskNormal").replace(/^.*?:\s*/, "");
}

function riskBadge(item) {
  if (item.risk === "high") return `<span class="risk-badge risk-high" title="${esc(t("riskHighTitle"))}" aria-label="${esc(t("riskHighTitle"))}">⚠</span>`;
  if (item.risk === "caution") return `<span class="risk-badge risk-caution" title="${esc(t("riskCautionTitle"))}" aria-label="${esc(t("riskCautionTitle"))}">!</span>`;
  return "";
}

function hasLimit(item) {
  return effectiveRoleScore(item, "sub") === 0 || effectiveRoleScore(item, "dom") === 0;
}
function hasFantasyOnly(item) {
  return effectiveRoleScore(item, "sub") === FANTASY_SCORE || effectiveRoleScore(item, "dom") === FANTASY_SCORE;
}
function sessionBlockReason(item) {
  // Un fantasme peut être conservé dans la séance comme élément de discussion / jeu imaginaire,
  // mais une limite 🚫 reste toujours bloquante.
  if (hasLimit(item)) return "limit";
  return null;
}

// v99 : l'expérience antérieure de chaque rôle est distincte du fait de l'avoir fait ensemble.
function hasRoleExperience(item, role) {
  return role === "sub"
    ? !!item.priorSub || !!item.doneTogether
    : !!item.priorDom || !!item.doneTogether;
}

function normalizeItem(base, old={}, options={}) {
  const legacyFive = options.legacyFive === true;
  const legacyFour = options.legacyFour === true;
  const oldClean = { ...(old || {}) };
  delete oldClean["wantSub" + "Source"];
  delete oldClean["wantDom" + "Source"];

  const normalizedTogether = typeof oldClean.doneTogether === "boolean" ? oldClean.doneTogether : false;

  // Anciennes versions : « Fait ensemble » pouvait aussi renseigner l’ancien historique Soumis ; la migration reste prudente.
  // Par prudence, on ne migre l'ancien done vers « Déjà fait avant — Soumis » que si doneTogether n'était pas vrai.
  const normalizedPriorSub = typeof oldClean.priorSub === "boolean"
    ? oldClean.priorSub
    : (typeof oldClean.doneBeforeSub === "boolean"
      ? oldClean.doneBeforeSub
      : (oldClean.done === true && !normalizedTogether));
  const normalizedPriorDom = typeof oldClean.priorDom === "boolean"
    ? oldClean.priorDom
    : (typeof oldClean.doneBeforeDom === "boolean" ? oldClean.doneBeforeDom : false);

  let normalizedWantSub =
    validScore(oldClean.wantSub, legacyFive, legacyFour) ??
    validScore(oldClean.interest, legacyFive, legacyFour) ??
    validScore(base.interest, legacyFive, legacyFour);
  let normalizedWantDom = validScore(oldClean.wantDom, legacyFive, legacyFour);
  let normalizedAfterSub =
    validScore(oldClean.afterSub, legacyFive, legacyFour) ??
    validScore(oldClean.after, legacyFive, legacyFour);
  let normalizedAfterDom = validScore(oldClean.afterDom, legacyFive, legacyFour);

  // Les anciens marqueurs ⭐/👑 deviennent directement le niveau Favori de l'appréciation effective.
  if (oldClean.testSub === true || oldClean.starred === true) {
    if (normalizedTogether && normalizedAfterSub === 3) normalizedAfterSub = FAVORITE_SCORE;
    else if (normalizedWantSub === 3) normalizedWantSub = FAVORITE_SCORE;
  }
  if (oldClean.testDom === true) {
    if (normalizedTogether && normalizedAfterDom === 3) normalizedAfterDom = FAVORITE_SCORE;
    else if (normalizedWantDom === 3) normalizedWantDom = FAVORITE_SCORE;
  }

  if (!normalizedPriorSub && !normalizedTogether) normalizedAfterSub = null;
  if (!normalizedPriorDom && !normalizedTogether) normalizedAfterDom = null;

  return {
    ...base,
    ...oldClean,
    wantSub: normalizedWantSub,
    wantDom: normalizedWantDom,
    priorSub: !!normalizedPriorSub,
    priorDom: !!normalizedPriorDom,
    doneTogether: !!normalizedTogether,
    afterSub: normalizedAfterSub,
    afterDom: normalizedAfterDom,
    notes: typeof oldClean.notes === "string" ? oldClean.notes : "",
    id: base.id,
    category: base.category,
    practice: base.practice,
    explanation: base.explanation,
    displayIndex: base.displayIndex,
    practiceEn: base.practiceEn,
    explanationEn: base.explanationEn,
    randomizable: base.randomizable !== false,
    level: Number.isInteger(base.level) ? base.level : 3,
    risk: ["normal","caution","high"].includes(base.risk) ? base.risk : "normal"
  };
}


const LEGACY_DUPLICATE_ID_MAP = {"20":92,"36":35,"4":329,"177":230,"387":319,"238":178,"180":210,"6":14};

function canonicalPracticeId(id) {
  const n = Number(id);
  return LEGACY_DUPLICATE_ID_MAP[n] || n;
}

function mergeDuplicateUserAnswers(primary={}, duplicate={}, legacyNoFantasy=false) {
  const merged = { ...duplicate, ...primary };

  for (const key of ["wantSub","wantDom","afterSub","afterDom","interest","after"]) {
    const p = validScore(primary[key], legacyNoFantasy);
    const d = validScore(duplicate[key], legacyNoFantasy);
    if (p == null && d != null) merged[key] = d;
  }

  for (const key of ["priorSub","priorDom","doneBeforeSub","doneBeforeDom","testSub","testDom","starred","done","doneTogether"]) {
    if (primary[key] === true || duplicate[key] === true) merged[key] = true;
  }

  const pNotes = typeof primary.notes === "string" ? primary.notes.trim() : "";
  const dNotes = typeof duplicate.notes === "string" ? duplicate.notes.trim() : "";
  if (!pNotes && dNotes) merged.notes = duplicate.notes;
  else if (pNotes && dNotes && pNotes !== dNotes) merged.notes = primary.notes + "\n" + duplicate.notes;

  return merged;
}

function migrateDuplicateIdsInMap(byId, legacyNoFantasy=false) {
  for (const [oldIdRaw, targetIdRaw] of Object.entries(LEGACY_DUPLICATE_ID_MAP)) {
    const oldId = Number(oldIdRaw);
    const targetId = Number(targetIdRaw);
    const duplicate = byId.get(oldId);
    if (!duplicate) continue;
    const primary = byId.get(targetId) || {};
    byId.set(targetId, mergeDuplicateUserAnswers(primary, duplicate, legacyNoFantasy));
  }
  return byId;
}

let items;
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  const localScoreSchema = localStorage.getItem(SCORE_SCHEMA_KEY);
  const localSupportsFantasy = localScoreSchema === SCORE_SCHEMA_VALUE || localScoreSchema === "fantasy5-real0to3-v2" || localScoreSchema === "fantasy5-v1";
  const localSupportsFavorite = localScoreSchema === SCORE_SCHEMA_VALUE;
  if (Array.isArray(saved)) {
    const byId = migrateDuplicateIdsInMap(new Map(saved.map(x => [Number(x.id), x])), !localSupportsFantasy);
    items = initialItems.map(base => normalizeItem(base, byId.get(Number(base.id)) || {}, {
      legacyFive:!localSupportsFantasy,
      legacyFour:!localSupportsFavorite
    }));
  } else {
    items = initialItems.map(base => normalizeItem(base, base));
  }
} catch(e) {
  items = initialItems.map(base => normalizeItem(base, base));
}

// v90 : index légers pour éviter les recherches linéaires répétées dans les 600 pratiques.
let itemsById = new Map();
let itemsByCategory = new Map();
let searchBaseById = new Map();

function compactUserState(item) {
  return {
    id:Number(item.id),
    wantSub:Number.isInteger(item.wantSub) ? item.wantSub : null,
    wantDom:Number.isInteger(item.wantDom) ? item.wantDom : null,
    priorSub:!!item.priorSub,
    priorDom:!!item.priorDom,
    doneTogether:!!item.doneTogether,
    afterSub:Number.isInteger(item.afterSub) ? item.afterSub : null,
    afterDom:Number.isInteger(item.afterDom) ? item.afterDom : null,
    notes:typeof item.notes === "string" ? item.notes : ""
  };
}

function compactLocalUserState(item) {
  const state = { id:Number(item.id) };
  if (Number.isInteger(item.wantSub)) state.wantSub = item.wantSub;
  if (Number.isInteger(item.wantDom)) state.wantDom = item.wantDom;
  if (item.priorSub) state.priorSub = true;
  if (item.priorDom) state.priorDom = true;
  if (item.doneTogether) state.doneTogether = true;
  if (Number.isInteger(item.afterSub)) state.afterSub = item.afterSub;
  if (Number.isInteger(item.afterDom)) state.afterDom = item.afterDom;
  if (typeof item.notes === "string" && item.notes) state.notes = item.notes;
  return state;
}

function serializeLocalItems() {
  return JSON.stringify(items.map(compactLocalUserState));
}

function rebuildItemIndexes() {
  itemsById = new Map();
  itemsByCategory = new Map();
  searchBaseById = new Map();

  for (const item of items) {
    const id = Number(item.id);
    itemsById.set(id, item);
    if (!itemsByCategory.has(item.category)) itemsByCategory.set(item.category, []);
    itemsByCategory.get(item.category).push(item);
    searchBaseById.set(id, [
      item.practice || "", item.explanation || "", item.category || "",
      item.practiceEn || "", item.explanationEn || "", CATEGORY_EN[item.category] || ""
    ].join(" ").toLowerCase());
  }
}

rebuildItemIndexes();

// v90 : localStorage ne conserve plus une copie du catalogue statique.
// Les anciennes sauvegardes complètes restent lisibles ; après chargement, elles sont compactées.
try {
  const compact = serializeLocalItems();
  if (localStorage.getItem(STORAGE_KEY) !== compact) localStorage.setItem(STORAGE_KEY, compact);
  localStorage.setItem(SCORE_SCHEMA_KEY, SCORE_SCHEMA_VALUE);
} catch (_) {}

let sessionOrder = [];
try {
  const savedSession = JSON.parse(localStorage.getItem(SESSION_KEY) || "[]");
  if (Array.isArray(savedSession)) {
    const validIds = new Set(initialItems.map(x => Number(x.id)));
    sessionOrder = [...new Set(savedSession.map(canonicalPracticeId).filter(id => validIds.has(id)))];
  }
} catch (_) {
  sessionOrder = [];
}
sanitizeSessionForLimits(true, false);

let currentRole = localStorage.getItem(ROLE_KEY) === "dom" ? "dom" : "sub";
let showOtherRoleColumns = localStorage.getItem(OTHER_ROLE_COLUMNS_KEY) !== "false";
let readOnly = localStorage.getItem(READONLY_KEY) === "true";

let experienceMode = (() => {
  const saved = localStorage.getItem(EXPERIENCE_MODE_KEY);
  return ["beginner","confirmed","advanced"].includes(saved) ? saved : "beginner";
})();

const allCatalogCategories = [...new Set(initialItems.map(x => x.category))];
function migrateCategoryNames(list) {
  const result = [];
  const migrations = CHECKLIST_VARIANT.categoryMigrations || {};
  for (const name of Array.isArray(list) ? list : []) {
    const mapped = migrations[name];
    if (Array.isArray(mapped)) result.push(...mapped);
    else if (typeof mapped === "string") result.push(mapped);
    else result.push(name);
  }
  return [...new Set(result)];
}
let collapsedCategories = (() => {
  const raw = localStorage.getItem(COLLAPSED_CATEGORIES_KEY);
  if (raw === null) {
    // Première ouverture de v67 : on présente d'abord les catégories,
    // plutôt qu'un mur de plusieurs centaines de lignes.
    return new Set(allCatalogCategories);
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return new Set(migrateCategoryNames(parsed).filter(x => allCatalogCategories.includes(x)));
  } catch (_) {}
  return new Set();
})();

function saveCollapsedCategories() {
  localStorage.setItem(COLLAPSED_CATEGORIES_KEY, JSON.stringify([...collapsedCategories]));
}

function experienceMaxLevel() {
  if (experienceMode === "beginner") return 1;
  if (experienceMode === "confirmed") return 2;
  return 3;
}

function experienceLabel(mode = experienceMode) {
  if (mode === "beginner") return t("beginner");
  if (mode === "confirmed") return t("confirmed");
  return t("advanced");
}

function levelShortLabel(level) {
  if (currentLang === "fr") return level === 1 ? "Déb." : level === 2 ? "Conf." : "Av.";
  return level === 1 ? "Beg." : level === 2 ? "Exp." : "Adv.";
}

const catalogCumulativeLevelCounts = (() => {
  const exact = {1:0, 2:0, 3:0};
  for (const item of initialItems) exact[Number(item.level || 3)]++;
  return {1:exact[1], 2:exact[1] + exact[2], 3:exact[1] + exact[2] + exact[3]};
})();

function renderExperienceModeUI() {
  if (!experienceSwitch) return;
  const modes = [
    ["beginner", 1],
    ["confirmed", 2],
    ["advanced", 3],
  ];
  experienceSwitch.querySelectorAll("[data-experience-mode]").forEach(btn => {
    const mode = btn.dataset.experienceMode;
    const tuple = modes.find(x => x[0] === mode);
    const max = tuple ? tuple[1] : 3;
    const count = catalogCumulativeLevelCounts[max] || items.length;
    btn.textContent = `${experienceLabel(mode)} · ${count}`;
    const active = experienceMode === mode;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });
  experienceSwitch.setAttribute(
    "aria-label",
    currentLang === "fr" ? "Niveau d’exploration" : "Exploration level"
  );
}

function hasExplicitFilters() {
  return !!(
    search.value.trim() ||
    category.value ||
    status.value ||
    minFilterScore.value !== "" ||
    riskFilter.value !== "" ||
    activeQuickFilter
  );
}

function isCategoryCollapsed(categoryName) {
  // Recherche et filtres ouvrent temporairement les résultats pour éviter
  // qu'une pratique trouvée reste cachée derrière une catégorie repliée.
  if (hasExplicitFilters()) return false;
  return collapsedCategories.has(categoryName);
}


document.body.dataset.role = currentRole;
document.body.dataset.readonly = readOnly ? "true" : "false";

const leftHead = document.getElementById("leftHead");
const rightHead = document.getElementById("rightHead");
const leftTable = document.getElementById("leftTable");
const rightTable = document.getElementById("rightTable");
const empty = document.getElementById("empty");
const search = document.getElementById("search");
const category = document.getElementById("category");
const status = document.getElementById("status");
const minFilterScore = document.getElementById("minFilterScore");
const riskFilter = document.getElementById("riskFilter");
const rightScroll = document.getElementById("rightScroll");
const rightHeadWrap = document.getElementById("rightHeadWrap");
const bottomScrollRow = document.getElementById("bottomScrollRow");
const bottomScrollLeft = document.getElementById("bottomScrollLeft");
const bottomHScroll = document.getElementById("bottomHScroll");
const bottomHScrollInner = document.getElementById("bottomHScrollInner");
const minRandomOne = document.getElementById("minRandomOne");
const minRandomOther = document.getElementById("minRandomOther");
const randomOnlyNew = document.getElementById("randomOnlyNew");
const randomIncludeNeutralNeutral = document.getElementById("randomIncludeNeutralNeutral");
const randomExcludeHighRisk = document.getElementById("randomExcludeHighRisk");
const randomNoRepeat = document.getElementById("randomNoRepeat");
const resetRandomCycleBtn = document.getElementById("resetRandomCycle");
const compatIndicator = document.getElementById("compatIndicator");
const compatDetails = document.getElementById("compatDetails");
const randomCandidateInfo = document.getElementById("randomCandidateInfo");
const exchangeInfo = document.getElementById("exchangeInfo");
const showSessionBtn = document.getElementById("showSession");
const openSessionModeBtn = document.getElementById("openSessionMode");
const resetSessionBtn = document.getElementById("resetSession");
const sessionMode = document.getElementById("sessionMode");
const closeSessionModeBtn = document.getElementById("closeSessionMode");
const sessionModeList = document.getElementById("sessionModeList");
const sessionSafetySummary = document.getElementById("sessionSafetySummary");
const sessionSummary = document.getElementById("sessionSummary");
const sessionList = document.getElementById("sessionList");
const randomBtn = document.getElementById("randomBtn");
const randomResult = document.getElementById("randomResult");
const categoryKey = document.getElementById("categoryKey");
const columnControls = document.getElementById("columnControls");
const quickFilters = document.getElementById("quickFilters");
const importJsonBtn = document.getElementById("importJson");
const importJsonFile = document.getElementById("importJsonFile");
const exportFullBtn = document.getElementById("exportFull");
const exportSubBtn = document.getElementById("exportSub");
const exportDomBtn = document.getElementById("exportDom");
const resetChecklistBtn = document.getElementById("resetChecklist");
const mobileCategoryBar = document.getElementById("mobileCategoryBar");
const mobileCategoryText = document.getElementById("mobileCategoryText");
const mobileCategoryDot = document.getElementById("mobileCategoryDot");
const rightPane = document.querySelector(".right-pane");
const statVisibleEl = document.getElementById("statVisible");
const statDoneEl = document.getElementById("statDone");
const statTogetherEl = document.getElementById("statTogether");
const statRatedEl = document.getElementById("statRated");
const statStarredEl = document.getElementById("statStarred");
const statModeEl = document.getElementById("statMode");
const MOBILE_MQ = window.matchMedia("(max-width:650px)");
const roleButtons = [...document.querySelectorAll("[data-role-choice]")];
const roleSwitchEl = document.querySelector(".role-switch");
if (roleSwitchEl) {
  for (const role of ROLE_VISUAL_ORDER) {
    const btn = roleButtons.find(candidate => candidate.dataset.roleChoice === role);
    if (btn) roleSwitchEl.appendChild(btn);
  }
}

let randomDrawHistory = (() => {
  try {
    const raw = JSON.parse(localStorage.getItem(RANDOM_HISTORY_KEY) || "[]");
    if (!Array.isArray(raw)) return new Set();
    const validIds = new Set(initialItems.map(x => Number(x.id)));
    return new Set(raw.map(canonicalPracticeId).filter(id => validIds.has(id)));
  } catch (_) {
    return new Set();
  }
})();

function getRandomPreferences() {
  return {
    minOne:minRandomOne.value,
    minOther:minRandomOther.value,
    includeNeutralNeutral:!!randomIncludeNeutralNeutral.checked,
    onlyNew:!!randomOnlyNew.checked,
    excludeHighRisk:!!randomExcludeHighRisk.checked,
    noRepeat:!!randomNoRepeat.checked
  };
}

function normalizeRandomThreshold(value, fallback) {
  return ["fantasy","neutral","want","favorite"].includes(value) ? value : fallback;
}

function applyRandomPreferences(prefs, persist=false) {
  const p = prefs && typeof prefs === "object" ? prefs : {};

  // v99 : migration des anciens réglages à seuil unique.
  if (p.minOne || p.minOther) {
    minRandomOne.value = normalizeRandomThreshold(p.minOne, "want");
    minRandomOther.value = normalizeRandomThreshold(p.minOther, "neutral");
    randomIncludeNeutralNeutral.checked = p.includeNeutralNeutral === true;
  } else if (p.onlyBothTest === true || Number(p.minScore) >= 4) {
    minRandomOne.value = "favorite";
    minRandomOther.value = "favorite";
    randomIncludeNeutralNeutral.checked = false;
  } else if (Number(p.minScore) === 2) {
    minRandomOne.value = "neutral";
    minRandomOther.value = "neutral";
    // L'ancien seuil « Neutre ou mieux des deux » incluait Neutre + Neutre.
    randomIncludeNeutralNeutral.checked = true;
  } else {
    // Nouveau comportement recommandé : une vraie envie d'un côté, au moins neutre de l'autre.
    minRandomOne.value = "want";
    minRandomOther.value = "neutral";
    randomIncludeNeutralNeutral.checked = false;
  }

  if (typeof p.onlyNew === "boolean") randomOnlyNew.checked = p.onlyNew;
  if (typeof p.excludeHighRisk === "boolean") randomExcludeHighRisk.checked = p.excludeHighRisk;
  if (typeof p.noRepeat === "boolean") randomNoRepeat.checked = p.noRepeat;
  if (persist) localStorage.setItem(RANDOM_PREFS_KEY, JSON.stringify(getRandomPreferences()));
}

function loadRandomPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(RANDOM_PREFS_KEY) || "null");
    if (saved && typeof saved === "object") applyRandomPreferences(saved, false);
  } catch (_) {}
}

function saveRandomPreferences() {
  localStorage.setItem(RANDOM_PREFS_KEY, JSON.stringify(getRandomPreferences()));
}

function saveRandomHistory() {
  localStorage.setItem(RANDOM_HISTORY_KEY, JSON.stringify([...randomDrawHistory]));
}

function clearRandomHistory(showMessage=true) {
  randomDrawHistory.clear();
  saveRandomHistory();
  updateCompatibilityIndicator();
  if (showMessage) randomResult.innerHTML = `<strong>${t("randomCycleReset")}</strong>`;
}

loadRandomPreferences();
const languageButtons = [...document.querySelectorAll("[data-lang-choice]")];
const openHelpBtn = document.getElementById("openHelp");
const helpModal = document.getElementById("helpModal");
const helpBody = document.getElementById("helpBody");
const closeHelpBtn = document.getElementById("closeHelp");
const helpTitle = document.getElementById("helpTitle");
const helpKicker = document.getElementById("helpKicker");
const adultGate = document.getElementById("adultGate");
const adultGateDialog = adultGate ? adultGate.querySelector(".adult-gate-dialog") : null;
const infoModal = document.getElementById("infoModal");
const infoModalBody = document.getElementById("infoModalBody");
const infoModalTitle = document.getElementById("infoModalTitle");
const closeInfoModalBtn = document.getElementById("closeInfoModal");
let lastInfoOpener = null;
const toggleOtherRole = document.getElementById("toggleOtherRole");
const toggleReadOnly = document.getElementById("toggleReadOnly");
const sessionToggleReadOnly = document.getElementById("sessionToggleReadOnly");
const experienceSwitch = document.getElementById("experienceSwitch");
const quickCollapseAllCategoriesBtn = document.getElementById("quickCollapseAllCategories");
const quickExpandAllCategoriesBtn = document.getElementById("quickExpandAllCategories");

let modifiedScopes = { sub:"", dom:"", common:"" };
try {
  const savedScopes = JSON.parse(localStorage.getItem(MODIFIED_SCOPES_KEY) || "{}");
  if (savedScopes && typeof savedScopes === "object") {
    for (const k of ["sub","dom","common"]) {
      if (typeof savedScopes[k] === "string") modifiedScopes[k] = savedScopes[k];
    }
  }
} catch (_) {}

let lastModifiedAt = localStorage.getItem(LAST_MODIFIED_KEY) || "";
let lastExchange = null;
try {
  lastExchange = JSON.parse(localStorage.getItem(LAST_EXCHANGE_KEY) || "null");
} catch (_) {
  lastExchange = null;
}

if (lastModifiedAt) {
  let changed = false;
  for (const scope of ["sub","dom","common"]) {
    if (!modifiedScopes[scope]) {
      modifiedScopes[scope] = lastModifiedAt;
      changed = true;
    }
  }
  if (changed) saveModifiedScopes();
}

let visibleColumns = loadVisibleColumns();
let activeQuickFilter = "";

const quickFilterDefs = [
  { key:"", labelKey:"all" },
  { key:"incompleteRole", labelKey:"incomplete", featuredIncomplete:true },
  { key:"session", labelKey:"session", featuredSession:true },
  ...visualRolePair(
    { key:"testSub", labelKey:"favoriteSubFilter" },
    { key:"testDom", labelKey:"favoriteDomFilter" }
  ),
  { key:"testBoth", labelKey:"commonChoices", featured:true },
  { key:"both4", labelKey:"bothAtLeast4" },
  { key:"both4todo", labelKey:"bothAtLeast4New" },
  { key:"together", labelKey:"statusTogether" },
  { key:"afterBoth4", labelKey:"afterBothAtLeast4" },
  { key:"afterMissing", labelKey:"afterMissing" },
];


function normalizeBackupType(payload) {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    if (["full","sub","dom"].includes(payload.backupType)) return payload.backupType;
  }
  // Toutes les anciennes sauvegardes sont considérées comme complètes.
  return "full";
}


function backupTypeLabel(type) {
  if (type === "sub") return roleLabel("sub");
  if (type === "dom") return roleLabel("dom");
  return currentLang === "fr" ? "Complète" : "Full";
}

function relevantLocalModifiedAt(type) {
  if (type === "sub") return modifiedScopes.sub || "";
  if (type === "dom") return modifiedScopes.dom || "";
  return lastModifiedAt || "";
}

function incomingRelevantModifiedAt(payload, type) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return "";
  if (type === "sub" || type === "dom") {
    if (typeof payload.scopeModifiedAt === "string") return payload.scopeModifiedAt;
    if (payload.modifiedAtByScope && typeof payload.modifiedAtByScope[type] === "string") {
      return payload.modifiedAtByScope[type];
    }
  }
  if (typeof payload.lastModifiedAt === "string") return payload.lastModifiedAt;
  if (typeof payload.exportedAt === "string") return payload.exportedAt;
  return "";
}


function roleBackupConfirmationText(type, itemCount, payload) {
  const label = backupTypeLabel(type);
  const when = incomingRelevantModifiedAt(payload, type);
  const local = relevantLocalModifiedAt(type);
  const incomingTime = when ? new Date(when).getTime() : NaN;
  const localTime = local ? new Date(local).getTime() : NaN;
  const older = Number.isFinite(incomingTime) && Number.isFinite(localTime) && incomingTime < localTime;
  const count = practiceCountText(itemCount);
  const safetyPreview = type === "full" ? {conflicts:[]} : previewSafetyMerge(payload);
  const subName = roleLabel("sub");
  const domName = roleLabel("dom");
  const roleName = type === "sub" ? subName : domName;
  const otherName = type === "sub" ? domName : subName;
  const favoriteIcon = type === "sub" ? "⭐" : "👑";

  let message = "";
  if (currentLang === "fr") {
    if (type === "full") {
      message = `Sauvegarde COMPLÈTE — ${count}.\n\nElle remplacera toutes les réponses, les notes communes, la sécurité, la séance, les préférences d'affichage et l'état du tirage aléatoire.`;
    } else {
      message =
        `Sauvegarde ${roleName.toLocaleUpperCase("fr-FR")} — ${count}.\n\n` +
        `Elle fusionnera : Préférence ${roleName} (dont ${favoriteIcon} Favori), Déjà fait avant — ${roleName}, Après expérience ${roleName}, Fait ensemble et les réglages de sécurité.\n\n` +
        `Les réponses ${otherName}, les notes communes et la séance ne seront pas modifiées.\n` +
        `« Fait ensemble » est additif : un Oui importé est conservé, un Non ne peut pas effacer un Oui local.\n` +
        `Sécurité : les valeurs vides n'effacent rien, les protections les plus strictes sont conservées et les hard limits/aftercare des deux appareils sont réunis.`;
    }
    if (safetyPreview.conflicts.length) {
      message += `\n\n⚠️ Conflit de sécurité : ${safetyPreview.conflicts.map(safetyConflictLabel).join(", ")}. La valeur locale sera conservée.`;
    }
    if (older) {
      message += `\n\n⚠️ Ce fichier semble plus ancien pour ${label} :\nfichier ${formatDateTime(when)} · appareil ${formatDateTime(local)}.`;
    }
    return message + "\n\nContinuer ?";
  }

  if (type === "full") {
    message = `FULL BACKUP — ${count}.\n\nIt will replace all answers, shared notes, safety settings, session, display preferences and random-draw state.`;
  } else {
    message =
      `${roleName.toLocaleUpperCase("en-GB")} BACKUP — ${count}.\n\n` +
      `It will merge: ${roleName} preference (including ${favoriteIcon} Favorite), Done before — ${roleName}, ${roleName} After experience, Done together and safety settings.\n\n` +
      `${otherName} answers, shared notes and the session will not be changed.\n` +
      `“Done together” is additive: an imported Yes is kept, while an imported No cannot erase a local Yes.\n` +
      `Safety: empty values erase nothing, the most protective settings are kept, and hard limits/aftercare from both devices are preserved.`;
  }
  if (safetyPreview.conflicts.length) {
    message += `\n\n⚠️ Safety conflict: ${safetyPreview.conflicts.map(safetyConflictLabel).join(", ")}. The local value will be kept.`;
  }
  if (older) {
    message += `\n\n⚠️ This file appears older for ${label}:\nfile ${formatDateTime(when)} · device ${formatDateTime(local)}.`;
  }
  return message + "\n\nContinue?";
}

function formatDateTime(iso) {
  if (!iso) return t("dateUnknown");
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return t("dateUnknown");
  const locale = currentLang === "fr" ? "fr-FR" : "en-GB";
  try {
    return d.toLocaleString(locale, {
      day:"2-digit", month:"2-digit", year:"numeric",
      hour:"2-digit", minute:"2-digit"
    });
  } catch (_) {
    return d.toLocaleString(locale);
  }
}


function renderExchangeInfo() {
  if (!exchangeInfo) return;
  if (!lastExchange || typeof lastExchange !== "object") {
    exchangeInfo.textContent = t("lastExchangeNone");
    return;
  }
  const action = lastExchange.type === "import" ? "Import" : "Export";
  const backupLabel = backupTypeLabel(lastExchange.backupType || (lastExchange.role || "full"));
  const version = lastExchange.appVersion || t("versionUnknown");
  const modified = formatDateTime(lastExchange.lastModifiedAt || lastExchange.exportedAt);
  exchangeInfo.textContent = `${action} · ${backupLabel} · ${t("modified")} ${modified} · ${version}`;
}

function setLastExchange(info) {
  lastExchange = info;
  localStorage.setItem(LAST_EXCHANGE_KEY, JSON.stringify(info));
  renderExchangeInfo();
}


function roleLabel(role) {
  return role === "dom" ? t("roleDom") : t("roleSub");
}

function roleColorName(role) {
  const femaleRole = CHECKLIST_VARIANT.id === "maitre-soumise" ? "sub" : "dom";
  const isFemale = role === femaleRole;
  if (currentLang === "fr") return isFemale ? "prune" : "bleu";
  return isFemale ? "plum" : "blue";
}

function canEditRole(owner) {
  if (readOnly) return false;
  return !owner || owner === currentRole;
}

function canEditShared() {
  return !readOnly;
}

function otherRole() {
  return currentRole === "sub" ? "dom" : "sub";
}


function applyReadOnlyToSafety() {
  document.querySelectorAll(".safety input,.safety select,.safety textarea").forEach(el => {
    el.disabled = readOnly;
  });
  importJsonBtn.disabled = readOnly;
  importJsonBtn.title = readOnly ? t("disableRestore") : "";
  resetChecklistBtn.disabled = readOnly;
  resetChecklistBtn.title = readOnly ? t("disableReset") : "";
  resetSessionBtn.disabled = readOnly || sessionOrder.length === 0;
  resetSessionBtn.title = readOnly ? t("disableSession") : "";
}


function renderRoleUI() {
  document.body.dataset.role = currentRole;
  document.body.dataset.readonly = readOnly ? "true" : "false";

  for (const btn of roleButtons) {
    const active = btn.dataset.roleChoice === currentRole;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
    btn.textContent = `● ${roleLabel(btn.dataset.roleChoice)}`;
  }

  const other = roleLabel(otherRole());
  toggleOtherRole.textContent = `👁 ${showOtherRoleColumns ? t("hide") : t("show")} ${other}`;
  toggleOtherRole.classList.toggle("active", !showOtherRoleColumns);
  toggleOtherRole.setAttribute("aria-pressed", showOtherRoleColumns ? "false" : "true");

  const readOnlyText = `🔒 ${t("readOnly")} : ${readOnly ? "ON" : "OFF"}`;
  toggleReadOnly.textContent = readOnlyText;
  toggleReadOnly.classList.toggle("active", readOnly);
  toggleReadOnly.setAttribute("aria-pressed", readOnly ? "true" : "false");
  if (sessionToggleReadOnly) {
    sessionToggleReadOnly.textContent = readOnlyText;
    sessionToggleReadOnly.classList.toggle("active", readOnly);
    sessionToggleReadOnly.setAttribute("aria-pressed", readOnly ? "true" : "false");
  }

  if (statModeEl) statModeEl.textContent = `${t("mode")} : ${roleLabel(currentRole)}${readOnly ? ` · ${t("readOnlySuffix")}` : ""}`;

  applyReadOnlyToSafety();
  renderSessionPanel();
}

function setRole(role) {
  if (!["sub","dom"].includes(role) || role === currentRole) return;
  currentRole = role;
  localStorage.setItem(ROLE_KEY, currentRole);
  renderRoleUI();
  renderColumnControls();
  renderQuickFilters();
  render();
}

for (const btn of roleButtons) {
  btn.addEventListener("click", () => setRole(btn.dataset.roleChoice));
}

for (const btn of languageButtons) {
  btn.addEventListener("click", () => setLanguage(btn.dataset.langChoice, true));
}

openHelpBtn.addEventListener("click", openHelpModal);
closeHelpBtn.addEventListener("click", closeHelpModal);


if (document.documentElement.classList.contains("adult-gate-required")) {
  setAppBackgroundInert(true);
  requestAnimationFrame(() => {
    const langClass = currentLang === "fr" ? ".adult-lang-fr" : ".adult-lang-en";
    const btn = adultGate && adultGate.querySelector(`${langClass} [data-adult-accept]`);
    if (btn) btn.focus();
  });
}

document.querySelectorAll("[data-adult-accept]").forEach(btn => btn.addEventListener("click", acceptAdultGate));
document.querySelectorAll("[data-adult-exit]").forEach(btn => btn.addEventListener("click", leaveAdultGate));

document.querySelectorAll("[data-info-open]").forEach(btn => {
  btn.addEventListener("click", () => openInfoModal(btn.dataset.infoOpen || "adult", btn));
});
if (closeInfoModalBtn) closeInfoModalBtn.addEventListener("click", closeInfoModal);
if (infoModal) {
  infoModal.addEventListener("click", e => {
    if (e.target && e.target.dataset && e.target.dataset.infoClose === "true") closeInfoModal();
  });
}

document.addEventListener("keydown", e => {
  if (document.documentElement.classList.contains("adult-gate-required")) {
    if (e.key === "Escape") { e.preventDefault(); return; }
    focusTrapIn(adultGateDialog, e);
    return;
  }
  if (infoModal && !infoModal.hidden) {
    if (e.key === "Escape") { e.preventDefault(); closeInfoModal(); return; }
    focusTrapIn(infoModal.querySelector(".info-modal-dialog"), e);
  }
});

helpModal.addEventListener("click", (e) => {
  if (e.target.closest("[data-help-close='true']")) {
    closeHelpModal();
    return;
  }

  const jump = e.target.closest("[data-help-target]");
  if (jump) {
    const target = document.getElementById(jump.dataset.helpTarget);
    if (target) target.scrollIntoView({behavior:"smooth", block:"start"});
  }
});

document.addEventListener("keydown", (e) => {
  if (helpModal && !helpModal.hidden) {
    if (e.key === "Escape") {
      e.preventDefault();
      closeHelpModal();
      return;
    }
    focusTrapIn(helpModal.querySelector(".help-dialog"), e);
  }
});

toggleOtherRole.addEventListener("click", () => {
  showOtherRoleColumns = !showOtherRoleColumns;
  localStorage.setItem(OTHER_ROLE_COLUMNS_KEY, String(showOtherRoleColumns));
  renderRoleUI();
  renderColumnControls();
  render();
});

function toggleReadOnlyMode() {
  readOnly = !readOnly;
  localStorage.setItem(READONLY_KEY, String(readOnly));
  renderRoleUI();
  render();
  if (sessionMode && !sessionMode.hidden) renderSessionMode();
}

toggleReadOnly.addEventListener("click", toggleReadOnlyMode);
if (sessionToggleReadOnly) sessionToggleReadOnly.addEventListener("click", toggleReadOnlyMode);

function defaultColumnVisibility(col) {
  const mobile = MOBILE_MQ.matches;
  if (mobile && Object.prototype.hasOwnProperty.call(col, "defaultVisibleMobile")) {
    return col.defaultVisibleMobile !== false;
  }
  return col.defaultVisible !== false;
}

function loadVisibleColumns() {
  try {
    const currentRaw = localStorage.getItem(COLUMN_PREFS_KEY);
    const isMigration = !currentRaw;
    const saved = JSON.parse(
      currentRaw ||
      localStorage.getItem(LEGACY_COLUMN_PREFS_KEY) ||
      "{}"
    );

    const result = {};
    for (const col of [...fixedColumns, ...scrollColumns]) {
      let hasSaved = Object.prototype.hasOwnProperty.call(saved, col.key);
      let savedValue = hasSaved ? saved[col.key] : undefined;
      if (col.key === "priorSub" && !hasSaved && Object.prototype.hasOwnProperty.call(saved, "done")) {
        hasSaved = true;
        savedValue = saved.done;
      }
      result[col.key] = hasSaved ? savedValue !== false : defaultColumnVisibility(col);
    }

    // v46 : la colonne Notes revient dans l'affichage par défaut.
    // Lors de la migration depuis v4, on conserve toutes les autres préférences,
    // mais on rend Notes visible une fois. L'utilisateur peut ensuite la masquer.
    if (isMigration) {
      result.notes = true;
      localStorage.setItem(COLUMN_PREFS_KEY, JSON.stringify(result));
    }

    return result;
  } catch(e) {
    const result = Object.fromEntries(
      [...fixedColumns, ...scrollColumns].map(col => [col.key, defaultColumnVisibility(col)])
    );
    result.notes = true;
    return result;
  }
}
function saveVisibleColumns() {
  localStorage.setItem(COLUMN_PREFS_KEY, JSON.stringify(visibleColumns));
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
const categoryTextColorCache = new Map();
function categoryTextColor(hex) {
  const h = String(hex || "#E7E7E7").replace("#", "");
  if (categoryTextColorCache.has(h)) return categoryTextColorCache.get(h);
  const rgb = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
  const linear = rgb.map(c => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const bg = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  const whiteContrast = 1.05 / (bg + 0.05);
  const darkContrast = (bg + 0.05) / 0.05;
  const color = darkContrast >= whiteContrast ? "#000000" : "#FFFFFF";
  categoryTextColorCache.set(h, color);
  return color;
}
function isInSession(itemOrId) {
  const id = typeof itemOrId === "object" ? Number(itemOrId.id) : Number(itemOrId);
  return sessionOrder.includes(id);
}

function saveSessionOrder(touchModified = true) {
  if (touchModified) markModified("common");
  localStorage.setItem(SESSION_KEY, JSON.stringify(sessionOrder));
}

function sanitizeSessionForLimits(persist = true, touchModified = false) {
  const before = sessionOrder.length;
  sessionOrder = sessionOrder.filter(id => {
    const item = itemsById.get(Number(id));
    return item && !sessionBlockReason(item);
  });
  const changed = sessionOrder.length !== before;
  if (changed && persist) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionOrder));
    if (touchModified) markModified("common");
  }
  return changed;
}


function renderSessionPanel() {
  if (!sessionList || !sessionSummary) return;

  const selected = sessionOrder
    .map(id => itemsById.get(Number(id)))
    .filter(Boolean);

  const fantasyCount = selected.filter(hasFantasyOnly).length;
  sessionSummary.textContent = selected.length
    ? (currentLang === "fr"
      ? `${practiceCountText(selected.length)} dans la séance${fantasyCount ? ` · ${fantasyCount} fantasme${fantasyCount > 1 ? "s" : ""}` : ""}. Utilisez ↑ et ↓ pour définir l’ordre.`
      : `${practiceCountText(selected.length)} in the session${fantasyCount ? ` · ${fantasyCount} fantas${fantasyCount > 1 ? "ies" : "y"}` : ""}. Use ↑ and ↓ to set the order.`)
    : t("sessionNone");

  showSessionBtn.disabled = selected.length === 0;
  openSessionModeBtn.disabled = selected.length === 0;
  resetSessionBtn.disabled = readOnly || selected.length === 0;

  sessionList.innerHTML = selected.map((item, index) => {
    const fantasy = hasFantasyOnly(item);
    return `
    <div class="session-item${fantasy ? " is-fantasy" : ""}" data-session-id="${item.id}">
      <span class="session-index">${index + 1}</span>
      <span class="session-name" title="${esc(localizedPractice(item))}">${esc(localizedPractice(item))} ${riskBadge(item)} ${fantasy ? `<span class="fantasy-session-badge">💭 ${esc(t("fantasyOnlyShort"))}</span>` : ""}</span>
      <button class="session-move" data-session-action="up" data-id="${item.id}" type="button"
        ${readOnly || index === 0 ? "disabled" : ""} title="${t("moveUp")}">↑</button>
      <button class="session-move" data-session-action="down" data-id="${item.id}" type="button"
        ${readOnly || index === selected.length - 1 ? "disabled" : ""} title="${t("moveDown")}">↓</button>
      <button class="session-remove" data-session-action="remove" data-id="${item.id}" type="button"
        ${readOnly ? "disabled" : ""} title="${t("removeSession")}">×</button>
    </div>
  `;
  }).join("");

  if (!sessionMode.hidden) renderSessionMode();
}

function renderSessionSafetySummary() {
  const safety = getSafety();
  const entries = [];
  const push = (label, value) => {
    const clean = typeof value === "string" ? value.trim() : value;
    if (clean) entries.push(`<div class="session-safety-item"><strong>${esc(label)} :</strong> ${esc(clean)}</div>`);
  };

  push(t("slowWordLabel"), safety.slowWord);
  push(t("safeWordLabel"), safety.safeWord);
  push(t("slowSignalLabel"), safety.slowSignal);
  push(t("stopSignalLabel"), safety.stopSignal);
  const marksEl = document.getElementById("marks");
  const mediaEl = document.getElementById("media");
  push(t("marksLabel"), safety.marks && marksEl?.selectedOptions?.[0] ? marksEl.selectedOptions[0].textContent : safety.marks);
  push(t("hardLimitsLabel"), safety.hardLimits);
  push(t("aftercareLabel"), safety.aftercare);
  push(t("mediaLabel"), safety.media && mediaEl?.selectedOptions?.[0] ? mediaEl.selectedOptions[0].textContent : safety.media);
  if (safety.stopImmediate) push(t("stopImmediate"), currentLang === "fr" ? "Oui" : "Yes");
  if (safety.noIntoxication) push(t("noIntoxication"), currentLang === "fr" ? "Oui" : "Yes");
  if (safety.nextDayDebrief) push(t("nextDayDebrief"), currentLang === "fr" ? "Oui" : "Yes");

  sessionSafetySummary.innerHTML = entries.length
    ? `<div class="session-safety-grid">${entries.join("")}</div>`
    : `<div class="session-safety-item">${esc(t("sessionSafetyEmpty"))}</div>`;
}

function renderSessionMode() {
  if (!sessionModeList || !sessionSafetySummary) return;
  renderSessionSafetySummary();
  const selected = sessionOrder
    .map(id => itemsById.get(Number(id)))
    .filter(Boolean);

  if (!selected.length) {
    sessionModeList.innerHTML = `<div class="empty">${esc(t("sessionModeEmpty"))}</div>`;
    return;
  }

  sessionModeList.innerHTML = selected.map((item, index) => {
    const color = categoryColors[item.category] || "#9aa0a6";
    const s = effectiveRoleScore(item, "sub");
    const d = effectiveRoleScore(item, "dom");
    const compat = Number.isInteger(s) && Number.isInteger(d) && meetsRealMinimum(s, 1) && meetsRealMinimum(d, 1) ? Math.min(s,d) : null;
    const fantasy = hasFantasyOnly(item);
    const compatText = fantasy ? "💭" : (compat === null ? "—" : scoreLabel(compat, true));
    const compatStyle = fantasy ? "background:#dce5f5;color:#314a70" : (compat === null ? "" : `background:${scoreColors[compat]}`);
    const limit = hasLimit(item) ? `<span class="session-mode-limit">🚫</span>` : "";
    return `<article class="session-mode-card${fantasy ? " fantasy-only" : ""}" data-session-mode-id="${item.id}" style="--category-color:${color}">
      <div class="session-mode-card-head">
        <span class="session-mode-index">${index + 1}</span>
        <div class="session-mode-title-wrap">
          <div class="session-mode-category">${esc(localizedCategory(item.category))}</div>
          <div class="session-mode-practice">${esc(localizedPractice(item))} ${riskBadge(item)} ${limit}</div>
        </div>
        <div class="session-mode-meta">
          <span class="session-mode-compat" style="${compatStyle}" title="${esc(t("sessionCompatibilityLabel"))}">${compatText}</span>
        </div>
      </div>
      ${fantasy ? `<div class="session-mode-fantasy-banner">${esc(t("sessionFantasyBanner"))}</div>` : ""}
      <div class="session-mode-expl">${esc(localizedExplanation(item))}</div>
      <div class="session-mode-fields">
        <label class="session-mode-note-label">${esc(t("sessionNotesLabel"))}
          <textarea class="session-mode-note" data-session-mode-notes="${item.id}" ${readOnly ? "disabled" : ""} placeholder="${esc(t("commonNotePlaceholder"))}">${esc(item.notes || "")}</textarea>
        </label>
        <label class="session-mode-together" ${fantasy ? `title="${esc(t("fantasyTogetherDisabled"))}"` : ""}>
          <input type="checkbox" data-session-mode-together="${item.id}" ${item.doneTogether ? "checked" : ""} ${readOnly || fantasy ? "disabled" : ""}>
          <span>${esc(t("sessionDoneTogetherLabel"))}</span>
        </label>
      </div>
    </article>`;
  }).join("");
}

let sessionModePreviousFocus = null;

function openSessionMode() {
  if (!sessionOrder.length) return;
  sessionModePreviousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  renderSessionMode();
  sessionMode.hidden = false;
  sessionMode.setAttribute("aria-hidden", "false");
  document.body.classList.add("session-mode-open");
  setAppBackgroundInert(true);
  closeSessionModeBtn.focus();
}

function closeSessionMode() {
  sessionMode.hidden = true;
  sessionMode.setAttribute("aria-hidden", "true");
  document.body.classList.remove("session-mode-open");
  setAppBackgroundInert(false);
  render();
  if (sessionModePreviousFocus && document.contains(sessionModePreviousFocus)) {
    sessionModePreviousFocus.focus();
  }
  sessionModePreviousFocus = null;
}

function toggleSessionItem(id) {
  id = Number(id);
  const pos = sessionOrder.indexOf(id);
  if (pos >= 0) sessionOrder.splice(pos, 1);
  else sessionOrder.push(id);
  saveSessionOrder();
  renderSessionPanel();
}

function moveSessionItem(id, direction) {
  id = Number(id);
  const index = sessionOrder.indexOf(id);
  if (index < 0) return;
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= sessionOrder.length) return;
  [sessionOrder[index], sessionOrder[target]] = [sessionOrder[target], sessionOrder[index]];
  saveSessionOrder();
  renderSessionPanel();
}

function saveModifiedScopes() {
  localStorage.setItem(MODIFIED_SCOPES_KEY, JSON.stringify(modifiedScopes));
}

function markModified(scopes = null) {
  const now = new Date().toISOString();
  lastModifiedAt = now;
  localStorage.setItem(LAST_MODIFIED_KEY, lastModifiedAt);

  const list = Array.isArray(scopes) ? scopes : (scopes ? [scopes] : []);
  for (const scope of list) {
    if (["sub","dom","common"].includes(scope)) modifiedScopes[scope] = now;
  }
  if (list.length) saveModifiedScopes();
}

function save(touchModified = true, scopes = null) {
  if (touchModified) markModified(scopes);
  localStorage.setItem(STORAGE_KEY, serializeLocalItems());
  localStorage.setItem(SCORE_SCHEMA_KEY, SCORE_SCHEMA_VALUE);
}

let saveTimer = null;
function scheduleSave(scopes = null) {
  clearTimeout(saveTimer);
  markModified(scopes);
  saveTimer = setTimeout(() => save(false), 90);
}

function hasActiveFiltering() {
  return !!(
    search.value.trim() ||
    category.value ||
    status.value ||
    minFilterScore.value !== "" ||
    activeQuickFilter
  );
}

function syncSingleRowHeight(id) {
  const leftRow = leftTable.querySelector(`[data-row-id="${id}"]`);
  const rightRow = rightTable.querySelector(`[data-row-id="${id}"]`);
  if (!leftRow || !rightRow) return;

  leftRow.style.height = "";
  rightRow.style.height = "";
  const h = Math.max(leftRow.offsetHeight, rightRow.offsetHeight);
  leftRow.style.height = h + "px";
  rightRow.style.height = h + "px";
}

function refreshItemRow(item) {
  // Si un filtre actif peut faire entrer/sortir la ligne, on garde le render complet.
  if (hasActiveFiltering()) {
    render();
    return;
  }

  const leftRow = leftTable.querySelector(`[data-row-id="${item.id}"]`);
  const rightRow = rightTable.querySelector(`[data-row-id="${item.id}"]`);

  if (!leftRow || !rightRow) {
    render();
    return;
  }

  const visibleFixed = getVisibleFixedColumns();
  const visibleScroll = getVisibleScrollColumns();
  leftRow.classList.toggle("row-random-picked", !!item._randomPicked);
  leftRow.innerHTML = visibleFixed.map(col => renderLeftCell(item, col.key)).join("");
  rightRow.innerHTML = visibleScroll.map(col => renderRightCell(item, col.key)).join("");

  updateStats();
  requestAnimationFrame(() => syncSingleRowHeight(item.id));
}
function effectiveRoleScore(item, role) {
  if (role === "sub") {
    if (hasRoleExperience(item, "sub") && Number.isInteger(item.afterSub)) return item.afterSub;
    return Number.isInteger(item.wantSub) ? item.wantSub : null;
  }
  if (hasRoleExperience(item, "dom") && Number.isInteger(item.afterDom)) return item.afterDom;
  return Number.isInteger(item.wantDom) ? item.wantDom : null;
}

function compatibilityFromScores(s, d) {
  // Une limite reste prioritaire. 💭 Fantasme est orthogonal à la disponibilité réelle.
  if (!Number.isInteger(s) || !Number.isInteger(d)) return null;
  if (s === 0 || d === 0) return 0;
  if (s === FANTASY_SCORE || d === FANTASY_SCORE) return null;
  return Math.min(s, d);
}

const scoreUiCache = new Map();
function cachedScoreUi(value, role=null) {
  const key = `${currentLang}|${role || "-"}|${value}`;
  if (scoreUiCache.has(key)) return scoreUiCache.get(key);
  const ui = {
    title:esc(scoreChoiceTitle(value, role)),
    label:scoreButtonLabel(value, role)
  };
  scoreUiCache.set(key, ui);
  return ui;
}

function scoreButtons(item, field, enabled=true, owner=null) {
  const editable = enabled && canEditRole(owner);
  const unknownSelected = !Number.isInteger(item[field]);
  const unknownText = esc(t("unknown"));
  const unknown = `<button class="score-btn unknown-score${unknownSelected ? " selected" : ""}" data-action="${field}" data-id="${item.id}" data-score="unknown" type="button" ${editable?'':'disabled'} aria-label="${unknownText}" aria-pressed="${unknownSelected ? "true" : "false"}" title="${unknownText}">?</button>`;
  const scores = SCORE_BUTTON_ORDER.map(n => {
    const isLimit = n === 0;
    const selected = item[field] === n;
    const ui = cachedScoreUi(n, owner);
    return `<button class="score-btn semantic-score-btn${isLimit ? ' limit-score' : ''}${selected?' selected':''}" data-action="${field}" data-id="${item.id}" data-score="${n}" type="button" ${editable?'':'disabled'} aria-label="${ui.title}" aria-pressed="${selected ? "true" : "false"}" title="${ui.title}">${ui.label}</button>`;
  }).join("");
  return unknown + scores;
}

function roleCellClass(owner) {
  if (!owner) return "";
  return ` role-owned owner-${owner} ${owner === currentRole ? "active-role-cell" : "locked-role-cell"}`;
}


let lastHeadsSignature = "";
function renderHeads() {
  const signature = [
    currentLang, currentRole, showOtherRoleColumns,
    MOBILE_MQ.matches ? "m" : "d",
    ...Object.entries(visibleColumns).map(([k,v]) => `${k}:${v ? 1 : 0}`)
  ].join("|");
  if (signature === lastHeadsSignature) return;
  lastHeadsSignature = signature;

  const renderFixedHead = col =>
    `<div class="head-cell" data-col="${col.key}">${columnLabel(col)}</div>`;

  leftHead.innerHTML = getVisibleFixedColumns().map(renderFixedHead).join("");

  const visibleScroll = getVisibleScrollColumns();
  const visibleKeys = new Set(visibleScroll.map(col => col.key));
  const groupDefs = [
    { keys:["explanation"], labelKey:"columnExplanation" },
    { keys:visualRolePair("wantSub","wantDom"), labelKey:"columnWantSub", rolePair:true },
    { keys:visualRolePair("priorSub","priorDom"), labelKey:"columnPriorSub", rolePair:true },
    { keys:visualRolePair("afterSub","afterDom"), labelKey:"columnAfterSub", rolePair:true },
    { keys:["doneTogether"], labelKey:"columnTogether" },
    { keys:["notes"], labelKey:"columnNotes" },
  ];

  rightHead.innerHTML = groupDefs.map(group => {
    const cols = group.keys
      .map(key => scrollColumns.find(col => col.key === key))
      .filter(col => col && visibleKeys.has(col.key));
    if (!cols.length) return "";

    const owners = cols.map(col => col.owner).filter(Boolean);
    let pairClass = "";
    if (group.rolePair) {
      if (owners.includes("sub") && owners.includes("dom")) pairClass = " role-pair-head pair-both";
      else if (owners.includes("sub")) pairClass = " role-pair-head pair-sub";
      else if (owners.includes("dom")) pairClass = " role-pair-head pair-dom";
    }

    const label = t(group.labelKey);
    const plainLabel = label.replace(/<br\s*\/?>/gi, " ");
    let roleDetail = "";
    if (owners.includes("sub") && owners.includes("dom")) {
      roleDetail = ` — ${ROLE_VISUAL_ORDER.map(role => `${roleColorName(role)} : ${roleLabel(role)}`).join(" · ")}`;
    } else if (owners.length === 1) {
      roleDetail = ` — ${roleLabel(owners[0])}`;
    }
    const accessibleLabel = `${plainLabel}${roleDetail}`;
    return `<div class="head-cell grouped-head${pairClass}" style="grid-column:span ${cols.length}" aria-label="${esc(accessibleLabel)}" title="${esc(accessibleLabel)}">${label}</div>`;
  }).join("");
}


function renderLeftCell(item, key) {
  if (key === "num") return `<div class="cell num" data-col="num">${item.displayIndex ?? item.id}</div>`;
  if (key === "category") {
    const catColor = categoryColors[item.category] || "#E7E7E7";
    return `<div class="cell cat" data-col="category"><span class="cat-pill" style="background:${catColor};color:${categoryTextColor(catColor)}">${esc(localizedCategory(item.category))}</span></div>`;
  }
  if (key === "practice") {
    const s = effectiveRoleScore(item, "sub");
    const d = effectiveRoleScore(item, "dom");
    const eff = compatibilityFromScores(s, d);
    // Une limite 🚫 reste prioritaire. Sinon, dès qu’un rôle choisit 💭 Fantasme,
    // la pratique prend visuellement la couleur Fantasme, même si l’autre rôle
    // n’a pas encore répondu ou a une préférence réelle plus élevée.
    const fantasyVisual = s !== 0 && d !== 0 && (s === FANTASY_SCORE || d === FANTASY_SCORE);
    const style = fantasyVisual
      ? `background:${scoreColors[FANTASY_SCORE]}`
      : (eff === null ? "" : `background:${scoreColors[eff]}`);
    const bothRated = Number.isInteger(s) && Number.isInteger(d);
    const fantasyBlocked = bothRated && s !== 0 && d !== 0 && (s === FANTASY_SCORE || d === FANTASY_SCORE);
    const compatValue = bothRated && !fantasyBlocked ? Math.min(s,d) : null;
    const compat = fantasyBlocked
      ? `<span class="compatibility-badge fantasy-compat" title="${esc(currentLang === "fr" ? "Fantasme uniquement : non proposé comme pratique réelle" : "Fantasy only: not proposed as a real-life practice")}">💭</span>`
      : (compatValue !== null
        ? `<span class="compatibility-badge" title="${compatValue === 0 ? esc(t("limitTitle")) : (currentLang === "fr" ? "Score commun minimal" : "Minimum shared score")}">${scoreLabel(compatValue, true)}</span>`
        : "");
    const selected = isInSession(item);
    const pin = `<button class="session-pin-btn${selected ? " selected" : ""}" data-action="sessionToggle" data-id="${item.id}" type="button" ${readOnly ? "disabled" : ""} title="${selected ? t("removeSession") : t("addSession")}">📌</button>`;
    return `<div class="cell practice" data-col="practice" style="${style}"><span class="practice-label">${esc(localizedPractice(item))}<span class="level-badge level-${item.level || 3}" title="${experienceLabel(item.level === 1 ? "beginner" : item.level === 2 ? "confirmed" : "advanced")}">${levelShortLabel(item.level || 3)}</span>${riskBadge(item)}${compat}</span>${pin}</div>`;
  }
  return "";
}


function renderRightCell(item, key) {
  if (key === "explanation") return `<div class="cell expl" data-col="explanation">${esc(localizedExplanation(item))}</div>`;

  if (key === "wantSub") {
    const style = Number.isInteger(item.wantSub) ? `background:${scoreColors[item.wantSub]}` : "";
    return `<div class="cell${roleCellClass("sub")}" data-col="wantSub" style="${style}"><div class="score-wrap">${scoreButtons(item,"wantSub",true,"sub")}</div></div>`;
  }
  if (key === "wantDom") {
    const style = Number.isInteger(item.wantDom) ? `background:${scoreColors[item.wantDom]}` : "";
    return `<div class="cell${roleCellClass("dom")}" data-col="wantDom" style="${style}"><div class="score-wrap">${scoreButtons(item,"wantDom",true,"dom")}</div></div>`;
  }
  if (key === "priorSub") {
    const editable = canEditRole("sub");
    return `<div class="cell done-cell${roleCellClass("sub")}" data-col="priorSub"><button class="done${item.priorSub?' checked':''}" data-action="priorSub" data-id="${item.id}" type="button" ${editable?'':'disabled'} title="${esc(t("priorSubTitle"))}">${item.priorSub?'✓':'□'}</button></div>`;
  }
  if (key === "priorDom") {
    const editable = canEditRole("dom");
    return `<div class="cell done-cell${roleCellClass("dom")}" data-col="priorDom"><button class="done${item.priorDom?' checked':''}" data-action="priorDom" data-id="${item.id}" type="button" ${editable?'':'disabled'} title="${esc(t("priorDomTitle"))}">${item.priorDom?'✓':'□'}</button></div>`;
  }
  if (key === "doneTogether") {
    const editable = canEditShared();
    return `<div class="cell done-cell" data-col="doneTogether"><button class="done${item.doneTogether?' checked':''}" data-action="doneTogether" data-id="${item.id}" type="button" ${editable?'':'disabled'} title="${t("doneTogetherTitle")}">${item.doneTogether?'✓':'□'}</button></div>`;
  }
  if (key === "afterSub") {
    const ready = hasRoleExperience(item, "sub");
    const style = Number.isInteger(item.afterSub) ? `background:${scoreColors[item.afterSub]}` : (!ready ? "background:#E7E6E6" : "");
    return `<div class="cell after ${ready?'':'disabled'}${roleCellClass("sub")}" data-col="afterSub" style="${style}"><div class="score-wrap">${scoreButtons(item,"afterSub",ready,"sub")}</div></div>`;
  }
  if (key === "afterDom") {
    const ready = hasRoleExperience(item, "dom");
    const style = Number.isInteger(item.afterDom) ? `background:${scoreColors[item.afterDom]}` : (!ready ? "background:#E7E6E6" : "");
    return `<div class="cell after ${ready?'':'disabled'}${roleCellClass("dom")}" data-col="afterDom" style="${style}"><div class="score-wrap">${scoreButtons(item,"afterDom",ready,"dom")}</div></div>`;
  }
  if (key === "notes") {
    return `<div class="cell notes-cell" data-col="notes"><textarea class="note-input" data-action="notes" data-id="${item.id}" placeholder="${t("commonNotePlaceholder")}" ${readOnly?'readonly':''}>${esc(item.notes)}</textarea></div>`;
  }
  return "";
}


function matches(item, q = "") {
  if (activeQuickFilter !== "session" && Number(item.level || 3) > experienceMaxLevel()) return false;

  if (q) {
    const staticText = searchBaseById.get(Number(item.id)) || "";
    const notesText = typeof item.notes === "string" ? item.notes.toLowerCase() : "";
    if (!staticText.includes(q) && !notesText.includes(q)) return false;
  }

  if (category.value && item.category !== category.value) return false;
  if (riskFilter.value && item.risk !== riskFilter.value) return false;
  if (status.value === "priorSub" && !item.priorSub) return false;
  if (status.value === "priorDom" && !item.priorDom) return false;
  if (status.value === "together" && !item.doneTogether) return false;
  if (status.value === "notTogether" && item.doneTogether) return false;
  if (status.value === "bothRated" && !(Number.isInteger(item.wantSub) && Number.isInteger(item.wantDom))) return false;
  if (status.value === "bothFantasy") {
    const s = effectiveRoleScore(item, "sub");
    const d = effectiveRoleScore(item, "dom");
    if (!(s === FANTASY_SCORE && d === FANTASY_SCORE)) return false;
  }
  if (status.value === "bothAfterRated" && !(hasRoleExperience(item, "sub") && hasRoleExperience(item, "dom") && Number.isInteger(item.afterSub) && Number.isInteger(item.afterDom))) return false;

  if (minFilterScore.value !== "") {
    const min = Number(minFilterScore.value);
    const s = effectiveRoleScore(item, "sub");
    const d = effectiveRoleScore(item, "dom");
    if (!meetsRealMinimum(s, min) || !meetsRealMinimum(d, min)) return false;
  }

  if (activeQuickFilter === "incompleteRole") {
    const field = currentRole === "dom" ? "wantDom" : "wantSub";
    if (Number.isInteger(item[field])) return false;
  }
  if (activeQuickFilter === "session" && !isInSession(item)) return false;
  if (activeQuickFilter === "randomCriteria" && !matchesRandomPairCriterion(item)) return false;
  if (activeQuickFilter === "testSub" && effectiveRoleScore(item, "sub") !== FAVORITE_SCORE) return false;
  if (activeQuickFilter === "testDom" && effectiveRoleScore(item, "dom") !== FAVORITE_SCORE) return false;
  if (activeQuickFilter === "testBoth" && !(effectiveRoleScore(item, "sub") === FAVORITE_SCORE && effectiveRoleScore(item, "dom") === FAVORITE_SCORE)) return false;

  if (activeQuickFilter === "both4") {
    const s = effectiveRoleScore(item, "sub");
    const d = effectiveRoleScore(item, "dom");
    if (!meetsRealMinimum(s, 3) || !meetsRealMinimum(d, 3)) return false;
  }
  if (activeQuickFilter === "both4todo") {
    const s = effectiveRoleScore(item, "sub");
    const d = effectiveRoleScore(item, "dom");
    if (item.doneTogether || !meetsRealMinimum(s, 3) || !meetsRealMinimum(d, 3)) return false;
  }
  if (activeQuickFilter === "together" && !item.doneTogether) return false;
  if (activeQuickFilter === "afterBoth4") {
    if (!(hasRoleExperience(item, "sub") && hasRoleExperience(item, "dom")) || !meetsRealMinimum(item.afterSub, 3) || !meetsRealMinimum(item.afterDom, 3)) return false;
  }
  if (activeQuickFilter === "afterMissing") {
    if (!((hasRoleExperience(item, "sub") && !Number.isInteger(item.afterSub)) || (hasRoleExperience(item, "dom") && !Number.isInteger(item.afterDom)))) return false;
  }
  return true;
}

function syncRowHeights() {
  const leftRows = leftTable.querySelectorAll("[data-sync]");
  const rightRows = rightTable.querySelectorAll("[data-sync]");
  const count = Math.min(leftRows.length, rightRows.length);
  const heights = new Array(count);

  // 1) toutes les écritures, 2) toutes les mesures, 3) toutes les écritures.
  // Cela évite de forcer un recalcul de layout à chaque ligne.
  for (let i = 0; i < count; i++) {
    leftRows[i].style.height = "";
    rightRows[i].style.height = "";
  }
  for (let i = 0; i < count; i++) {
    heights[i] = Math.max(leftRows[i].offsetHeight, rightRows[i].offsetHeight);
  }
  for (let i = 0; i < count; i++) {
    const h = heights[i] + "px";
    leftRows[i].style.height = h;
    rightRows[i].style.height = h;
  }
}


function renderColumnControls() {
  const isMobile = MOBILE_MQ.matches;
  const cols = [...fixedColumns, ...scrollColumns].filter(col => {
    if (isMobile && ["num","category"].includes(col.key)) return false;
    return showOtherRoleColumns || !col.owner || col.owner === currentRole;
  });
  columnControls.innerHTML = cols.map(col => {
    const ownerClass = col.owner ? ` owner-${col.owner}` : "";
    const roleDetail = col.owner ? ` — ${roleLabel(col.owner)}` : "";
    const accessibleLabel = `${columnLabel(col).replace(/<br\s*\/?>/gi, " ")}${roleDetail}`;
    return `
      <button class="col-toggle${ownerClass} ${visibleColumns[col.key] ? "active" : ""}" data-col-toggle="${col.key}" type="button" aria-label="${esc(accessibleLabel)}" title="${esc(accessibleLabel)}">
        ${columnShort(col)}${col.key === "practice" ? `<small>${t("useful")}</small>` : ""}
      </button>
    `;
  }).join("");
}


function renderQuickFilters() {
  const field = currentRole === "dom" ? "wantDom" : "wantSub";
  const maxLevel = experienceMaxLevel();
  let incompleteCount = 0;
  for (const item of items) {
    if (Number(item.level || 3) <= maxLevel && !Number.isInteger(item[field])) incompleteCount++;
  }

  quickFilters.innerHTML = quickFilterDefs.map(f => {
    let label = `${f.prefix || ""}${t(f.labelKey)}`;
    if (f.key === "incompleteRole") {
      label = currentLang === "fr"
        ? `À compléter ${roleLabel(currentRole)} · ${incompleteCount}`
        : `To complete ${roleLabel(currentRole)} · ${incompleteCount}`;
    }
    if (f.key === "session") label = `${t("session")} · ${sessionOrder.length}`;

    const classes = [
      "quick-filter-btn",
      f.featured ? "featured" : "",
      f.featuredIncomplete ? "featured-incomplete" : "",
      f.featuredSession ? "featured-session" : "",
      activeQuickFilter === f.key ? "active" : ""
    ].filter(Boolean).join(" ");

    return `<button class="${classes}" data-quick-filter="${f.key}" type="button">${label}</button>`;
  }).join("");
}

function getVisibleFixedColumns() {
  if (MOBILE_MQ.matches) {
    const practice = fixedColumns.find(c => c.key === "practice");
    return practice ? [practice] : [];
  }
  return fixedColumns.filter(c => visibleColumns[c.key]);
}
function getVisibleScrollColumns() {
  return scrollColumns.filter(c => {
    if (!visibleColumns[c.key]) return false;
    if (!showOtherRoleColumns && c.owner && c.owner !== currentRole) return false;
    return true;
  });
}

let lastGeometrySignature = "";
function applyColumnGeometry() {
  const isMobile = MOBILE_MQ.matches;
  const signature = [
    isMobile ? "m" : "d", currentRole, showOtherRoleColumns,
    ...Object.entries(visibleColumns).map(([k,v]) => `${k}:${v ? 1 : 0}`)
  ].join("|");
  if (signature === lastGeometrySignature) return;
  lastGeometrySignature = signature;
  const fixedDefs = {
    num: isMobile ? "0px" : "48px",
    category: isMobile ? "0px" : "180px",
    practice: isMobile ? "150px" : "260px",
  };
  const scrollDefs = {
    explanation: isMobile ? "220px" : "320px",
    wantSub: isMobile ? "420px" : "480px",
    wantDom: isMobile ? "420px" : "480px",
    priorSub: isMobile ? "76px" : "96px",
    priorDom: isMobile ? "76px" : "96px",
    doneTogether: isMobile ? "82px" : "100px",
    afterSub: isMobile ? "420px" : "480px",
    afterDom: isMobile ? "420px" : "480px",
    notes: isMobile ? "240px" : "320px",
  };
  const visibleFixed = getVisibleFixedColumns();
  const visibleScroll = getVisibleScrollColumns();
  const leftCols = visibleFixed.map(c => fixedDefs[c.key]);
  const rightCols = visibleScroll.map(c => scrollDefs[c.key]);

  const leftWidth = leftCols.reduce((s,w)=>s+(parseInt(w,10)||0),0) || 1;
  const rightWidth = rightCols.reduce((s,w)=>s+(parseInt(w,10)||0),0) || 1;

  document.documentElement.style.setProperty("--left-template", leftCols.join(" ") || "1fr");
  document.documentElement.style.setProperty("--left-width", leftWidth + "px");
  document.documentElement.style.setProperty("--right-template", rightCols.join(" ") || "1fr");
  document.documentElement.style.setProperty("--right-width", rightWidth + "px");

  const rightEnabled = visibleScroll.length > 0;
  rightHeadWrap.style.display = rightEnabled ? "" : "none";
  rightPane.style.display = rightEnabled ? "" : "none";
  bottomScrollRow.style.display = rightEnabled ? "" : "none";
  bottomScrollLeft.style.width = leftWidth + "px";
  bottomScrollLeft.style.minWidth = leftWidth + "px";
  bottomScrollLeft.style.flexBasis = leftWidth + "px";
  bottomHScrollInner.style.width = rightWidth + "px";
  bottomHScrollInner.style.minWidth = rightWidth + "px";
}


function categoryRoleField() {
  return currentRole === "dom" ? "wantDom" : "wantSub";
}

function categoryCompletion(categoryName) {
  const field = categoryRoleField();
  const maxLevel = experienceMaxLevel();
  let filled = 0;
  let total = 0;
  for (const item of itemsByCategory.get(categoryName) || []) {
    if (Number(item.level || 3) > maxLevel) continue;
    total++;
    if (Number.isInteger(item[field])) filled++;
  }
  return {filled, total};
}

function categoryProgressTitle(categoryName, completion) {
  const role = roleLabel(currentRole);
  const mode = experienceLabel();
  if (currentLang === "fr") {
    return `${completion.filled} pratique${completion.filled > 1 ? "s" : ""} renseignée${completion.filled > 1 ? "s" : ""} sur ${completion.total} pour ${role} · ${mode}`;
  }
  return `${completion.filled} of ${completion.total} rated for ${role} · ${mode}`;
}

function refreshCategoryProgress(categoryName) {
  const completion = categoryCompletion(categoryName);
  const title = categoryProgressTitle(categoryName, completion);
  leftTable.querySelectorAll(".section-left[data-category]").forEach(section => {
    if (section.dataset.category !== categoryName) return;
    const pill = section.querySelector(".category-progress");
    if (!pill) return;
    pill.textContent = `${completion.filled}/${completion.total}`;
    pill.title = title;
    pill.setAttribute("aria-label", title);
    pill.classList.toggle("complete", completion.total > 0 && completion.filled === completion.total);
    pill.classList.toggle("empty", completion.filled === 0);
  });
}

function categoryScoreState(categoryName) {
  const field = categoryRoleField();
  const maxLevel = experienceMaxLevel();
  const values = items
    .filter(x => x.category === categoryName && Number(x.level || 3) <= maxLevel)
    .map(x => Number.isInteger(x[field]) ? x[field] : null);
  if (!values.length || values.every(v => v === null)) return { kind:"unknown", value:null };
  const first = values[0];
  if (values.every(v => v === first)) return { kind:first === null ? "unknown" : "same", value:first };
  return { kind:"mixed", value:null };
}

function renderCategoryScoreControls(categoryName) {
  const state = categoryScoreState(categoryName);
  const editable = canEditRole(currentRole);
  const unknownActive = state.kind === "unknown";
  const selectedUnknown = unknownActive ? " selected" : "";
  const unknownText = esc(t("unknown"));
  const unknown = `<button class="score-btn category-score-btn unknown-score${selectedUnknown}" data-category-score="unknown" data-category="${esc(categoryName)}" type="button" ${editable ? "" : "disabled"} aria-label="${unknownText}" aria-pressed="${unknownActive ? "true" : "false"}" title="${unknownText}">?</button>`;
  const scores = SCORE_BUTTON_ORDER.map(n => {
    const isSelected = state.kind === "same" && state.value === n;
    const selected = isSelected ? " selected" : "";
    const isLimit = n === 0;
    const ui = cachedScoreUi(n, currentRole);
    return `<button class="score-btn category-score-btn semantic-score-btn${isLimit ? ' limit-score' : ''}${selected}" data-category-score="${n}" data-category="${esc(categoryName)}" type="button" ${editable ? "" : "disabled"} aria-label="${ui.title}" aria-pressed="${isSelected ? "true" : "false"}" title="${ui.title}">${ui.label}</button>`;
  }).join("");
  return `<div class="category-rating" title="${t("categoryAllHint")}">
    <span class="category-rating-label">Cat.</span>
    <div class="category-rating-buttons">${unknown}${scores}</div>
  </div>`;
}

function renderCategoryRightHeader(categoryName, visibleScroll = getVisibleScrollColumns()) {
  const targetKey = currentRole === "dom" ? "wantDom" : "wantSub";
  return visibleScroll.map(col => {
    if (col.key !== targetKey) {
      return `<div class="section-right-cell section-right-spacer" data-col="${col.key}"></div>`;
    }
    return `<div class="section-right-cell section-right-score" data-col="${col.key}">${renderCategoryScoreControls(categoryName)}</div>`;
  }).join("");
}

let lastCategoryScoreBatch = null;
let categoryUndoTimer = null;
let categoryDecisionResolver = null;
let categoryDecisionPreviousFocus = null;

function ensureCategoryUndoToast() {
  let toast = document.getElementById("categoryUndoToast");
  if (toast) return toast;
  toast = document.createElement("div");
  toast.id = "categoryUndoToast";
  toast.className = "category-undo-toast";
  toast.hidden = true;
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  toast.innerHTML = '<span class="category-undo-toast-message"></span><button type="button"></button>';
  document.body.appendChild(toast);
  return toast;
}

function hideCategoryUndoToast() {
  clearTimeout(categoryUndoTimer);
  const toast = document.getElementById("categoryUndoToast");
  if (toast) toast.hidden = true;
}

function showCategoryUndoToast(batch) {
  const toast = ensureCategoryUndoToast();
  const message = toast.querySelector(".category-undo-toast-message");
  const button = toast.querySelector("button");
  const n = batch.changes.length;
  message.textContent = currentLang === "fr"
    ? `${n} pratique${n > 1 ? "s" : ""} modifiée${n > 1 ? "s" : ""} dans « ${localizedCategory(batch.categoryName)} ».`
    : `${n} practice${n > 1 ? "s" : ""} changed in “${localizedCategory(batch.categoryName)}”.`;
  button.textContent = currentLang === "fr" ? "↶ Annuler" : "↶ Undo";
  button.onclick = undoLastCategoryScoreBatch;
  toast.hidden = false;
  clearTimeout(categoryUndoTimer);
  categoryUndoTimer = setTimeout(() => {
    toast.hidden = true;
    if (lastCategoryScoreBatch === batch) lastCategoryScoreBatch = null;
  }, 12000);
}

function undoLastCategoryScoreBatch() {
  const batch = lastCategoryScoreBatch;
  if (!batch || readOnly) return;
  let reverted = 0;
  for (const change of batch.changes) {
    const item = itemsById.get(Number(change.id));
    if (!item) continue;
    // Si la valeur a été changée après l'action en masse, on ne la touche pas.
    if (item[batch.field] !== change.appliedValue) continue;
    item[batch.field] = change.previousValue;
    reverted++;
  }
  lastCategoryScoreBatch = null;
  hideCategoryUndoToast();
  if (!reverted) return;
  scheduleSave(batch.role);
  renderQuickFilters();
  render();
  const toast = ensureCategoryUndoToast();
  const button = toast.querySelector("button");
  toast.querySelector(".category-undo-toast-message").textContent = currentLang === "fr"
    ? `${reverted} modification${reverted > 1 ? "s" : ""} annulée${reverted > 1 ? "s" : ""}.`
    : `${reverted} change${reverted > 1 ? "s" : ""} undone.`;
  button.textContent = currentLang === "fr" ? "Fermer" : "Close";
  button.onclick = () => { toast.hidden = true; };
  toast.hidden = false;
  categoryUndoTimer = setTimeout(() => { toast.hidden = true; }, 3500);
}

function ensureCategoryDecisionModal() {
  let modal = document.getElementById("categoryDecisionModal");
  if (modal) return modal;
  modal = document.createElement("div");
  modal.id = "categoryDecisionModal";
  modal.className = "category-decision-modal";
  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");
  modal.innerHTML = `
    <div class="category-decision-backdrop" data-category-decision="cancel"></div>
    <section class="category-decision-card" role="dialog" aria-modal="true" aria-labelledby="categoryDecisionTitle" aria-describedby="categoryDecisionText">
      <h2 id="categoryDecisionTitle"></h2>
      <p id="categoryDecisionText"></p>
      <div class="category-decision-stats" id="categoryDecisionStats"></div>
      <div class="category-decision-actions" id="categoryDecisionActions"></div>
    </section>`;
  modal.addEventListener("click", e => {
    const target = e.target.closest("[data-category-decision]");
    if (target) resolveCategoryDecision(target.dataset.categoryDecision);
  });
  document.body.appendChild(modal);
  return modal;
}

function resolveCategoryDecision(choice) {
  const modal = document.getElementById("categoryDecisionModal");
  if (modal) {
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
  }
  document.removeEventListener("keydown", categoryDecisionKeydown, true);
  setAppBackgroundInert(false);
  const resolver = categoryDecisionResolver;
  categoryDecisionResolver = null;
  if (categoryDecisionPreviousFocus && typeof categoryDecisionPreviousFocus.focus === "function") {
    categoryDecisionPreviousFocus.focus({preventScroll:true});
  }
  categoryDecisionPreviousFocus = null;
  if (resolver) resolver(choice || "cancel");
}

function categoryDecisionKeydown(e) {
  if (e.key === "Escape") {
    e.preventDefault();
    resolveCategoryDecision("cancel");
    return;
  }
  if (e.key !== "Tab") return;
  const modal = document.getElementById("categoryDecisionModal");
  if (!modal || modal.hidden) return;
  const focusable = [...modal.querySelectorAll('button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')]
    .filter(el => !el.hidden && el.getClientRects().length);
  if (!focusable.length) return;
  const first = focusable[0], last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

function askCategoryDecision({categoryName, score, total, rated, unrated, limits, mode}) {
  const modal = ensureCategoryDecisionModal();
  const categoryLabel = localizedCategory(categoryName);
  const clearing = score === null;
  const categoryChoiceLabel = score === null ? "?" : scoreLabel(score, false, currentRole);
  const title = modal.querySelector("#categoryDecisionTitle");
  const text = modal.querySelector("#categoryDecisionText");
  const stats = modal.querySelector("#categoryDecisionStats");
  const actions = modal.querySelector("#categoryDecisionActions");

  if (currentLang === "fr") {
    title.textContent = clearing ? `Effacer les notes de « ${categoryLabel} » ?` : `Appliquer « ${categoryChoiceLabel} » à « ${categoryLabel} » ?`;
    const protectLimits = clearing || score !== 0;
    text.textContent = clearing
      ? `Cette action concerne uniquement les pratiques accessibles en mode ${mode}. Les 🚫 restent protégés.`
      : (protectLimits
        ? `Compléter renseigne seulement les ?. Écraser remplace les autres notes accessibles mais conserve les 🚫 déjà posés.`
        : `Compléter renseigne seulement les ?. Écraser applique 🚫 à toutes les pratiques accessibles.`);
    stats.textContent = `${total} accessibles · ${rated} déjà notée${rated > 1 ? "s" : ""} · ${unrated} à compléter${limits ? ` · ${limits} 🚫 protégé${limits > 1 ? "s" : ""}` : ""}`;
    actions.innerHTML = clearing
      ? `<button type="button" class="category-decision-btn cancel" data-category-decision="cancel">Annuler</button><button type="button" class="category-decision-btn overwrite" data-category-decision="clear">Effacer les notes hors 🚫</button>`
      : `<button type="button" class="category-decision-btn cancel" data-category-decision="cancel">Annuler</button><button type="button" class="category-decision-btn fill" data-category-decision="fill" ${unrated ? "" : "disabled"}>Compléter uniquement</button><button type="button" class="category-decision-btn overwrite" data-category-decision="overwrite">${score === 0 ? "Appliquer 🚫 à toutes" : "Écraser hors 🚫"}</button>`;
  } else {
    title.textContent = clearing ? `Clear ratings in “${categoryLabel}”?` : `Apply “${categoryChoiceLabel}” to “${categoryLabel}”?`;
    const protectLimits = clearing || score !== 0;
    text.textContent = clearing
      ? `This affects only practices available in ${mode} mode. Existing 🚫 limits stay protected.`
      : (protectLimits
        ? `Fill only answers ?. Overwrite replaces other accessible ratings but preserves existing 🚫 limits.`
        : `Fill only answers ?. Overwrite applies 🚫 to every accessible practice.`);
    stats.textContent = `${total} accessible · ${rated} already rated · ${unrated} to fill${limits ? ` · ${limits} protected 🚫` : ""}`;
    actions.innerHTML = clearing
      ? `<button type="button" class="category-decision-btn cancel" data-category-decision="cancel">Cancel</button><button type="button" class="category-decision-btn overwrite" data-category-decision="clear">Clear ratings except 🚫</button>`
      : `<button type="button" class="category-decision-btn cancel" data-category-decision="cancel">Cancel</button><button type="button" class="category-decision-btn fill" data-category-decision="fill" ${unrated ? "" : "disabled"}>Fill only</button><button type="button" class="category-decision-btn overwrite" data-category-decision="overwrite">${score === 0 ? "Apply 🚫 to all" : "Overwrite except 🚫"}</button>`;
  }

  categoryDecisionPreviousFocus = document.activeElement;
  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");
  setAppBackgroundInert(true);
  document.addEventListener("keydown", categoryDecisionKeydown, true);
  const preferred = actions.querySelector('.fill:not(:disabled)') || actions.querySelector('.cancel');
  requestAnimationFrame(() => preferred?.focus());
  return new Promise(resolve => { categoryDecisionResolver = resolve; });
}

async function applyCategoryScore(categoryName, rawScore) {
  if (readOnly || !canEditRole(currentRole)) return;
  const field = categoryRoleField();
  const maxLevel = experienceMaxLevel();
  const visibleCategoryItems = (itemsByCategory.get(categoryName) || []).filter(item =>
    Number(item.level || 3) <= maxLevel
  );
  if (!visibleCategoryItems.length) return;

  const clearing = rawScore === "unknown";
  const score = clearing ? null : Number(rawScore);
  if (!clearing && validScore(score) === null) return;

  const rated = visibleCategoryItems.filter(item => Number.isInteger(item[field])).length;
  const limits = visibleCategoryItems.filter(item => item[field] === 0).length;
  const unrated = visibleCategoryItems.length - rated;
  const clearable = rated - limits;
  if (clearing && clearable === 0) return;

  const decision = await askCategoryDecision({
    categoryName,
    score,
    total:visibleCategoryItems.length,
    rated,
    unrated,
    limits,
    mode:experienceLabel()
  });
  if (decision === "cancel") return;

  let candidates;
  if (decision === "fill") {
    candidates = visibleCategoryItems.filter(item => !Number.isInteger(item[field]));
  } else if (decision === "overwrite") {
    candidates = score === 0
      ? visibleCategoryItems
      : visibleCategoryItems.filter(item => item[field] !== 0);
  } else if (decision === "clear") {
    candidates = visibleCategoryItems.filter(item => Number.isInteger(item[field]) && item[field] !== 0);
  } else {
    return;
  }

  const appliedValue = decision === "clear" ? null : score;
  const changes = candidates.filter(item => item[field] !== appliedValue);
  if (!changes.length) return;

  const batch = {
    categoryName,
    field,
    role:currentRole,
    changes:changes.map(item => ({
      id:Number(item.id),
      previousValue:item[field],
      appliedValue
    }))
  };

  for (const item of changes) {
    item[field] = appliedValue;
  }
  lastCategoryScoreBatch = batch;
  const sessionChangedByLimit = sanitizeSessionForLimits(true, true);
  if (sessionChangedByLimit) renderSessionPanel();
  scheduleSave(currentRole);
  renderQuickFilters();
  render();
  showCategoryUndoToast(batch);
}


function render() {
  renderHeads();
  applyColumnGeometry();

  const filterQuery = search.value.trim().toLowerCase();
  const visibleFixed = getVisibleFixedColumns();
  const visibleScroll = getVisibleScrollColumns();
  let visibleCount = 0;
  let leftHtml = "";
  let rightHtml = "";
  let syncIndex = 0;

  // Filtrage + regroupement en une seule passe.
  const grouped = new Map();
  for (const item of items) {
    if (!matches(item, filterQuery)) continue;
    visibleCount++;
    if (!grouped.has(item.category)) grouped.set(item.category, []);
    grouped.get(item.category).push(item);
  }

  for (const [categoryName, categoryItems] of grouped.entries()) {
    const catColor = categoryColors[categoryName] || "#E7E7E7";
    const collapsed = isCategoryCollapsed(categoryName);
    const completion = categoryCompletion(categoryName);
    const progressTitle = categoryProgressTitle(categoryName, completion);
    const progressClass = completion.total > 0 && completion.filled === completion.total
      ? " complete"
      : completion.filled === 0 ? " empty" : "";

    leftHtml += `<div class="section-left" data-sync="section-${syncIndex}" data-category="${esc(categoryName)}" style="border-left-color:${catColor}">
      <button class="category-toggle" data-category-toggle="${esc(categoryName)}" type="button" aria-expanded="${collapsed ? "false" : "true"}">
        <span class="section-dot" style="background:${catColor}"></span>
        <span class="category-chevron">${collapsed ? "▸" : "▾"}</span>
        <span class="category-toggle-name">${esc(localizedCategory(categoryName))}</span>
        <span class="category-progress${progressClass}" title="${esc(progressTitle)}" aria-label="${esc(progressTitle)}">${completion.filled}/${completion.total}</span>
      </button>
    </div>`;
    rightHtml += `<div class="section-right" data-sync="section-${syncIndex}">
      ${renderCategoryRightHeader(categoryName, visibleScroll)}
    </div>`;
    syncIndex++;

    if (collapsed) continue;

    for (const item of categoryItems) {
      leftHtml += `<div class="left-row ${item._randomPicked ? 'row-random-picked' : ''}" data-sync="row-${syncIndex}" data-row-id="${item.id}" data-category="${esc(item.category)}">
        ${visibleFixed.map(col => renderLeftCell(item, col.key)).join("")}
      </div>`;
      rightHtml += `<div class="right-row" data-sync="row-${syncIndex}" data-row-id="${item.id}" data-category="${esc(item.category)}">
        ${visibleScroll.map(col => renderRightCell(item, col.key)).join("")}
      </div>`;
      syncIndex++;
    }
  }

  leftTable.innerHTML = leftHtml;
  rightTable.innerHTML = rightHtml;
  empty.classList.toggle("hidden", visibleCount !== 0);

  updateStats(visibleCount);

  requestAnimationFrame(() => {
    syncRowHeights();
    rightHeadWrap.scrollLeft = rightScroll.scrollLeft;
    bottomHScroll.scrollLeft = rightScroll.scrollLeft;
    updateMobileCategoryBar();
  });
}


function updateMobileCategoryBar() {
  if (!MOBILE_MQ.matches) return;

  const allCandidates = [...leftTable.querySelectorAll(".section-left[data-category], .left-row[data-category]")];
  const hasRows = allCandidates.some(el => el.classList.contains("left-row"));
  const sections = hasRows ? null : allCandidates;
  mobileCategoryBar.classList.toggle("categories-only", !hasRows && allCandidates.length > 0);
  const candidates = hasRows ? allCandidates : sections;

  if (!candidates.length) {
    mobileCategoryText.textContent = t("noResults");
    mobileCategoryDot.style.background = "#9aa0a6";
    mobileCategoryBar.style.borderLeftColor = "#9aa0a6";
    return;
  }

  const scrollTop = tableBody.scrollTop;
  let current = candidates[0];
  for (const el of candidates) {
    if (el.offsetTop + el.offsetHeight > scrollTop + 2) {
      current = el;
      break;
    }
    current = el;
  }

  const cat = current.dataset.category || "";
  const color = categoryColors[cat] || "#9aa0a6";
  mobileCategoryText.textContent = cat ? localizedCategory(cat) : t("category");
  mobileCategoryDot.style.background = color;
  mobileCategoryBar.style.borderLeftColor = color;
}

function randomThresholdRank(value) {
  return ({ fantasy:1, neutral:2, want:3, favorite:4 })[value] || 0;
}

function randomPreferenceRank(score) {
  const v = validScore(score);
  if (v === FANTASY_SCORE) return 1;
  if (v === 2) return 2;
  if (v === 3) return 3;
  if (v === FAVORITE_SCORE) return 4;
  // ? / 🚫 / Pas maintenant ne sont jamais tirables.
  return 0;
}

function randomThresholdLabel(value) {
  if (value === "fantasy") return t("drawFantasy");
  if (value === "neutral") return t("drawNeutral");
  if (value === "want") return t("drawWant");
  if (value === "favorite") return t("drawFavorite");
  return "—";
}

function matchesRandomPairCriterion(item) {
  const s = effectiveRoleScore(item, "sub");
  const d = effectiveRoleScore(item, "dom");
  const sr = randomPreferenceRank(s);
  const dr = randomPreferenceRank(d);
  if (!sr || !dr) return false;

  const a = randomThresholdRank(minRandomOne.value);
  const b = randomThresholdRank(minRandomOther.value);
  const symmetricMatch = (sr >= a && dr >= b) || (sr >= b && dr >= a);
  if (!symmetricMatch) return false;

  // Deux personnes neutres n'expriment aucune envie réelle : exclu par défaut,
  // mais l'utilisateur peut volontairement l'autoriser pour découvrir/tester.
  if (!randomIncludeNeutralNeutral.checked && s === 2 && d === 2) return false;
  return true;
}

function isRandomPairEligible(item) {
  return item.randomizable !== false
    && Number(item.level || 3) <= experienceMaxLevel()
    && matchesRandomPairCriterion(item);
}

function getRandomEligibilitySnapshot() {
  const pairEligible = [];
  const baseEligible = [];
  const eligible = [];
  let bothFavorite = 0;
  let newTogether = 0;
  let fantasyCount = 0;

  for (const item of items) {
    if (!isRandomPairEligible(item)) continue;
    pairEligible.push(item);

    const s = effectiveRoleScore(item, "sub");
    const d = effectiveRoleScore(item, "dom");
    if (s === FAVORITE_SCORE && d === FAVORITE_SCORE) bothFavorite++;
    if (!item.doneTogether) newTogether++;
    if (s === FANTASY_SCORE || d === FANTASY_SCORE) fantasyCount++;

    if (randomOnlyNew.checked && item.doneTogether) continue;
    if (randomExcludeHighRisk.checked && item.risk === "high" && !(s === FANTASY_SCORE || d === FANTASY_SCORE)) continue;
    baseEligible.push(item);

    if (!randomNoRepeat.checked || !randomDrawHistory.has(Number(item.id))) {
      eligible.push(item);
    }
  }

  return { pairEligible, baseEligible, eligible, bothFavorite, newTogether, fantasyCount };
}

function updateCompatibilityIndicator() {
  const snapshot = getRandomEligibilitySnapshot();
  const { pairEligible, baseEligible, eligible, bothFavorite, newTogether, fantasyCount } = snapshot;
  const baseCandidates = baseEligible;
  const candidates = eligible.length;

  const thresholdValues = [minRandomOne.value, minRandomOther.value]
    .sort((a, b) => randomThresholdRank(b) - randomThresholdRank(a));
  const thresholdLabels = thresholdValues.map(randomThresholdLabel);
  const criterionLabel = thresholdValues[0] === thresholdValues[1]
    ? thresholdLabels[0]
    : `${thresholdLabels[0]} + ${thresholdLabels[1]}`;
  compatIndicator.textContent = currentLang === "fr"
    ? `${pairEligible.length} au critère : ${criterionLabel}`
    : `${pairEligible.length} match: ${criterionLabel}`;
  compatIndicator.setAttribute("role", "button");
  compatIndicator.setAttribute("tabindex", "0");
  compatIndicator.title = t("compatibleTitle");

  if (currentLang === "fr") {
    compatDetails.innerHTML = `
      <button class="compat-filter-btn" data-compat-filter="all" type="button">Critère couple : ${pairEligible.length}</button>
      <button class="compat-filter-btn" data-compat-filter="bothTest" type="button">⭐+👑 favoris : ${bothFavorite}</button>
      <button class="compat-filter-btn" data-compat-filter="new" type="button">Jamais ensemble : ${newTogether}</button>
      ${fantasyCount ? `<span class="random-fantasy-badge">💭 ${fantasyCount} fantasme${fantasyCount > 1 ? "s" : ""}</span>` : ""}
    `;
    randomCandidateInfo.textContent = randomNoRepeat.checked
      ? `Tirables : ${candidates}/${baseCandidates.length} restantes dans ce cycle`
      : `Tirables avec les options actuelles : ${baseCandidates.length}`;
  } else {
    compatDetails.innerHTML = `
      <button class="compat-filter-btn" data-compat-filter="all" type="button">Couple criterion: ${pairEligible.length}</button>
      <button class="compat-filter-btn" data-compat-filter="bothTest" type="button">⭐+👑 favorites: ${bothFavorite}</button>
      <button class="compat-filter-btn" data-compat-filter="new" type="button">Never together: ${newTogether}</button>
      ${fantasyCount ? `<span class="random-fantasy-badge">💭 ${fantasyCount} fantas${fantasyCount > 1 ? "ies" : "y"}</span>` : ""}
    `;
    randomCandidateInfo.textContent = randomNoRepeat.checked
      ? `Eligible: ${candidates}/${baseCandidates.length} remaining in this cycle`
      : `Eligible with current options: ${baseCandidates.length}`;
  }
}

function updateStats(visibleCount = null) {
  if (visibleCount !== null) {
    statVisibleEl.textContent = currentLang === "fr"
      ? `${visibleCount} / ${items.length} dans ce mode / filtre`
      : `${visibleCount} / ${items.length} in this mode / filter`;
  }

  let priorSubCount = 0, priorDomCount = 0, togetherCount = 0;
  let ratedSub = 0, ratedDom = 0, favoriteSubCount = 0, favoriteDomCount = 0;
  for (const item of items) {
    if (item.priorSub) priorSubCount++;
    if (item.priorDom) priorDomCount++;
    if (item.doneTogether) togetherCount++;
    if (Number.isInteger(item.wantSub)) ratedSub++;
    if (Number.isInteger(item.wantDom)) ratedDom++;
    if (effectiveRoleScore(item, "sub") === FAVORITE_SCORE) favoriteSubCount++;
    if (effectiveRoleScore(item, "dom") === FAVORITE_SCORE) favoriteDomCount++;
  }

  const priorCounts = {sub:priorSubCount, dom:priorDomCount};
  const ratedCounts = {sub:ratedSub, dom:ratedDom};
  const favoriteCounts = {sub:favoriteSubCount, dom:favoriteDomCount};
  const roleStats = (counts, formatter) => ROLE_VISUAL_ORDER.map(role => formatter(role, counts[role])).join(" · ");

  statDoneEl.textContent = currentLang === "fr"
    ? `Déjà fait avant : ${roleStats(priorCounts, (role, count) => `${roleLabel(role)} ${count}`)}`
    : `Done before: ${roleStats(priorCounts, (role, count) => `${roleLabel(role)} ${count}`)}`;
  statTogetherEl.textContent = currentLang === "fr"
    ? `${togetherCount} faites ensemble`
    : `${togetherCount} done together`;
  statRatedEl.textContent = currentLang === "fr"
    ? `Progression : ${roleStats(ratedCounts, (role, count) => `${roleLabel(role)} ${count}/${items.length}`)}`
    : `Progress: ${roleStats(ratedCounts, (role, count) => `${roleLabel(role)} ${count}/${items.length}`)}`;
  statStarredEl.textContent = currentLang === "fr"
    ? `Favoris : ${roleStats(favoriteCounts, (role, count) => `${favoriteSymbol(role)} ${roleLabel(role)} ${count}`)}`
    : `Favorites: ${roleStats(favoriteCounts, (role, count) => `${favoriteSymbol(role)} ${roleLabel(role)} ${count}`)}`;

  const statMode = document.getElementById("statMode");
  if (statMode) statMode.textContent = currentLang === "fr"
    ? `Parcours : ${experienceLabel()} · rôle ${roleLabel(currentRole)}${readOnly ? ` · ${t("readOnlySuffix")}` : ""}`
    : `Path: ${experienceLabel()} · ${roleLabel(currentRole)} role${readOnly ? ` · ${t("readOnlySuffix")}` : ""}`;

  updateCompatibilityIndicator();
  renderSessionPanel();
}


function pickRandomPractice() {
  items.forEach(x => delete x._randomPicked);

  const snapshot = getRandomEligibilitySnapshot();
  const baseEligible = snapshot.baseEligible;
  let eligible = snapshot.eligible;
  let cycleRestarted = false;
  const oneLabel = randomThresholdLabel(minRandomOne.value);
  const otherLabel = randomThresholdLabel(minRandomOther.value);

  if (!baseEligible.length) {
    const extras = [
      randomOnlyNew.checked ? (currentLang === "fr" ? "jamais fait ensemble" : "never done together") : "",
      !randomIncludeNeutralNeutral.checked ? (currentLang === "fr" ? "Neutre + Neutre exclus" : "Neutral + Neutral excluded") : "",
      randomExcludeHighRisk.checked ? (currentLang === "fr" ? "risque élevé exclu hors fantasmes" : "high risk excluded except fantasy-only") : ""
    ].filter(Boolean).join(" + ");

    randomResult.innerHTML = currentLang === "fr"
      ? `Aucune pratique correspondant au critère symétrique <strong>${esc(oneLabel)} / ${esc(otherLabel)}</strong>${extras ? ` avec <strong>${extras}</strong>` : ""}.`
      : `No practice matches the symmetric criterion <strong>${esc(oneLabel)} / ${esc(otherLabel)}</strong>${extras ? ` with <strong>${extras}</strong>` : ""}.`;
    render();
    return;
  }

  if (randomNoRepeat.checked && !eligible.length) {
    randomDrawHistory.clear();
    saveRandomHistory();
    eligible = [...baseEligible];
    cycleRestarted = true;
  }

  const picked = eligible[Math.floor(Math.random() * eligible.length)];
  picked._randomPicked = true;
  if (randomNoRepeat.checked) {
    randomDrawHistory.add(Number(picked.id));
    saveRandomHistory();
  }

  const s = effectiveRoleScore(picked, "sub");
  const d = effectiveRoleScore(picked, "dom");
  const sSource = hasRoleExperience(picked, "sub") && Number.isInteger(picked.afterSub) ? t("sourceAfter") : t("sourceWant");
  const dSource = hasRoleExperience(picked, "dom") && Number.isInteger(picked.afterDom) ? t("sourceAfter") : t("sourceWant");
  const fantasyOnly = hasFantasyOnly(picked);

  search.value = "";
  category.value = "";
  status.value = "";
  minFilterScore.value = "";
  riskFilter.value = "";
  activeQuickFilter = "";
  renderQuickFilters();
  render();

  const row = rightTable.querySelector(`[data-row-id="${picked.id}"]`);
  if (row) row.scrollIntoView({ behavior:"smooth", block:"center" });

  const already = isInSession(picked);
  const cycleText = cycleRestarted
    ? (currentLang === "fr" ? `<div class="random-candidate-info">Cycle précédent terminé : nouveau cycle démarré automatiquement.</div>` : `<div class="random-candidate-info">Previous cycle complete: a new cycle started automatically.</div>`)
    : "";
  const riskInfo = picked.risk === "normal"
    ? ""
    : ` · ${riskBadge(picked)} <strong>${esc(riskLabel(picked.risk))}</strong>`;
  const fantasyBanner = fantasyOnly
    ? `<div class="random-fantasy-warning">${esc(t("randomFantasyWarning"))}</div>`
    : "";
  const addLabel = fantasyOnly ? t("addFantasyToSession") : t("addRandomToSession");

  const scoreByRole = {sub:s, dom:d};
  const sourceByRole = {sub:sSource, dom:dSource};
  const pairSummary = ROLE_VISUAL_ORDER.map(role =>
    `${roleLabel(role)} <strong>${esc(scoreLabel(scoreByRole[role], false, role))}</strong> (${sourceByRole[role]})`
  ).join(" · ");

  randomResult.innerHTML =
    `<strong>#${picked.displayIndex ?? picked.id} — ${esc(localizedPractice(picked))}</strong> (${esc(localizedCategory(picked.category))})${riskInfo} — ` +
    `${pairSummary}.` +
    `${fantasyBanner}${cycleText}<div class="random-result-actions"><button class="random-session-btn" data-random-session-id="${picked.id}" type="button" ${already || readOnly ? "disabled" : ""}>${already ? t("alreadyInSession") : addLabel}</button></div>`;
  updateCompatibilityIndicator();
}

function getSafety() {
  return {
    slowWord: document.getElementById("slowWord").value,
    safeWord: document.getElementById("safeWord").value,
    slowSignal: document.getElementById("slowSignal").value,
    stopSignal: document.getElementById("stopSignal").value,
    marks: document.getElementById("marks").value,
    hardLimits: document.getElementById("hardLimits").value,
    aftercare: document.getElementById("aftercare").value,
    media: document.getElementById("media").value,
    noIntoxication: document.getElementById("noIntoxication").checked,
    nextDayDebrief: document.getElementById("nextDayDebrief").checked,
    stopImmediate: document.getElementById("stopImmediate").checked,
  };
}
function applySafety(s) {
  if (!s || typeof s !== "object") return;

  // Migration v32 -> v33 :
  // l'ancien signal non verbal unique est considéré comme le signal d'arrêt.
  const migrated = {
    ...s,
    slowSignal: typeof s.slowSignal === "string" ? s.slowSignal : "",
    stopSignal: typeof s.stopSignal === "string"
      ? s.stopSignal
      : (typeof s.nonVerbal === "string" ? s.nonVerbal : "")
  };

  for (const [k,v] of Object.entries(migrated)) {
    const el = document.getElementById(k);
    if (!el) continue;
    if (el.type === "checkbox") el.checked = !!v;
    else el.value = v ?? "";
  }
}

function loadSafety() {
  try {
    const s = JSON.parse(localStorage.getItem(SAFETY_KEY) || "{}");
    applySafety(s);
  } catch(e) {}
}


function cleanSafetyText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function mergeSafetyText(localValue, incomingValue) {
  const local = cleanSafetyText(localValue);
  const incoming = cleanSafetyText(incomingValue);
  if (!incoming) return local;
  if (!local) return incoming;
  if (local === incoming) return local;

  const localParts = local.split(/\n+/).map(x => x.trim()).filter(Boolean);
  const incomingParts = incoming.split(/\n+/).map(x => x.trim()).filter(Boolean);
  const seen = new Set(localParts.map(x => x.toLocaleLowerCase()));
  const merged = [...localParts];

  for (const part of incomingParts) {
    const key = part.toLocaleLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(part);
    }
  }
  return merged.join("\n");
}

function mergeRestrictedChoice(localValue, incomingValue, ranking) {
  const local = cleanSafetyText(localValue);
  const incoming = cleanSafetyText(incomingValue);
  if (!incoming) return local;
  if (!local) return incoming;
  if (local === incoming) return local;

  const localRank = ranking[local] || 0;
  const incomingRank = ranking[incoming] || 0;
  if (!localRank && !incomingRank) return local;
  if (!localRank) return incoming;
  if (!incomingRank) return local;
  return incomingRank > localRank ? incoming : local;
}

function mergeSafetyPrudent(localSafety, incomingSafety) {
  const local = localSafety && typeof localSafety === "object" ? localSafety : {};
  const incoming = incomingSafety && typeof incomingSafety === "object" ? incomingSafety : {};
  const merged = {...local};
  const conflicts = [];

  // Les safewords/signaux ne sont jamais remplacés silencieusement.
  // Si les deux appareils ont une valeur différente, la valeur locale reste active.
  for (const key of ["slowWord","safeWord","slowSignal","stopSignal"]) {
    const a = cleanSafetyText(local[key]);
    const b = cleanSafetyText(incoming[key]);
    if (!b) {
      merged[key] = a;
    } else if (!a || a === b) {
      merged[key] = b;
    } else {
      merged[key] = a;
      conflicts.push(key);
    }
  }

  // Ces champs peuvent conserver les informations des deux appareils.
  merged.hardLimits = mergeSafetyText(local.hardLimits, incoming.hardLimits);
  merged.aftercare = mergeSafetyText(local.aftercare, incoming.aftercare);

  // Pour les choix de sécurité, la valeur la plus restrictive gagne.
  merged.marks = mergeRestrictedChoice(local.marks, incoming.marks, {
    "Oui":1,
    "Oui, légères":2,
    "Non":3
  });
  merged.media = mergeRestrictedChoice(local.media, incoming.media, {
    "Selon accord explicite au cas par cas":1,
    "Privées uniquement":2,
    "Aucune":3
  });

  // Une protection activée sur un appareil ne peut pas être désactivée par l'autre.
  for (const key of ["noIntoxication","nextDayDebrief","stopImmediate"]) {
    merged[key] = !!local[key] || incoming[key] === true;
  }

  const changed = JSON.stringify(local) !== JSON.stringify(merged);
  return { merged, conflicts, changed };
}

function safetyConflictLabel(key) {
  const labelsFr = {
    slowWord:"safeword ralentir",
    safeWord:"safeword arrêt",
    slowSignal:"signal ralentir",
    stopSignal:"signal arrêt"
  };
  const labelsEn = {
    slowWord:"slow-down safeword",
    safeWord:"stop safeword",
    slowSignal:"slow-down signal",
    stopSignal:"stop signal"
  };
  return (currentLang === "fr" ? labelsFr : labelsEn)[key] || key;
}

function previewSafetyMerge(payload) {
  if (!payload || Array.isArray(payload) || !payload.safety || typeof payload.safety !== "object") {
    return { conflicts:[], changed:false };
  }
  return mergeSafetyPrudent(getSafety(), payload.safety);
}


leftTable.addEventListener("click", handleTableClick);
rightTable.addEventListener("click", handleTableClick);

function handleTableClick(e) {
  const categoryToggle = e.target.closest("button[data-category-toggle]");
  if (categoryToggle) {
    const categoryName = categoryToggle.dataset.categoryToggle;
    if (collapsedCategories.has(categoryName)) collapsedCategories.delete(categoryName);
    else collapsedCategories.add(categoryName);
    saveCollapsedCategories();
    render();
    return;
  }

  const categoryScore = e.target.closest("button[data-category-score]");
  if (categoryScore) {
    if (categoryScore.disabled) return;
    applyCategoryScore(categoryScore.dataset.category, categoryScore.dataset.categoryScore);
    return;
  }

  if (readOnly) return;
  const btn = e.target.closest("button[data-action]");
  if (!btn || btn.disabled) return;

  const id = Number(btn.dataset.id);
  const item = itemsById.get(id);
  if (!item) return;

  const action = btn.dataset.action;

  if (action === "sessionToggle") {
    if (!isInSession(item)) {
      const blocked = sessionBlockReason(item);
      if (blocked) {
        window.alert(t("sessionLimitWarning"));
        return;
      }
    }
    toggleSessionItem(id);
    refreshItemRow(item);
    renderQuickFilters();
    return;
  }

  if (action === "priorSub") {
    if (!canEditRole("sub")) return;
    item.priorSub = !item.priorSub;
    if (!hasRoleExperience(item, "sub")) item.afterSub = null;

  } else if (action === "priorDom") {
    if (!canEditRole("dom")) return;
    item.priorDom = !item.priorDom;
    if (!hasRoleExperience(item, "dom")) item.afterDom = null;

  } else if (action === "doneTogether") {
    item.doneTogether = !item.doneTogether;
    // « Fait ensemble » et « Déjà fait avant » restent indépendants.
    if (!hasRoleExperience(item, "sub")) item.afterSub = null;
    if (!hasRoleExperience(item, "dom")) item.afterDom = null;

  } else if (["wantSub","afterSub"].includes(action)) {
    if (!canEditRole("sub")) return;
    if (action === "afterSub" && !hasRoleExperience(item, "sub")) return;
    if (btn.dataset.score === "unknown") {
      item[action] = null;
    } else {
      const n = Number(btn.dataset.score);
      item[action] = item[action] === n ? null : n;
    }

  } else if (["wantDom","afterDom"].includes(action)) {
    if (!canEditRole("dom")) return;
    if (action === "afterDom" && !hasRoleExperience(item, "dom")) return;
    if (btn.dataset.score === "unknown") {
      item[action] = null;
    } else {
      const n = Number(btn.dataset.score);
      item[action] = item[action] === n ? null : n;
    }
  }

  const sessionChangedByLimit = sanitizeSessionForLimits(true, true);
  if (sessionChangedByLimit) renderSessionPanel();

  refreshItemRow(item);
  if (action === "wantSub" || action === "wantDom") {
    refreshCategoryProgress(item.category);
  }

  let modifiedScope = "common";
  if (["priorSub","wantSub","afterSub"].includes(action)) {
    modifiedScope = "sub";
  } else if (["priorDom","wantDom","afterDom"].includes(action)) {
    modifiedScope = "dom";
  } else if (action === "doneTogether") {
    modifiedScope = "common";
  }
  const scopesToSave = new Set(Array.isArray(modifiedScope) ? modifiedScope : [modifiedScope]);
  scheduleSave([...scopesToSave]);
}

let searchRenderTimer = null;
search.addEventListener("input", () => {
  clearTimeout(searchRenderTimer);
  searchRenderTimer = setTimeout(render, 100);
});
[category, status, minFilterScore, riskFilter].forEach(el => el.addEventListener("input", render));

rightTable.addEventListener("input", (e) => {
  if (readOnly) return;
  const input = e.target.closest('textarea[data-action="notes"]');
  if (!input) return;
  const item = itemsById.get(Number(input.dataset.id));
  if (!item) return;
  item.notes = input.value;
  scheduleSave("common");
});

quickFilters.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-quick-filter]");
  if (!btn) return;
  activeQuickFilter = btn.getAttribute("data-quick-filter") || "";
  renderQuickFilters();
  render();
});

showSessionBtn.addEventListener("click", () => {
  activeQuickFilter = "session";
  search.value = "";
  category.value = "";
  status.value = "";
  minFilterScore.value = "";
  renderQuickFilters();
  render();
});

openSessionModeBtn.addEventListener("click", openSessionMode);
closeSessionModeBtn.addEventListener("click", closeSessionMode);
sessionMode.addEventListener("click", (e) => {
  if (e.target === sessionMode) closeSessionMode();
});
document.addEventListener("keydown", (e) => {
  if (!sessionMode.hidden) {
    if (e.key === "Escape") {
      e.preventDefault();
      closeSessionMode();
      return;
    }
    focusTrapIn(sessionMode.querySelector(".session-mode-panel"), e);
  }
});

sessionModeList.addEventListener("input", (e) => {
  if (readOnly) return;
  const note = e.target.closest("textarea[data-session-mode-notes]");
  if (!note) return;
  const item = itemsById.get(Number(note.dataset.sessionModeNotes));
  if (!item) return;
  item.notes = note.value;
  scheduleSave("common");
});

sessionModeList.addEventListener("change", (e) => {
  if (readOnly) return;
  const checkbox = e.target.closest("input[data-session-mode-together]");
  if (!checkbox) return;
  const item = itemsById.get(Number(checkbox.dataset.sessionModeTogether));
  if (!item) return;
  item.doneTogether = !!checkbox.checked;
  if (!hasRoleExperience(item, "sub")) item.afterSub = null;
  if (!hasRoleExperience(item, "dom")) item.afterDom = null;
  scheduleSave(["common","sub","dom"]);
  renderSessionMode();
  renderSessionPanel();
  renderQuickFilters();
});

resetSessionBtn.addEventListener("click", () => {
  if (readOnly || !sessionOrder.length) return;
  const message = currentLang === "fr"
    ? `Reset de la séance ? Les ${practiceCountText(sessionOrder.length)} sélectionnées seront retirées de la séance. Les notes et autres réponses ne seront pas effacées.`
    : `Reset the session? The ${practiceCountText(sessionOrder.length)} selected will be removed from the session. Ratings and other answers will not be deleted.`;
  const ok = window.confirm(message);
  if (!ok) return;

  sessionOrder = [];
  saveSessionOrder();
  if (activeQuickFilter === "session") activeQuickFilter = "";
  renderSessionPanel();
  renderQuickFilters();
  render();
  randomResult.innerHTML = `<strong>${t("sessionResetDone")}</strong> ${t("sessionNowEmpty")}`;
});

sessionList.addEventListener("click", (e) => {
  if (readOnly) return;
  const btn = e.target.closest("[data-session-action]");
  if (!btn || btn.disabled) return;
  const id = Number(btn.dataset.id);
  const action = btn.dataset.sessionAction;

  if (action === "remove") {
    const index = sessionOrder.indexOf(id);
    if (index >= 0) sessionOrder.splice(index, 1);
    saveSessionOrder();
  } else if (action === "up" || action === "down") {
    moveSessionItem(id, action);
  }

  renderSessionPanel();
  renderQuickFilters();
  render();
});

function applyCompatFilter(kind) {
  search.value = "";
  category.value = "";
  minFilterScore.value = "";
  activeQuickFilter = "";
  status.value = "";

  if (kind === "all") activeQuickFilter = "randomCriteria";
  if (kind === "bothTest") activeQuickFilter = "testBoth";
  if (kind === "new") {
    activeQuickFilter = "randomCriteria";
    status.value = "notTogether";
  }

  renderQuickFilters();
  render();
}

compatDetails.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-compat-filter]");
  if (!btn) return;
  applyCompatFilter(btn.dataset.compatFilter);
});

compatIndicator.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  applyCompatFilter("all");
});
compatIndicator.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    e.stopPropagation();
    applyCompatFilter("all");
  }
});


experienceSwitch.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-experience-mode]");
  if (!btn) return;
  const mode = btn.dataset.experienceMode;
  if (!["beginner","confirmed","advanced"].includes(mode)) return;
  experienceMode = mode;
  localStorage.setItem(EXPERIENCE_MODE_KEY, experienceMode);
  renderExperienceModeUI();
  renderQuickFilters();
  render();
  updateCompatibilityIndicator();
});

function collapseAllCategoriesNow() {
  collapsedCategories = new Set(allCatalogCategories);
  saveCollapsedCategories();
  render();
}

function expandAllCategoriesNow() {
  collapsedCategories.clear();
  saveCollapsedCategories();
  render();
}

quickCollapseAllCategoriesBtn.addEventListener("click", collapseAllCategoriesNow);
quickExpandAllCategoriesBtn.addEventListener("click", expandAllCategoriesNow);

randomBtn.addEventListener("click", pickRandomPractice);
randomResult.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-random-session-id]");
  if (!btn || btn.disabled || readOnly) return;
  const id = Number(btn.dataset.randomSessionId);
  const item = itemsById.get(Number(id));
  if (!item || isInSession(item)) return;
  const blocked = sessionBlockReason(item);
  if (blocked) {
    window.alert(t("sessionLimitWarning"));
    btn.disabled = true;
    return;
  }
  sessionOrder.push(id);
  saveSessionOrder();
  renderSessionPanel();
  renderQuickFilters();
  btn.disabled = true;
  btn.textContent = t("alreadyInSession");
});
resetRandomCycleBtn.addEventListener("click", () => clearRandomHistory(true));
[minRandomOne, minRandomOther, randomOnlyNew, randomIncludeNeutralNeutral, randomExcludeHighRisk, randomNoRepeat].forEach(el => {
  const onChange = () => {
    if (randomDrawHistory.size) { randomDrawHistory.clear(); saveRandomHistory(); }
    saveRandomPreferences();
    if (activeQuickFilter === "randomCriteria") render();
    else updateCompatibilityIndicator();
  };
  el.addEventListener("change", onChange);
});
columnControls.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-col-toggle]");
  if (!btn) return;
  const key = btn.getAttribute("data-col-toggle");
  visibleColumns[key] = !visibleColumns[key];
  saveVisibleColumns();
  renderColumnControls();
  render();
});



let syncingHorizontalScroll = false;

function syncHorizontalScroll(source, value) {
  if (syncingHorizontalScroll) return;
  syncingHorizontalScroll = true;

  if (source !== rightScroll) rightScroll.scrollLeft = value;
  if (source !== rightHeadWrap) rightHeadWrap.scrollLeft = value;
  if (source !== bottomHScroll) bottomHScroll.scrollLeft = value;

  requestAnimationFrame(() => { syncingHorizontalScroll = false; });
}

rightScroll.addEventListener("scroll", () => {
  syncHorizontalScroll(rightScroll, rightScroll.scrollLeft);
});

bottomHScroll.addEventListener("scroll", () => {
  syncHorizontalScroll(bottomHScroll, bottomHScroll.scrollLeft);
});

// Défilement horizontal "clic + glisser" sur toute la zone de droite.
// Un simple clic sur un bouton de note reste un clic normal.
// Le déplacement ne prend la main qu'après quelques pixels de mouvement.
let tableMouseDrag = {
  active: false,
  dragging: false,
  axis: null,
  allowX: false,
  startX: 0,
  startY: 0,
  startScrollLeft: 0,
  startScrollTop: 0,
  pointerId: null,
  suppressClick: false
};

tableBody.addEventListener("pointerdown", (e) => {
  // Tactile : on garde le swipe natif. Ce comportement est uniquement pour la souris.
  if (e.pointerType !== "mouse" || e.button !== 0) return;
  if (e.target.closest("textarea, input, select")) return;

  tableMouseDrag.active = true;
  tableMouseDrag.dragging = false;
  tableMouseDrag.axis = null;
  tableMouseDrag.allowX = !!e.target.closest(".right-pane");
  tableMouseDrag.startX = e.clientX;
  tableMouseDrag.startY = e.clientY;
  tableMouseDrag.startScrollLeft = rightScroll.scrollLeft;
  tableMouseDrag.startScrollTop = tableBody.scrollTop;
  tableMouseDrag.pointerId = e.pointerId;
  tableMouseDrag.suppressClick = false;
});

tableBody.addEventListener("pointermove", (e) => {
  if (!tableMouseDrag.active || e.pointerId !== tableMouseDrag.pointerId) return;

  const dx = e.clientX - tableMouseDrag.startX;
  const dy = e.clientY - tableMouseDrag.startY;
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);

  if (!tableMouseDrag.axis && Math.max(ax, ay) >= 6) {
    // Si le geste part à droite, on choisit naturellement l'axe dominant.
    // Depuis les colonnes fixes, seul le drag vertical est autorisé.
    if (tableMouseDrag.allowX && ax > ay) {
      tableMouseDrag.axis = "x";
    } else if (ay >= 6) {
      tableMouseDrag.axis = "y";
    } else {
      return;
    }

    tableMouseDrag.dragging = true;
    tableMouseDrag.suppressClick = true;
    tableBody.classList.add("dragging");
    try { tableBody.setPointerCapture(e.pointerId); } catch (_) {}
  }

  if (!tableMouseDrag.dragging) return;

  e.preventDefault();

  if (tableMouseDrag.axis === "x") {
    rightScroll.scrollLeft = tableMouseDrag.startScrollLeft - dx;
  } else if (tableMouseDrag.axis === "y") {
    tableBody.scrollTop = tableMouseDrag.startScrollTop - dy;
  }
});

function endTableMouseDrag(e) {
  if (!tableMouseDrag.active) return;
  if (e && tableMouseDrag.pointerId !== null && e.pointerId !== tableMouseDrag.pointerId) return;

  if (tableMouseDrag.pointerId !== null) {
    try { tableBody.releasePointerCapture(tableMouseDrag.pointerId); } catch (_) {}
  }

  tableBody.classList.remove("dragging");
  tableMouseDrag.active = false;
  tableMouseDrag.dragging = false;
  tableMouseDrag.axis = null;
  tableMouseDrag.pointerId = null;

  if (tableMouseDrag.suppressClick) {
    setTimeout(() => { tableMouseDrag.suppressClick = false; }, 0);
  }
}

tableBody.addEventListener("pointerup", endTableMouseDrag);
tableBody.addEventListener("pointercancel", endTableMouseDrag);
tableBody.addEventListener("lostpointercapture", endTableMouseDrag);

// Après un véritable drag, ne pas transformer le relâchement en clic sur une note/case.
tableBody.addEventListener("click", (e) => {
  if (!tableMouseDrag.suppressClick) return;
  e.preventDefault();
  e.stopPropagation();
}, true);


document.querySelectorAll(".safety input,.safety select,.safety textarea").forEach(el => {
  el.addEventListener("input", () => {
    if (readOnly) return;
    markModified("common");
    localStorage.setItem(SAFETY_KEY, JSON.stringify(getSafety()));
  });
});

let mobileCategoryRaf = 0;
tableBody.addEventListener("scroll", () => {
  if (!MOBILE_MQ.matches || mobileCategoryRaf) return;
  mobileCategoryRaf = requestAnimationFrame(() => {
    mobileCategoryRaf = 0;
    updateMobileCategoryBar();
  });
});

let resizeTimer = null;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    renderColumnControls();
    render();
  }, 80);
});


const cats = [...new Set(items.map(x => x.category))];

function renderCategoryControls() {
  const currentValue = category.value;
  category.innerHTML = "";

  const first = document.createElement("option");
  first.value = "";
  first.textContent = t("allCategories");
  category.appendChild(first);

  for (const c of cats) {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = localizedCategory(c);
    category.appendChild(opt);
  }
  category.value = cats.includes(currentValue) ? currentValue : "";

  categoryKey.innerHTML = "";
  const allCatBtn = document.createElement("button");
  allCatBtn.type = "button";
  allCatBtn.textContent = t("all");
  allCatBtn.style.background = "#E7E7E7";
  allCatBtn.addEventListener("click", () => {
    category.value = "";
    render();
  });
  categoryKey.appendChild(allCatBtn);

  for (const c of cats) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = localizedCategory(c);
    b.style.background = categoryColors[c] || "#E7E7E7";
    b.style.color = categoryTextColor(categoryColors[c] || "#E7E7E7");
    b.addEventListener("click", () => {
      category.value = c;
      render();
    });
    categoryKey.appendChild(b);
  }
}

function importChecklistJson(raw) {
  if (readOnly) throw new Error(t("readOnlyActive"));
  const payload = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!payload || typeof payload !== "object") throw new Error(t("invalidBackup"));

  const incomingVariant = !Array.isArray(payload) && typeof payload.variantId === "string" ? payload.variantId : "";
  if ((incomingVariant && incomingVariant !== BACKUP_VARIANT_ID) || (!incomingVariant && !ALLOW_UNTAGGED_BACKUPS)) {
    throw new Error(currentLang === "fr"
      ? "Cette sauvegarde appartient à une autre checklist. Aucune donnée n’a été importée."
      : "This backup belongs to a different checklist. No data was imported.");
  }

  const backupType = normalizeBackupType(payload);
  const versionNumber = !Array.isArray(payload) ? Number(payload.version) : NaN;
  const appVersionNumber = !Array.isArray(payload) ? Number((String(payload.appVersion || "").match(/^v(\d+)/) || [])[1]) : NaN;
  const sourceSupportsFantasy = (Number.isFinite(versionNumber) && versionNumber >= 25) || (Number.isFinite(appVersionNumber) && appVersionNumber >= 91);
  const sourceSupportsFavorite = (!Array.isArray(payload) && payload.scoreSchema === SCORE_SCHEMA_VALUE) || (Number.isFinite(appVersionNumber) && appVersionNumber >= 94);
  const incomingScore = value => validScore(value, !sourceSupportsFantasy, !sourceSupportsFavorite);
  const importedItems = Array.isArray(payload) ? payload : payload.items;
  if (!Array.isArray(importedItems)) throw new Error(currentLang === "fr" ? "La sauvegarde ne contient pas de liste de pratiques." : "The backup does not contain a practice list.");

  const byId = migrateDuplicateIdsInMap(new Map(importedItems.filter(x => x && x.id != null).map(x => [Number(x.id), x])), !sourceSupportsFantasy);
  let updated = 0;
  let safetyMergeResult = { merged:getSafety(), conflicts:[], changed:false, present:false };

  if (backupType === "full") {
    items = initialItems.map(base => {
      const current = itemsById.get(Number(base.id)) || normalizeItem(base, base);
      const incoming = byId.get(Number(base.id));
      if (!incoming) return normalizeItem(base, current);

      updated++;
      return normalizeItem(base, {
        ...current,
        ...incoming,
        wantSub: Object.prototype.hasOwnProperty.call(incoming, "wantSub")
          ? incomingScore(incoming.wantSub)
          : (incomingScore(incoming.interest) ?? validScore(current.wantSub)),
        wantDom: Object.prototype.hasOwnProperty.call(incoming, "wantDom")
          ? incomingScore(incoming.wantDom)
          : validScore(current.wantDom),
        priorSub: typeof incoming.priorSub === "boolean"
          ? incoming.priorSub
          : (typeof incoming.done === "boolean" ? (incoming.done && incoming.doneTogether !== true) : !!current.priorSub),
        priorDom: typeof incoming.priorDom === "boolean" ? incoming.priorDom : !!current.priorDom,
        testSub: typeof incoming.testSub === "boolean" ? incoming.testSub : undefined,
        testDom: typeof incoming.testDom === "boolean" ? incoming.testDom : undefined,
        starred: typeof incoming.starred === "boolean" ? incoming.starred : undefined,
        afterSub: Object.prototype.hasOwnProperty.call(incoming, "afterSub")
          ? incomingScore(incoming.afterSub)
          : (incomingScore(incoming.after) ?? validScore(current.afterSub)),
        afterDom: Object.prototype.hasOwnProperty.call(incoming, "afterDom")
          ? incomingScore(incoming.afterDom)
          : validScore(current.afterDom),
        doneTogether: typeof incoming.doneTogether === "boolean" ? incoming.doneTogether : !!current.doneTogether,
        notes: typeof incoming.notes === "string" ? incoming.notes : (current.notes || "")
      }, { legacyFive:!sourceSupportsFantasy, legacyFour:!sourceSupportsFavorite });
    });

    if (!Array.isArray(payload) && payload.safety && typeof payload.safety === "object") {
      localStorage.setItem(SAFETY_KEY, JSON.stringify(payload.safety));
      applySafety(payload.safety);
    }

    if (!Array.isArray(payload) && Array.isArray(payload.sessionOrder)) {
      const validIds = new Set(initialItems.map(x => Number(x.id)));
      sessionOrder = [...new Set(payload.sessionOrder.map(canonicalPracticeId).filter(id => validIds.has(id)))];
      saveSessionOrder(false);
      renderSessionPanel();
    }

    if (!Array.isArray(payload) && payload.columnPreferences && typeof payload.columnPreferences === "object") {
      for (const col of [...fixedColumns, ...scrollColumns]) {
        if (Object.prototype.hasOwnProperty.call(payload.columnPreferences, col.key)) {
          visibleColumns[col.key] = payload.columnPreferences[col.key] !== false;
        } else if (col.key === "priorSub" && Object.prototype.hasOwnProperty.call(payload.columnPreferences, "done")) {
          visibleColumns[col.key] = payload.columnPreferences.done !== false;
        }
      }
      saveVisibleColumns();
      renderColumnControls();
    }

    if (!Array.isArray(payload) && ["beginner","confirmed","advanced"].includes(payload.experienceMode)) {
      experienceMode = payload.experienceMode;
      localStorage.setItem(EXPERIENCE_MODE_KEY, experienceMode);
      renderExperienceModeUI();
    }

    if (!Array.isArray(payload) && Array.isArray(payload.collapsedCategories)) {
      collapsedCategories = new Set(
        migrateCategoryNames(payload.collapsedCategories).filter(name => allCatalogCategories.includes(name))
      );
      saveCollapsedCategories();
    }

    if (!Array.isArray(payload) && payload.randomPreferences && typeof payload.randomPreferences === "object") {
      applyRandomPreferences(payload.randomPreferences, true);
    }

    if (!Array.isArray(payload) && Array.isArray(payload.randomDrawHistory)) {
      const validIds = new Set(initialItems.map(x => Number(x.id)));
      randomDrawHistory = new Set(payload.randomDrawHistory.map(canonicalPracticeId).filter(id => validIds.has(id)));
      saveRandomHistory();
    }

    const sourceModifiedAt = incomingRelevantModifiedAt(payload, "full") || new Date().toISOString();
    lastModifiedAt = sourceModifiedAt;
    localStorage.setItem(LAST_MODIFIED_KEY, lastModifiedAt);

    if (!Array.isArray(payload) && payload.modifiedAtByScope && typeof payload.modifiedAtByScope === "object") {
      for (const scope of ["sub","dom","common"]) {
        modifiedScopes[scope] = typeof payload.modifiedAtByScope[scope] === "string"
          ? payload.modifiedAtByScope[scope]
          : sourceModifiedAt;
      }
    } else {
      modifiedScopes = { sub:sourceModifiedAt, dom:sourceModifiedAt, common:sourceModifiedAt };
    }
    saveModifiedScopes();

  } else {
    // Sauvegarde individuelle : elle ne touche QUE les champs appartenant au rôle.
    // "Fait ensemble" est fusionné en OR : un faux importé n'efface jamais un vrai local.
    let sharedPromoted = false;
    items = initialItems.map(base => {
      const current = itemsById.get(Number(base.id)) || normalizeItem(base, base);
      const incoming = byId.get(Number(base.id));
      if (!incoming) return normalizeItem(base, current);

      updated++;
      const mergedDoneTogether = !!current.doneTogether || incoming.doneTogether === true;
      if (!current.doneTogether && incoming.doneTogether === true) sharedPromoted = true;

      if (backupType === "sub") {
        const hasWant = Object.prototype.hasOwnProperty.call(incoming, "wantSub");
        const hasAfter = Object.prototype.hasOwnProperty.call(incoming, "afterSub");
        const nextWantSub = hasWant ? incomingScore(incoming.wantSub) : validScore(current.wantSub);
        const incomingPriorSub = typeof incoming.priorSub === "boolean"
          ? incoming.priorSub
          : (typeof incoming.done === "boolean" ? (incoming.done && incoming.doneTogether !== true) : !!current.priorSub);
        return normalizeItem(base, {
          ...current,
          wantSub: nextWantSub,
          priorSub: incomingPriorSub,
          testSub: typeof incoming.testSub === "boolean" ? incoming.testSub : undefined,
          starred: typeof incoming.starred === "boolean" ? incoming.starred : undefined,
          doneTogether: mergedDoneTogether,
          afterSub: hasAfter ? incomingScore(incoming.afterSub) : validScore(current.afterSub)
        }, { legacyFive:!sourceSupportsFantasy, legacyFour:!sourceSupportsFavorite });
      }

      const hasWant = Object.prototype.hasOwnProperty.call(incoming, "wantDom");
      const hasAfter = Object.prototype.hasOwnProperty.call(incoming, "afterDom");
      const nextWantDom = hasWant ? incomingScore(incoming.wantDom) : validScore(current.wantDom);
      const incomingPriorDom = typeof incoming.priorDom === "boolean" ? incoming.priorDom : !!current.priorDom;
      return normalizeItem(base, {
        ...current,
        wantDom: nextWantDom,
        priorDom: incomingPriorDom,
        testDom: typeof incoming.testDom === "boolean" ? incoming.testDom : undefined,
        doneTogether: mergedDoneTogether,
        afterDom: hasAfter ? incomingScore(incoming.afterDom) : validScore(current.afterDom)
      }, { legacyFive:!sourceSupportsFantasy, legacyFour:!sourceSupportsFavorite });
    });

    if (!Array.isArray(payload) && payload.safety && typeof payload.safety === "object") {
      safetyMergeResult = {
        ...mergeSafetyPrudent(getSafety(), payload.safety),
        present:true
      };
      if (safetyMergeResult.changed) {
        localStorage.setItem(SAFETY_KEY, JSON.stringify(safetyMergeResult.merged));
        applySafety(safetyMergeResult.merged);
      }
    }

    const scopeModifiedAt = incomingRelevantModifiedAt(payload, backupType) || new Date().toISOString();
    modifiedScopes[backupType] = scopeModifiedAt;
    if (sharedPromoted) {
      const commonTime = modifiedScopes.common ? new Date(modifiedScopes.common).getTime() : NaN;
      const sourceTime = new Date(scopeModifiedAt).getTime();
      if (!Number.isFinite(commonTime) || (Number.isFinite(sourceTime) && sourceTime > commonTime)) {
        modifiedScopes.common = scopeModifiedAt;
      }
    }
    saveModifiedScopes();

    // L'état local est maintenant une combinaison de plusieurs sources.
    // On ne fait jamais reculer la date globale à cause d'un import individuel.
    const localTime = lastModifiedAt ? new Date(lastModifiedAt).getTime() : NaN;
    const incomingTime = new Date(scopeModifiedAt).getTime();
    if (!Number.isFinite(localTime) || (Number.isFinite(incomingTime) && incomingTime > localTime)) {
      lastModifiedAt = scopeModifiedAt;
      localStorage.setItem(LAST_MODIFIED_KEY, lastModifiedAt);
    }

    if (safetyMergeResult.changed) {
      markModified("common");
    }
  }

  rebuildItemIndexes();
  const removedLimitedFromSession = sanitizeSessionForLimits(true, false);
  if (removedLimitedFromSession) markModified("common");
  save(false);
  renderRoleUI();
  renderSessionPanel();
  render();
  renderQuickFilters();

  return {
    updated,
    backupType,
    exportedByRole: !Array.isArray(payload) && ["sub","dom"].includes(payload.exportedByRole)
      ? payload.exportedByRole
      : (backupType === "sub" || backupType === "dom" ? backupType : null),
    exportedAt: !Array.isArray(payload) && typeof payload.exportedAt === "string" ? payload.exportedAt : null,
    lastModifiedAt: incomingRelevantModifiedAt(payload, backupType) || null,
    appVersion: !Array.isArray(payload) && typeof payload.appVersion === "string" ? payload.appVersion : null,
    safetyMerged: backupType !== "full" && safetyMergeResult.present,
    safetyConflicts: backupType !== "full" ? [...safetyMergeResult.conflicts] : []
  };
}

importJsonBtn.addEventListener("click", () => {
  if (readOnly) {
    randomResult.innerHTML = `<strong>${t("readOnlyActive")}</strong> ${t("disableRestore")}`;
    return;
  }
  importJsonFile.value = "";
  importJsonFile.click();
});


importJsonFile.addEventListener("change", async () => {
  if (readOnly) return;
  const file = importJsonFile.files && importJsonFile.files[0];
  if (!file) return;

  try {
    const raw = await file.text();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") throw new Error(t("invalidBackup"));

    const incomingVariant = !Array.isArray(parsed) && typeof parsed.variantId === "string" ? parsed.variantId : "";
    if ((incomingVariant && incomingVariant !== BACKUP_VARIANT_ID) || (!incomingVariant && !ALLOW_UNTAGGED_BACKUPS)) {
      throw new Error(currentLang === "fr"
        ? "Cette sauvegarde appartient à une autre checklist. Aucune donnée n’a été importée."
        : "This backup belongs to a different checklist. No data was imported.");
    }

    const backupType = normalizeBackupType(parsed);
    const importedItems = Array.isArray(parsed) ? parsed : parsed.items;
    if (!Array.isArray(importedItems)) {
      throw new Error(currentLang === "fr"
        ? "La sauvegarde ne contient pas de liste de pratiques."
        : "The backup does not contain a practice list.");
    }

    const ok = window.confirm(roleBackupConfirmationText(backupType, importedItems.length, parsed));
    if (!ok) {
      randomResult.innerHTML = `<strong>${t("restoreCancelled")}</strong> ${t("noDataChanged")}`;
      return;
    }

    const result = importChecklistJson(parsed);
    const label = backupTypeLabel(result.backupType);

    setLastExchange({
      type:"import",
      backupType:result.backupType,
      role:result.exportedByRole,
      exportedAt:result.exportedAt,
      lastModifiedAt:result.lastModifiedAt,
      appVersion:result.appVersion || ""
    });

    const when = formatDateTime(result.lastModifiedAt || result.exportedAt);
    const mergeText = currentLang === "fr"
      ? (result.backupType === "full"
          ? "restauration complète"
          : "fusion ciblée + sécurité, sans modifier l’autre rôle")
      : (result.backupType === "full"
          ? "full restore"
          : "targeted merge + safety, without changing the other role");

    const conflictText = result.safetyConflicts && result.safetyConflicts.length
      ? (currentLang === "fr"
          ? ` · ⚠️ ${result.safetyConflicts.length} conflit(s) sécurité : valeur locale conservée`
          : ` · ⚠️ ${result.safetyConflicts.length} safety conflict(s): local value kept`)
      : "";

    randomResult.innerHTML = currentLang === "fr"
      ? `<strong>${label} restaurée :</strong> ${practiceCountText(result.updated)} · ${mergeText}${conflictText} · modifiée ${when} · ${esc(result.appVersion || t("oldVersion"))}.`
      : `<strong>${label} restored:</strong> ${practiceCountText(result.updated)} · ${mergeText}${conflictText} · modified ${when} · ${esc(result.appVersion || t("oldVersion"))}.`;
  } catch (err) {
    console.error(err);
    randomResult.innerHTML = `<strong>${t("restoreImpossible")}</strong> ${esc(err && err.message ? err.message : t("invalidBackup"))}`;
  }
});

function clearSafetyForm() {
  const textIds = ["slowWord","safeWord","slowSignal","stopSignal","hardLimits","aftercare"];
  for (const id of textIds) {
    const el = document.getElementById(id);
    if (el) el.value = "";
  }

  const selectIds = ["marks","media"];
  for (const id of selectIds) {
    const el = document.getElementById(id);
    if (el) el.value = "";
  }

  for (const id of ["noIntoxication","nextDayDebrief","stopImmediate"]) {
    const el = document.getElementById(id);
    if (el) el.checked = false;
  }
}


resetChecklistBtn.addEventListener("click", () => {
  if (readOnly) {
    randomResult.innerHTML = `<strong>${t("readOnlyActive")}</strong> ${t("disableReset")}`;
    return;
  }

  const message = currentLang === "fr"
    ? "Réinitialiser la checklist ? Toutes les préférences, expériences antérieures, notes après expérience, notes communes, l’historique de tirage, la sélection de séance et les réglages de sécurité seront effacés. Cette action est irréversible sans sauvegarde."
    : "Reset the checklist? All preferences, prior-experience flags, after-experience ratings, shared notes, random-draw history, session selection and safety settings will be deleted. This cannot be undone without a backup.";

  const ok = window.confirm(message);
  if (!ok) return;

  clearTimeout(saveTimer);
  items = initialItems.map(base => normalizeItem(base, {}));
  rebuildItemIndexes();
  markModified(["sub","dom","common"]);
  save(false);

  localStorage.removeItem(SAFETY_KEY);
  clearSafetyForm();

  sessionOrder = [];
  localStorage.removeItem(SESSION_KEY);
  randomDrawHistory.clear();
  localStorage.removeItem(RANDOM_HISTORY_KEY);
  renderSessionPanel();

  search.value = "";
  category.value = "";
  status.value = "";
  minFilterScore.value = "";
  riskFilter.value = "";
  activeQuickFilter = "";
  renderQuickFilters();

  randomResult.innerHTML = currentLang === "fr"
    ? `<strong>${t("checklistResetDone")}</strong> Toutes les réponses, la sélection de séance et les réglages de sécurité ont été effacés.`
    : `<strong>${t("checklistResetDone")}</strong> All answers, the session selection and safety settings have been cleared.`;
  render();
});

function download(filename, content, type) {
  const blob = new Blob([content], {type});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
}

function buildBackupPayload(type) {
  const exportedAt = new Date().toISOString();
  const scopeModifiedAt = (type === "sub" || type === "dom")
    ? (modifiedScopes[type] || lastModifiedAt || exportedAt)
    : (lastModifiedAt || exportedAt);

  let backupItems;

  if (type === "sub") {
    backupItems = items.map(item => ({
      id:item.id,
      wantSub:Number.isInteger(item.wantSub) ? item.wantSub : null,
      priorSub:!!item.priorSub,
      doneTogether:!!item.doneTogether,
      afterSub:Number.isInteger(item.afterSub) ? item.afterSub : null
    }));
  } else if (type === "dom") {
    backupItems = items.map(item => ({
      id:item.id,
      wantDom:Number.isInteger(item.wantDom) ? item.wantDom : null,
      priorDom:!!item.priorDom,
      doneTogether:!!item.doneTogether,
      afterDom:Number.isInteger(item.afterDom) ? item.afterDom : null
    }));
  } else {
    backupItems = items.map(compactUserState);
  }

  const payload = {
    version:28,
    appVersion:APP_VERSION,
    variantId:BACKUP_VARIANT_ID,
    scoreSchema:SCORE_SCHEMA_VALUE,
    backupType:type,
    exportedAt,
    lastModifiedAt:scopeModifiedAt,
    exportedByRole:type === "sub" || type === "dom" ? type : currentRole,
    items:backupItems
  };

  if (type === "sub" || type === "dom") {
    payload.scopeModifiedAt = scopeModifiedAt;
    payload.safety = getSafety();
  } else {
    payload.modifiedAtByScope = {...modifiedScopes};
    payload.sessionOrder = [...sessionOrder];
    payload.safety = getSafety();
    payload.columnPreferences = {...visibleColumns};
    payload.experienceMode = experienceMode;
    payload.collapsedCategories = [...collapsedCategories];
    payload.randomPreferences = getRandomPreferences();
    payload.randomDrawHistory = [...randomDrawHistory];
  }

  return payload;
}


function exportBackup(type) {
  clearTimeout(saveTimer);
  save(false);

  const payload = buildBackupPayload(type);
  const d = new Date();
  const dateStamp = [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0")
  ].join("-");
  const timeStamp = [
    String(d.getHours()).padStart(2, "0"),
    String(d.getMinutes()).padStart(2, "0")
  ].join("-");

  const label = backupTypeLabel(type);
  let fileLabel;
  if (type === "full") fileLabel = currentLang === "fr" ? "COMPLETE" : "FULL";
  else if (type === "sub") fileLabel = CHECKLIST_VARIANT.fileRoleLabels[currentLang].sub;
  else fileLabel = CHECKLIST_VARIANT.fileRoleLabels[currentLang].dom;

  download(`${CHECKLIST_VARIANT.backupFilenamePrefix}_${fileLabel}_${dateStamp}_${timeStamp}.json`,
    JSON.stringify(payload,null,2), "application/json");

  setLastExchange({
    type:"export",
    backupType:type,
    role:type === "sub" || type === "dom" ? type : currentRole,
    exportedAt:payload.exportedAt,
    lastModifiedAt:payload.lastModifiedAt,
    appVersion:APP_VERSION
  });

  if (currentLang === "fr") {
    const content = type === "full" ? "toutes les données" : `données ${label} + Fait ensemble + sécurité`;
    randomResult.innerHTML =
      `<strong>Sauvegarde ${label} créée :</strong> ${content} · dernière modification ${formatDateTime(payload.lastModifiedAt)} · ${APP_VERSION}.`;
  } else {
    const content = type === "full" ? "all data" : `${label} data + Done together + safety`;
    randomResult.innerHTML =
      `<strong>${label} backup created:</strong> ${content} · last modified ${formatDateTime(payload.lastModifiedAt)} · ${APP_VERSION}.`;
  }
}

exportFullBtn.addEventListener("click", () => exportBackup("full"));
exportSubBtn.addEventListener("click", () => exportBackup("sub"));
exportDomBtn.addEventListener("click", () => exportBackup("dom"));

loadSafety();
applyStaticLanguage();
renderLanguageButtons();
updateHelpLanguage();
updateAdultInfoLanguage();
renderCategoryControls();
renderExperienceModeUI();
renderExchangeInfo();
renderRoleUI();
renderColumnControls();
renderQuickFilters();
renderSessionPanel();
renderHeads();
render();
updateCompatibilityIndicator();
