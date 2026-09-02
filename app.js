
const CHECKLIST_DATA = window.CHECKLIST_DATA;
const V2_STORAGE = window.CHECKLIST_V2_STORAGE;
const INTERACTION_MODEL = window.CHECKLIST_INTERACTION_MODEL;
const UNIFIED_CATALOG = window.CHECKLIST_CATALOG;
const PROFILE_API = window.CHECKLIST_PROFILE_API;
if (!CHECKLIST_DATA || !V2_STORAGE || !INTERACTION_MODEL || !UNIFIED_CATALOG) throw new Error("Checklist configuration missing.");
let runtimeProfileCache = null;
function runtimeProfile(){ return runtimeProfileCache || (runtimeProfileCache = PROFILE_API?.get?.() || {}); }
const OFFICIAL_CATALOG_ENTITIES = UNIFIED_CATALOG.entities || [];
const CATALOG_RUNTIME = window.CHECKLIST_CATALOG_RUNTIME?.create?.({
  officialEntities: OFFICIAL_CATALOG_ENTITIES,
  getCustomEntities: () => V2_STORAGE.getCustomEntities?.() || []
});
if (!CATALOG_RUNTIME) throw new Error("Checklist catalog runtime missing.");
const categoryColors = CHECKLIST_DATA.categoryColors;
const CUSTOM_CATEGORY = "Personnalisé";
const CUSTOM_CATEGORY_COLOR = "#8b6678";
const APP_VERSION = "V1.1";
const showIncompatiblePractices = document.getElementById("showIncompatiblePractices");
const SCORE_RESULT_KEY_BY_VALUE = Object.freeze({
  0:"limit",
  1:"later",
  2:"compatible",
  3:"strong",
  4:"excellent",
  5:"fantasy"
});

const LANG_KEY = window.CHECKLIST_SITE.languageKey;
const CATEGORY_EN = CHECKLIST_DATA.categoryEn;
const I18N = CHECKLIST_DATA.i18n;
const ONBOARDING_KEY = window.CHECKLIST_SITE.onboardingKey || "bdsmChecklistSite_firstUseGuide_v1";
const MERGE_REVIEW_KEY = "bdsmChecklistSite_mergeReviewPending_v1";
let onboardingModal = null;
let onboardingDialog = null;
let mergeReviewBanner = null;
let currentLang = (() => {
  const saved = localStorage.getItem(LANG_KEY);
  if (saved === "fr" || saved === "en") return saved;
  const systemLang = String(navigator.language || "").toLowerCase();
  return systemLang.startsWith("fr") ? "fr" : "en";
})();

function t(key) {
  return (I18N[currentLang] && I18N[currentLang][key]) ?? I18N.fr[key] ?? key;
}

function isFrench() {
  return currentLang === "fr";
}

function langText(fr, en) {
  return isFrench() ? fr : en;
}

function localizedPersonFallback(person) {
  return person === "personB" ? langText("Personne B", "Person B") : langText("Personne A", "Person A");
}

function preferenceScore(state) {
  return Number.isInteger(state?.preference) ? state.preference : null;
}

function scoreResultKey(score) {
  return Number.isInteger(score) ? (SCORE_RESULT_KEY_BY_VALUE[score] || "incomplete") : "incomplete";
}

function localizedCategory(categoryName) {
  if (categoryName === CUSTOM_CATEGORY) return langText(CUSTOM_CATEGORY, "Custom");
  return currentLang === "en" ? (CATEGORY_EN[categoryName] || categoryName) : categoryName;
}

function compareCategories(a, b) {
  if (a === CUSTOM_CATEGORY) return b === CUSTOM_CATEGORY ? 0 : 1;
  if (b === CUSTOM_CATEGORY) return -1;
  return localizedCategory(a).localeCompare(localizedCategory(b), currentLang);
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
  applyProfileLabels();

}
function applyProfileLabels() {
  const p = runtimeProfile();
  if (!p) return;
  const nameA = p.personA?.name || localizedPersonFallback("personA");
  const nameB = p.personB?.name || localizedPersonFallback("personB");
  const a = document.getElementById("exportPersonA"), b = document.getElementById("exportPersonB");
  if (a) {
    a.textContent = nameA;
    a.setAttribute('aria-label', nameA);
    a.title = nameA;
  }
  if (b) {
    b.textContent = nameB;
    b.setAttribute('aria-label', nameB);
    b.title = nameB;
  }
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

  const copy = isFrench()
    ? { kicker:"Aide", title:"Comprendre la checklist", open:"Aide", close:"Fermer" }
    : { kicker:"Help", title:"Understand the checklist", open:"Help", close:"Close" };

  helpKicker.textContent = copy.kicker;
  helpTitle.textContent = copy.title;
  openHelpBtn.setAttribute("aria-label", copy.open);
  openHelpBtn.title = copy.open;
  closeHelpBtn.setAttribute("aria-label", copy.close);
  closeHelpBtn.title = copy.close;
}


function updateAdultInfoLanguage() {
  if (adultGate) adultGate.setAttribute("aria-labelledby", isFrench() ? "adultGateTitleFr" : "adultGateTitleEn");
  if (infoModalTitle) infoModalTitle.textContent = langText("Informations", "Information");
  if (closeInfoModalBtn) {
    closeInfoModalBtn.setAttribute("aria-label", langText("Fermer", "Close"));
    closeInfoModalBtn.title = langText("Fermer", "Close");
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
  } catch (_) {}
  document.documentElement.classList.remove("adult-gate-required");
  if (adultGate) adultGate.setAttribute("aria-hidden", "true");
  setAppBackgroundInert(false);
  requestAnimationFrame(showFirstUseGuideIfNeeded);
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
  for (const el of [document.querySelector("header"), document.querySelector("main"), document.querySelector("footer.site-footer"), document.querySelector(".merge-review-banner")]) {
    if (el && "inert" in el) el.inert = !!active;
  }
}

function openHelpModal() {
  if (!helpModal || !helpBody || !closeHelpBtn) return;
  updateHelpLanguage();
  helpModal.hidden = false;
  helpModal.setAttribute("aria-hidden", "false");
  openHelpBtn?.setAttribute("aria-expanded", "true");
  document.body.classList.add("help-open");
  setAppBackgroundInert(true);
  helpBody.scrollTop = 0;
  requestAnimationFrame(() => closeHelpBtn.focus());
}

function closeHelpModal() {
  if (!helpModal) return;
  helpModal.hidden = true;
  helpModal.setAttribute("aria-hidden", "true");
  openHelpBtn?.setAttribute("aria-expanded", "false");
  document.body.classList.remove("help-open");
  setAppBackgroundInert(false);
  if (openHelpBtn) openHelpBtn.focus();
}

function setLanguage(lang, persist = true) {
  const next = lang === "fr" ? "fr" : "en";
  if (next === currentLang) {
    if (persist && localStorage.getItem(LANG_KEY) !== currentLang) localStorage.setItem(LANG_KEY, currentLang);
    return;
  }
  currentLang = next;
  if (persist) localStorage.setItem(LANG_KEY, currentLang);

  applyStaticLanguage();
  if(minFilterScore) minFilterScore.dataset.editorLang="";
  renderLanguageButtons();
  updateHelpLanguage();
  if(customPracticeModal&&!customPracticeModal.hidden){
    const stored=customPracticeId?.value?customPracticeRecord(customPracticeId.value):null;
    updateCustomPracticeModalLanguage({...stored,anatomyBySlot:{dominant:customAnatomySelection('dominant'),submissive:customAnatomySelection('submissive')}});
  }
  updateAdultInfoLanguage();
  updateFirstUseGuideLanguage();
  updateMergeReviewBannerLanguage();
  renderCategoryControls();
  renderExperienceModeUI();
  renderRoleUI();
  renderExchangeInfo();
  renderSessionPanel();
  render();
  renderLastRandomPick();
}

const SCORE_UI = window.CHECKLIST_SCORE_UI?.create?.({
  getLang: () => currentLang,
  translate: t,
  setBackgroundInert: setAppBackgroundInert
});
if (!SCORE_UI) throw new Error("Checklist score UI missing.");
const {
  SCORE_BUTTON_ORDER,
  scoreButtonLabel,
  scoreChoiceTitle,
  riskBadge,
  openRiskInfo,
  closeRiskInfo
} = SCORE_UI;


let derivedDataRevision = 0;
let randomEligibilityCache = { revision:-1, filterKey:"", value:null };
let editorModelCache = { revision:-1, lang:'', person:'', profileKey:'', value:null };
let readerModelCache = { revision:-1, lang:'', profileKey:'', value:null };
let activeReaderCandidatesCache = { revision:-1, filterKey:"", value:null };
let randomOptionsRevision = 0;
function invalidateRandomEligibility() {
  randomOptionsRevision++;
  randomEligibilityCache.revision = -1;
}
function invalidateDerivedData() {
  derivedDataRevision++;
  editorModelCache.revision = -1;
  readerModelCache.revision = -1;
  activeReaderCandidatesCache.revision = -1;
  activeReaderCandidatesCache.value = null;
}

// Sessions are stored as practice + logical variant.
let variantSessionOrder = (() => {
  try { return Array.isArray(V2_STORAGE.getAllSessionEntries?.()) ? V2_STORAGE.getAllSessionEntries() : []; }
  catch (_) { return []; }
})();
let variantSessionKeySet = new Set(variantSessionOrder.map(entry => `${entry.practiceId}|${entry.variant}`));
let sessionOnlyFilter = false;

let activeEditPerson = V2_STORAGE.getDisplay("activeEditPerson", "person-a", false) === "person-b" ? "person-b" : "person-a";
let isReadingMode = V2_STORAGE.getDisplay("readOnly", false, false) === true;

let experienceMode = (() => {
  const saved = V2_STORAGE.getDisplay("experienceMode", "beginner", false);
  return ["beginner","confirmed","advanced"].includes(saved) ? saved : "beginner";
})();

/* Category fold state -------------------------------------------------------
   One state container per view. The legacy shared key is read once for
   migration only, then removed. Rendering never relies on a mutable pointer. */
const CATEGORY_COLLAPSE_KEYS = Object.freeze({
  edit:"collapsedCategoriesEdit",
  read:"collapsedCategoriesRead"
});
const LEGACY_COLLAPSED_CATEGORIES = V2_STORAGE.getDisplay("collapsedCategories", undefined);

function normalizeCollapsedCategories(raw) {
  const valid = new Set(CATALOG_RUNTIME.categoryNames());
  if (raw === undefined || raw === null) return new Set(valid);
  if (!Array.isArray(raw)) return new Set();
  return new Set(raw.filter(name => valid.has(name)));
}
function loadCollapsedCategories(mode) {
  const key = CATEGORY_COLLAPSE_KEYS[mode];
  const saved = V2_STORAGE.getDisplay(key, undefined);
  return normalizeCollapsedCategories(saved === undefined ? LEGACY_COLLAPSED_CATEGORIES : saved);
}
const categoryCollapseState = {
  edit:loadCollapsedCategories("edit"),
  read:loadCollapsedCategories("read")
};
/* Migration is complete: never write the ambiguous shared key again. */
if (LEGACY_COLLAPSED_CATEGORIES !== undefined) V2_STORAGE.setDisplay("collapsedCategories", undefined);

function currentCategoryCollapseMode() {
  return isReadingMode ? "read" : "edit";
}
function collapsedCategorySet(mode = currentCategoryCollapseMode()) {
  return categoryCollapseState[mode === "read" ? "read" : "edit"];
}
function isCategoryCollapsed(categoryName, mode = currentCategoryCollapseMode()) {
  return collapsedCategorySet(mode).has(categoryName);
}
function persistCollapsedCategories(mode = currentCategoryCollapseMode()) {
  V2_STORAGE.setDisplay(CATEGORY_COLLAPSE_KEYS[mode], [...collapsedCategorySet(mode)]);
}
function replaceCollapsedCategories(mode, names) {
  const target = collapsedCategorySet(mode);
  target.clear();
  for (const name of names) target.add(name);
  persistCollapsedCategories(mode);
}
function setCategoryCollapsedState(categoryName, collapsed, mode = currentCategoryCollapseMode()) {
  const target = collapsedCategorySet(mode);
  if (collapsed) target.add(categoryName);
  else target.delete(categoryName);
  persistCollapsedCategories(mode);
  return collapsed;
}
function pruneCollapsedCategoryState() {
  const valid = new Set(CATALOG_RUNTIME.categoryNames());
  for (const mode of ["edit","read"]) {
    const target = collapsedCategorySet(mode);
    for (const name of [...target]) if (!valid.has(name)) target.delete(name);
    persistCollapsedCategories(mode);
  }
}
function refreshCatalogRuntime() {
  CATALOG_RUNTIME.refresh();
  catalogLevelCountsCache = null;
  pruneCollapsedCategoryState();
  try { localizedScenarioInfoCache.clear(); } catch (_) {}
  invalidateDerivedData();
  invalidateRandomEligibility();
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


function catalogEntityLevel(entity) {
  const levels = Object.values(entity?.scenarios || {}).map(block => Number(block?.level || 3)).filter(level => level >= 1 && level <= 3);
  return levels.length ? Math.min(...levels) : 3;
}
let catalogLevelCountsCache = null;
function catalogCumulativeLevelCounts() {
  if (catalogLevelCountsCache) return catalogLevelCountsCache;
  const exact = {1:0, 2:0, 3:0};
  for (const entity of CATALOG_RUNTIME.all()) exact[catalogEntityLevel(entity)]++;
  catalogLevelCountsCache = Object.freeze({1:exact[1], 2:exact[1] + exact[2], 3:exact[1] + exact[2] + exact[3]});
  return catalogLevelCountsCache;
}

function renderExperienceModeUI() {
  if (!experienceSwitch) return;
  const modes = [
    ["beginner", 1],
    ["confirmed", 2],
    ["advanced", 3],
  ];
  const counts = catalogCumulativeLevelCounts();
  const total = counts[3] || CATALOG_RUNTIME.all().length;
  experienceSwitch.querySelectorAll("[data-experience-mode]").forEach(btn => {
    const mode = btn.dataset.experienceMode;
    const tuple = modes.find(x => x[0] === mode);
    const max = tuple ? tuple[1] : 3;
    const count = counts[max] || total;
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

const search = document.getElementById("search");
const category = document.getElementById("category");
const status = document.getElementById("status");
const minFilterScore = document.getElementById("minFilterScore");
const readerIncludeFantasy = document.getElementById("readerIncludeFantasy");
const readerFilterDock = document.getElementById("readerFilterDock");
const readerTopDock = document.getElementById("readerTopDock");
const readerFilterSummary = document.getElementById("readerFilterSummary");
const readerFilterCompatCount = document.getElementById("readerFilterCompatCount");
const readerHeaderDs = document.getElementById("readerHeaderDs");
const readerHeaderDsButtons = [...document.querySelectorAll("[data-reader-header-ds]")];
const readerMinimumOneChips = document.getElementById("readerMinimumOneChips");
const readerMinimumTwoChips = document.getElementById("readerMinimumTwoChips");
const riskFilter = document.getElementById("riskFilter");
const randomOnlyNew = document.getElementById("randomOnlyNew");
const randomIncludeNeutralNeutral = document.getElementById("randomIncludeNeutralNeutral");
const randomExcludeHighRisk = document.getElementById("randomExcludeHighRisk");
const randomNoRepeat = document.getElementById("randomNoRepeat");
const resetRandomCycleBtn = document.getElementById("resetRandomCycle");
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
const importJsonBtn = document.getElementById("importJson");
const importJsonFile = document.getElementById("importJsonFile");
const shareCoupleConfigBtn = document.getElementById("shareCoupleConfig");
const exportFullBtn = document.getElementById("exportFull");
const exportPersonABtn = document.getElementById("exportPersonA");
const exportPersonBBtn = document.getElementById("exportPersonB");
const resetChecklistBtn = document.getElementById("resetChecklist");
const addCustomPracticeBtn = document.getElementById("addCustomPractice");
const customPracticeModal = document.getElementById("customPracticeModal");
const customPracticeForm = document.getElementById("customPracticeForm");
const customPracticeTitle = document.getElementById("customPracticeTitle");
const customPracticeName = document.getElementById("customPracticeName");
const customPracticeDescription = document.getElementById("customPracticeDescription");
const customPracticeRisk = document.getElementById("customPracticeRisk");
const customPracticeId = document.getElementById("customPracticeId");
let customPracticeOpener = null;
const safetyFields = [...document.querySelectorAll(".safety input,.safety select,.safety textarea")];
// une seule colonne fixe (Pratique), sans colonne Catégorie.
const roleButtons = [...document.querySelectorAll("[data-person-choice]")];

let randomDrawHistory = (() => {
  try {
    const raw = V2_STORAGE.getRandomHistoryEntries?.() || [];
    return new Set((Array.isArray(raw) ? raw : []).map(entry => `${entry.practiceId}|${entry.variant}`));
  } catch (_) { return new Set(); }
})();

const readerFilterState = {
  ds: V2_STORAGE.getDisplay("readerDsFilter", "a-dominant") === "b-dominant" ? "b-dominant" : "a-dominant",
  minOne: String(V2_STORAGE.getDisplay("readerMinOne", "") ?? ""),
  minTwo: String(V2_STORAGE.getDisplay("readerMinTwo", "") ?? ""),
  includeFantasy: V2_STORAGE.getDisplay("readerIncludeFantasy", false) === true,
};
if (readerIncludeFantasy) readerIncludeFantasy.checked = readerFilterState.includeFantasy;

function getRandomPreferences() {
  return {
    includeNeutralNeutral:!!randomIncludeNeutralNeutral.checked,
    onlyNew:!!randomOnlyNew.checked,
    excludeHighRisk:!!randomExcludeHighRisk.checked,
    noRepeat:!!randomNoRepeat.checked
  };
}

function applyRandomPreferences(prefs, persist=false) {
  const p = prefs && typeof prefs === "object" ? prefs : {};
  randomIncludeNeutralNeutral.checked = p.includeNeutralNeutral === true;
  if (typeof p.onlyNew === "boolean") randomOnlyNew.checked = p.onlyNew;
  if (typeof p.excludeHighRisk === "boolean") randomExcludeHighRisk.checked = p.excludeHighRisk;
  if (typeof p.noRepeat === "boolean") randomNoRepeat.checked = p.noRepeat;
  invalidateRandomEligibility();
  if (persist) V2_STORAGE.setRandomPreferences(getRandomPreferences());
}

function loadRandomPreferences() {
  try {
    const saved = V2_STORAGE.getRandomPreferences();
    if (saved && typeof saved === "object") applyRandomPreferences(saved, false);
  } catch (_) {}
}

function saveRandomPreferences() {
  V2_STORAGE.setRandomPreferences(getRandomPreferences());
}

function saveRandomHistory() {
  const entries=[...randomDrawHistory].map(key=>{const i=key.lastIndexOf("|");return {practiceId:key.slice(0,i),variant:key.slice(i+1)}}).filter(e=>e.practiceId&&e.variant);
  V2_STORAGE.setRandomHistoryEntries?.(entries);
}

function clearRandomHistory(showMessage=true) {
  randomDrawHistory.clear();
  invalidateRandomEligibility();
  saveRandomHistory();
  updateRandomEligibilitySummary();
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
const infoModalTitle = document.getElementById("infoModalTitle");
const closeInfoModalBtn = document.getElementById("closeInfoModal");
let lastInfoOpener = null;
const modeEditBtn = document.getElementById("modeEdit");
const modeReadBtn = document.getElementById("modeRead");
const experienceSwitch = document.getElementById("experienceSwitch");
const allTools = document.getElementById("allTools");

let lastExchange = V2_STORAGE.getLastExchange() || null;

function backupTypeLabel(type) {
  if (type === "person-a") return currentLang === "fr" ? "Personne A" : "Person A";
  if (type === "person-b") return currentLang === "fr" ? "Personne B" : "Person B";
  return currentLang === "fr" ? "Complète" : "Full";
}

function globalBackupConfirmationText(type, payload, inspection=null, targetPerson=null) {
  const exportedAt = typeof payload?.exportedAt === "string" ? payload.exportedAt : "";
  const localAt = V2_STORAGE.getLastModified() || "";
  const older = type !== "full" && Number.isFinite(new Date(exportedAt).getTime()) && Number.isFinite(new Date(localAt).getTime()) && new Date(exportedAt).getTime() < new Date(localAt).getTime();
  let message;
  if (currentLang === "fr") {
    if (type === "full") {
      message = "Sauvegarde COMPLÈTE.\n\nElle remplacera le stockage complet : profils, réponses individuelles des deux personnes, données « Fait ensemble », notes, sécurité, séance, affichage et historique.";
    } else {
      const sourceName = payload?.participant?.name || (type === "person-a" ? "Personne A" : "Personne B");
      const profileNow = runtimeProfile();
      const targetName = targetPerson ? (profileNow?.[targetPerson]?.name || (targetPerson === "personA" ? "Personne A" : "Personne B")) : (type === "person-a" ? "Personne A" : "Personne B");
      message = `Sauvegarde individuelle de ${sourceName}.\n\nElle remplacera entièrement les données personnelles du profil « ${targetName} » : pseudo, couleur, anatomie, réponses, notes et états « Avant ». Les données de l’autre personne restent intactes.\n\nLes données du couple (« Fait ensemble », séance, historique et sécurité) ne sont pas remplacées par une sauvegarde individuelle.`;
    }
    if (older) message += "\n\n⚠️ Ce fichier semble plus ancien que les données locales.";
    return message + "\n\nContinuer ?";
  }
  if (type === "full") {
    message = "FULL BACKUP.\n\nIt will replace all current data: both profiles, individual answers, Done together data, notes, safety settings, session, display settings and history.";
  } else {
    const sourceName = payload?.participant?.name || (type === "person-a" ? "Person A" : "Person B");
    const profileNow = runtimeProfile();
    const targetName = targetPerson ? (profileNow?.[targetPerson]?.name || (targetPerson === "personA" ? "Person A" : "Person B")) : (type === "person-a" ? "Person A" : "Person B");
    message = `Individual backup for ${sourceName}.\n\nIt will fully replace the personal data in profile “${targetName}”: name, color, anatomy, answers, notes and Before states. The other person's data remains unchanged.\n\nCouple data (Done together, session, history and safety) is not replaced by an individual backup.`;
  }
  if (older) message += "\n\n⚠️ This file appears older than the local data.";
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
  const backupLabel = backupTypeLabel(lastExchange.backupType || "full");
  const version = lastExchange.appVersion || t("versionUnknown");
  const modified = formatDateTime(lastExchange.lastModifiedAt || lastExchange.exportedAt);
  exchangeInfo.textContent = `${action} · ${backupLabel} · ${t("modified")} ${modified} · ${version}`;
}

function applyModeToSharedTools() {
  // "Lecture" locks personal answers, not shared couple tools.
  safetyFields.forEach(el => { el.disabled = false; });
  importJsonBtn.disabled = false; importJsonBtn.title = "";
  const resetZone = resetChecklistBtn?.closest(".reset-zone");
  if (resetZone) resetZone.hidden = isReadingMode;
  resetChecklistBtn.disabled = false;
  resetChecklistBtn.title = "";
  resetSessionBtn.disabled = variantSessionOrder.length === 0; resetSessionBtn.title = "";
}


function firstUseGuideCopy() {
  if (currentLang === "fr") {
    return {
      kicker:"Première utilisation",
      title:"Un appareil ou deux : même configuration, réponses séparées",
      intro:"Vous pouvez remplir la checklist sur un seul appareil ou chacun de votre côté. Sur deux appareils, commencez avec la même configuration du couple pour afficher exactement les mêmes pratiques.",
      cards:[
        ["1 · Deux appareils ? Partagez le lien","Configurez les deux profils sur un appareil puis utilisez 🔗 Partager la configuration. Votre partenaire ouvre simplement le lien reçu avant de répondre."],
        ["2 · Chacun répond séparément","En Édition, choisissez la personne qui répond. Seules ses réponses et notes sont visibles ; celles du partenaire restent masquées."],
        ["3 · Échangez les sauvegardes personnelles","Exportez Personne A ou Personne B puis restaurez le fichier sur l’autre appareil. La sauvegarde individuelle contient uniquement le profil et les données personnelles de la personne. Elle peut être restaurée dans A ou B ; les données du couple ne sont pas transférées."],
        ["4 · Vérifiez ensemble avant une séance","En Lecture, relisez les résultats, marquez ce qui a été fait ensemble, préparez la séance et vérifiez surtout les réglages de sécurité, les limites et l’aftercare."]
      ],
      local:"Sur un seul appareil, aucun partage de configuration n’est nécessaire. La sauvegarde 💾 Complète contient la configuration, les deux réponses et toutes les données communes.",
      understand:"J’ai compris",
      guide:"Lire le mode d’emploi complet",
      once:"Ce message n’apparaît automatiquement qu’une fois sur cet appareil. Le mode d’emploi reste accessible avec « ? »."
    };
  }
  return {
    kicker:"First use",
    title:"One or two devices: same configuration, separate answers",
    intro:"You can use the checklist on one device or separately. With two devices, start from the same couple configuration so both people see exactly the same applicable practices.",
    cards:[
      ["1 · Two devices? Share the link","Configure both profiles on one device, then use 🔗 Share configuration. Your partner simply opens the received link before answering."],
      ["2 · Answer separately","In Edit mode, choose who is answering. Only that person's answers and notes are visible; the partner's remain hidden."],
      ["3 · Exchange personal backups","Export Person A or Person B and restore it on the other device. An individual backup contains only that person’s profile and personal data. It can be restored into A or B; couple data is not transferred."],
      ["4 · Review together before a session","In Reading mode, review the results, mark what you have done together, prepare the session and especially check safety settings, limits and aftercare."]
    ],
    local:"On one device, no configuration sharing is needed. A 💾 Full backup contains the configuration, both people's answers and all shared data.",
    understand:"Got it",
    guide:"Read the complete user guide",
    once:"This message is shown automatically only once on this device. The complete guide remains available from “?”."
  };
}

function ensureFirstUseGuide() {
  if (onboardingModal) return;
  const wrap = document.createElement("div");
  wrap.className = "first-use-modal";
  wrap.hidden = true;
  wrap.setAttribute("aria-hidden", "true");
  wrap.innerHTML = `<div class="first-use-backdrop"></div>
    <section class="first-use-dialog" role="dialog" aria-modal="true" aria-labelledby="firstUseTitle">
      <div class="first-use-kicker" data-first-use-kicker></div>
      <h2 id="firstUseTitle" data-first-use-title></h2>
      <p class="first-use-intro" data-first-use-intro></p>
      <div class="first-use-grid" data-first-use-grid></div>
      <p class="first-use-local" data-first-use-local></p>
      <div class="first-use-actions">
        <button class="first-use-primary" type="button" data-first-use-understand></button>
        <button class="first-use-secondary" type="button" data-first-use-guide></button>
      </div>
      <p class="first-use-once" data-first-use-once></p>
    </section>`;
  document.body.appendChild(wrap);
  onboardingModal = wrap;
  onboardingDialog = wrap.querySelector(".first-use-dialog");

  wrap.querySelector("[data-first-use-understand]").addEventListener("click", () => closeFirstUseGuide(true));
  wrap.querySelector("[data-first-use-guide]").addEventListener("click", () => {
    closeFirstUseGuide(true, false);
    openHelpModal();
  });
  updateFirstUseGuideLanguage();
}

function updateFirstUseGuideLanguage() {
  if (!onboardingModal) return;
  const c = firstUseGuideCopy();
  onboardingModal.querySelector("[data-first-use-kicker]").textContent = c.kicker;
  onboardingModal.querySelector("[data-first-use-title]").textContent = c.title;
  onboardingModal.querySelector("[data-first-use-intro]").textContent = c.intro;
  onboardingModal.querySelector("[data-first-use-local]").textContent = c.local;
  onboardingModal.querySelector("[data-first-use-understand]").textContent = c.understand;
  onboardingModal.querySelector("[data-first-use-guide]").textContent = c.guide;
  onboardingModal.querySelector("[data-first-use-once]").textContent = c.once;
  onboardingModal.querySelector("[data-first-use-grid]").innerHTML = c.cards.map(([title,text]) =>
    `<div class="first-use-card"><strong>${esc(title)}</strong><span>${esc(text)}</span></div>`
  ).join("");
}

function markFirstUseSeen() {
  try { localStorage.setItem(ONBOARDING_KEY, "true"); } catch (_) {}
}

function closeFirstUseGuide(markSeen=true, restoreFocus=true) {
  if (!onboardingModal || onboardingModal.hidden) return;
  if (markSeen) markFirstUseSeen();
  onboardingModal.hidden = true;
  onboardingModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("first-use-open");
  setAppBackgroundInert(false);
  if (restoreFocus && openHelpBtn) openHelpBtn.focus();
}

function showFirstUseGuideIfNeeded() {
  if (document.documentElement.classList.contains("adult-gate-required")) return;
  const profile = runtimeProfile();
  if (profile && profile.anatomyConfigured !== true) return;
  let seen = false;
  try { seen = localStorage.getItem(ONBOARDING_KEY) === "true"; } catch (_) {}
  if (seen) return;
  ensureFirstUseGuide();
  updateFirstUseGuideLanguage();
  onboardingModal.hidden = false;
  onboardingModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("first-use-open");
  setAppBackgroundInert(true);
  requestAnimationFrame(() => {
    const btn = onboardingModal.querySelector("[data-first-use-understand]");
    if (btn) btn.focus();
  });
}

function mergeReviewCopy(pending) {
  const type = pending?.type;
  const targetPerson = pending?.targetPerson === "personB"
    ? "personB"
    : pending?.targetPerson === "personA"
      ? "personA"
      : (type === "person-b" ? "personB" : "personA");
  const profile = runtimeProfile();
  const fallbackFr = targetPerson === "personB" ? "Personne B" : "Personne A";
  const fallbackEn = targetPerson === "personB" ? "Person B" : "Person A";
  const who = profile?.[targetPerson]?.name || (currentLang === "fr" ? fallbackFr : fallbackEn);
  return currentLang === "fr" ? {
    title:`✓ Profil ${who} importé`,
    text:"Le profil choisi a été remplacé par la sauvegarde individuelle. Les données communes restent celles du couple actuel et aucune donnée commune de l’ancien couple n’a été importée.",
    open:"Voir la checklist",
    close:"Fermer"
  } : {
    title:`✓ ${who} profile imported`,
    text:"The selected profile was replaced by the individual backup. Shared data remains that of the current couple; no shared data from the previous couple was imported.",
    open:"View checklist",
    close:"Dismiss"
  };
}

function readPendingMergeReview() {
  try {
    const raw = sessionStorage.getItem(MERGE_REVIEW_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && ["person-a","person-b"].includes(parsed.type) ? parsed : null;
  } catch (_) { return null; }
}

function updateMergeReviewBannerLanguage() {
  if (!mergeReviewBanner) return;
  const pending = readPendingMergeReview();
  if (!pending) return;
  const c = mergeReviewCopy(pending);
  mergeReviewBanner.querySelector("[data-merge-title]").textContent = c.title;
  mergeReviewBanner.querySelector("[data-merge-text]").textContent = c.text;
  mergeReviewBanner.querySelector("[data-merge-open]").textContent = c.open;
  mergeReviewBanner.querySelector("[data-merge-close]").textContent = c.close;
}

function dismissMergeReviewBanner() {
  try { sessionStorage.removeItem(MERGE_REVIEW_KEY); } catch (_) {}
  if (mergeReviewBanner) mergeReviewBanner.remove();
  mergeReviewBanner = null;
}

function renderMergeReviewBanner() {
  const pending = readPendingMergeReview();
  if (!pending || mergeReviewBanner) return;
  const banner = document.createElement("aside");
  banner.className = "merge-review-banner";
  banner.setAttribute("role", "status");
  banner.innerHTML = `<div class="merge-review-copy"><strong data-merge-title></strong><span data-merge-text></span></div>
    <div class="merge-review-actions"><button type="button" data-merge-open></button><button type="button" data-merge-close></button></div>`;
  const header = document.querySelector("header");
  if (header) header.insertAdjacentElement("afterend", banner); else document.body.prepend(banner);
  mergeReviewBanner = banner;
  updateMergeReviewBannerLanguage();
  banner.querySelector("[data-merge-open]").addEventListener("click", dismissMergeReviewBanner);
  banner.querySelector("[data-merge-close]").addEventListener("click", dismissMergeReviewBanner);
}

function renderRoleChoiceLabel(btn) {
  const person = btn.dataset.personChoice === "person-b" ? "person-b" : "person-a";
  const profile = runtimeProfile();
  const name = person === "person-a"
    ? (profile?.personA?.name || (currentLang === "fr" ? "Personne A" : "Person A"))
    : (profile?.personB?.name || (currentLang === "fr" ? "Personne B" : "Person B"));
  const nameEl = document.createElement("span");
  nameEl.className = "role-choice-name";
  nameEl.textContent = name;
  const roleEl = document.createElement("small");
  roleEl.className = "role-choice-ds";
  roleEl.textContent = currentLang === "fr" ? "Mes réponses" : "My answers";
  btn.replaceChildren(nameEl, roleEl);
}

function normalizePersonSide(side) {
  return side === "person-b" ? "person-b" : "person-a";
}

function oppositePersonSide(side) {
  return normalizePersonSide(side) === "person-b" ? "person-a" : "person-b";
}

function readerDominantSide(profile=runtimeProfile()) {
  if (profile?.dynamic?.mode === "b-dom") return "person-b";
  if (profile?.dynamic?.mode === "a-dom") return "person-a";
  return readerSelectedDsFilter(readerFilterState.ds) === "b-dominant" ? "person-b" : "person-a";
}

function readPersonThemeTokens(styles, side) {
  const prefix = normalizePersonSide(side) === "person-b" ? "--person-b-role" : "--person-a-role";
  const fallbackPrefix = "--person-a-role";
  const fallback = {color:"#355f6e",dark:"#274956",soft:"#e7eef0"};
  const token = suffix =>
    (styles.getPropertyValue(`${prefix}-${suffix}`) || "").trim() ||
    (styles.getPropertyValue(`${fallbackPrefix}-${suffix}`) || "").trim() ||
    fallback[suffix];
  return {color:token("color"),dark:token("dark"),soft:token("soft")};
}

function writeThemeTokens(root, prefix, tokens) {
  root.style.setProperty(`${prefix}-color`, tokens.color);
  root.style.setProperty(`${prefix}-dark`, tokens.dark);
  root.style.setProperty(`${prefix}-soft`, tokens.soft);
}

function applyDominantViewTheme() {
  const root=document.documentElement, body=document.body;
  if(!root || !body) return;

  const profile=runtimeProfile();
  const viewMode = body.dataset.viewMode === "read" ? "read" : "edit";
  const dominantSide = readerDominantSide(profile);
  const submissiveSide = oppositePersonSide(dominantSide);
  const themeSide = viewMode === "read" ? dominantSide : normalizePersonSide(activeEditPerson);

  body.dataset.themeSide = themeSide;
  if (viewMode === "read") {
    body.dataset.dominantSide = dominantSide;
    body.dataset.submissiveSide = submissiveSide;
  } else {
    body.removeAttribute("data-dominant-side");
    body.removeAttribute("data-submissive-side");
  }

  const styles = getComputedStyle(root);
  const themeTokens = readPersonThemeTokens(styles, themeSide);
  const dominantTokens = readPersonThemeTokens(styles, dominantSide);
  const submissiveTokens = readPersonThemeTokens(styles, submissiveSide);

  // Keep legacy aliases in sync while exposing explicit theme/role tokens.
  writeThemeTokens(root, "--theme-person", themeTokens);
  writeThemeTokens(root, "--dominant", themeTokens);
  writeThemeTokens(root, "--role", themeTokens);
  writeThemeTokens(root, "--reader-dominant", dominantTokens);
  writeThemeTokens(root, "--submissive", submissiveTokens);
  writeThemeTokens(root, "--dom-role", dominantTokens);
  writeThemeTokens(root, "--sub-role", submissiveTokens);
}


function modeChoiceMarkup(kind, label) {
  const icon = kind === "read"
    ? '<span class="mode-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M3.8 5.8c3.3-1 6.1-.3 8.2 1.2v11.7c-2.1-1.5-4.9-2.2-8.2-1.2V5.8Z"></path><path d="M20.2 5.8c-3.3-1-6.1-.3-8.2 1.2v11.7c2.1-1.5 4.9-2.2 8.2-1.2V5.8Z"></path></svg></span>'
    : '<span class="mode-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M4.5 19.5h4l10.8-10.8-4-4L4.5 15.5v4Z"></path><path d="m13.9 6.1 4 4"></path><path d="M4.5 19.5 8 16"></path></svg></span>';
  return `${icon}<span class="mode-label">${esc(label)}</span>`;
}

function renderRoleUI() {

  for (const btn of roleButtons) {
    const active = btn.dataset.personChoice === activeEditPerson;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
    renderRoleChoiceLabel(btn);
  }


  document.body.dataset.viewMode = isReadingMode ? "read" : "edit";
  document.body.dataset.activeEditPerson = activeEditPerson;
  applyDominantViewTheme();
  if (!isReadingMode && readerHeaderDs) readerHeaderDs.hidden=true;
  if (modeEditBtn) {
    modeEditBtn.innerHTML = modeChoiceMarkup("edit", currentLang === "fr" ? "Édition" : "Edit");
    modeEditBtn.classList.toggle("active", !isReadingMode);
    modeEditBtn.setAttribute("aria-pressed", !isReadingMode ? "true" : "false");
  }
  if (modeReadBtn) {
    modeReadBtn.innerHTML = modeChoiceMarkup("read", currentLang === "fr" ? "Lecture" : "Reading");
    modeReadBtn.classList.toggle("active", isReadingMode);
    modeReadBtn.setAttribute("aria-pressed", isReadingMode ? "true" : "false");
  }


  applyModeToSharedTools();
}

function setActivePerson(person) {
  flushPersonalNoteSaves();
  const normalized = person === "person-b" ? "person-b" : "person-a";
  if (normalized === activeEditPerson) return;
  activeEditPerson = normalized;
  V2_STORAGE.setDisplay("activeEditPerson", activeEditPerson, false);
  renderRoleUI();
  render();
}

for (const btn of roleButtons) {
  btn.addEventListener("click", () => setActivePerson(btn.dataset.personChoice));
}

for (const btn of languageButtons) {
  btn.addEventListener("click", () => setLanguage(btn.dataset.langChoice, true));
}

openHelpBtn?.addEventListener("click", openHelpModal);
closeHelpBtn?.addEventListener("click", closeHelpModal);


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

document.addEventListener("click",e=>{
  const risk=e.target.closest?.("[data-risk-info]");
  if(risk){ e.preventDefault(); e.stopPropagation(); openRiskInfo(risk.dataset.riskInfo,risk); }
});

document.addEventListener("keydown", e => {
  const activeRiskOverlay=SCORE_UI.getRiskOverlay();
  if (activeRiskOverlay && !activeRiskOverlay.hidden) {
    if(e.key==="Escape"){ e.preventDefault(); closeRiskInfo(); return; }
    focusTrapIn(activeRiskOverlay.querySelector(".risk-info-dialog"),e); return;
  }
  if (onboardingModal && !onboardingModal.hidden) {
    if (e.key === "Escape") { e.preventDefault(); closeFirstUseGuide(true); return; }
    focusTrapIn(onboardingDialog, e);
    return;
  }
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

helpModal?.addEventListener("click", (e) => {
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

function setViewMode(mode) {
  flushPersonalNoteSaves();
  const next = mode === "read";
  if (next === isReadingMode) return;
  isReadingMode = next;
  V2_STORAGE.setDisplay("readOnly", isReadingMode, false);
  sessionOnlyFilter = false;
  status.dataset.readerLang = "";
  renderRoleUI(); render();
  if (sessionMode && !sessionMode.hidden) renderSessionMode();
}
if (modeEditBtn) modeEditBtn.addEventListener("click",()=>setViewMode("edit"));
if (modeReadBtn) modeReadBtn.addEventListener("click",()=>setViewMode("read"));

const TEXT_UI = window.CHECKLIST_TEXT_UI?.create?.({
  getLang: () => currentLang,
  getProfile: () => runtimeProfile(),
  getNames: () => readerNames(),
  interaction: INTERACTION_MODEL
});
if (!TEXT_UI) throw new Error("Checklist text UI missing.");
const {
  esc,
  profilePersonClass,
  profileNameBadge,
  profileNamesInTextHtml,
  readerDsChipHtml,
  readerContextualExplanationHtml
} = TEXT_UI;

function variantEntryKey(entryOrPracticeId, variant=null) {
  if (typeof entryOrPracticeId === "object" && entryOrPracticeId) return `${entryOrPracticeId.practiceId}|${entryOrPracticeId.variant}`;
  return `${entryOrPracticeId}|${variant}`;
}
function refreshVariantSessionSet() {
  variantSessionKeySet = new Set(variantSessionOrder.map(entry => variantEntryKey(entry)));
}
function saveVariantSessionOrder() {
  refreshVariantSessionSet();
  V2_STORAGE.setSessionEntries?.(variantSessionOrder);
}
function isVariantInSession(practiceId, variant) {
  return variantSessionKeySet.has(variantEntryKey(practiceId,variant));
}
// Resolve a stored session entry against the current interaction model.
function sessionEntryData(entry) {
  const entity=CATALOG_RUNTIME.get(entry?.practiceId); if(!entity) return null;
  const profile=runtimeProfile();
  const practiceResponse=V2_STORAGE.getReaderPractice(entity.id);
  const pair=INTERACTION_MODEL.readingPair(entity,entry.variant,practiceResponse,profile);
  if(!pair) return null;
  const info=readerVariantInfo(entity,entry.variant);
  return {entry,entity,pair,info,key:variantEntryKey(entry)};
}
let lastSessionPanelSignature = "";
function renderSessionPanel(force=false) {
  if (!sessionList || !sessionSummary) return;
  const filteredSessionOrder=variantSessionOrder.filter(entry=>CATALOG_RUNTIME.has(entry.practiceId));
  if(filteredSessionOrder.length!==variantSessionOrder.length) {
    variantSessionOrder=filteredSessionOrder;
    saveVariantSessionOrder();
  }
  const selected=variantSessionOrder.map(sessionEntryData).filter(Boolean);
  const signature=[currentLang,...selected.map(x=>`${x.key}:${x.pair.compatibility?.status}:${x.pair.common?.doneTogether?1:0}`)].join("|");
  if(!force&&signature===lastSessionPanelSignature){if(sessionMode&&!sessionMode.hidden)renderSessionMode();return;}
  lastSessionPanelSignature=signature;
  const fantasies=selected.filter(x=>x.pair.compatibility?.status==="fantasy").length;
  sessionSummary.textContent=selected.length
    ? (currentLang==="fr"?`${selected.length} configuration${selected.length>1?'s':''} dans la séance${fantasies?` · ${fantasies} fantasme${fantasies>1?'s':''}`:''}.`:`${selected.length} configuration${selected.length>1?'s':''} in the session${fantasies?` · ${fantasies} fantas${fantasies>1?'ies':'y'}`:''}.`)
    : t("sessionNone");
  showSessionBtn.disabled=selected.length===0; openSessionModeBtn.disabled=selected.length===0; resetSessionBtn.disabled=selected.length===0;
  sessionList.innerHTML=selected.map((x,index)=>{
    const fantasy=x.pair.compatibility?.status==="fantasy";
    return `<div class="session-item${fantasy?' is-fantasy':''}" data-session-key="${esc(x.key)}">
      <span class="session-index">${index+1}</span>
      <span class="session-name"><strong>${esc(x.info.title||x.entity.id)}</strong><small>${profileNamesInTextHtml(readerVariantLabel(x.entity,x.entry.variant), readerNames())}</small></span>
      ${x.info.risk!=="normal"?riskBadge({risk:x.info.risk}):""}
      ${fantasy?`<span class="fantasy-session-badge">💭 ${esc(t("fantasyOnlyShort"))}</span>`:""}
      <button class="session-move" data-session-action="up" data-session-index="${index}" type="button" ${index===0?'disabled':''} title="${t("moveUp")}">↑</button>
      <button class="session-move" data-session-action="down" data-session-index="${index}" type="button" ${index===selected.length-1?'disabled':''} title="${t("moveDown")}">↓</button>
      <button class="session-remove" data-session-action="remove" data-session-index="${index}" type="button" title="${t("removeSession")}">×</button>
    </div>`;
  }).join("");
  if(sessionMode&&!sessionMode.hidden)renderSessionMode();
}

function renderSessionSafetySummary() {
  const safety = getSafety();
  const entries = [];
  const push = (label, value) => { const clean=typeof value==="string"?value.trim():value; if(clean) entries.push(`<div class="session-safety-item"><strong>${esc(label)} :</strong> ${esc(clean)}</div>`); };
  push(t("slowWordLabel"), safety.slowWord); push(t("safeWordLabel"), safety.safeWord); push(t("slowSignalLabel"), safety.slowSignal); push(t("stopSignalLabel"), safety.stopSignal);
  const marksEl=document.getElementById("marks"),mediaEl=document.getElementById("media");
  push(t("marksLabel"),safety.marks&&marksEl?.selectedOptions?.[0]?marksEl.selectedOptions[0].textContent:safety.marks); push(t("hardLimitsLabel"),safety.hardLimits); push(t("aftercareLabel"),safety.aftercare); push(t("mediaLabel"),safety.media&&mediaEl?.selectedOptions?.[0]?mediaEl.selectedOptions[0].textContent:safety.media);
  if(safety.stopImmediate)push(t("stopImmediate"),currentLang==="fr"?"Oui":"Yes"); if(safety.noIntoxication)push(t("noIntoxication"),currentLang==="fr"?"Oui":"Yes"); if(safety.nextDayDebrief)push(t("nextDayDebrief"),currentLang==="fr"?"Oui":"Yes");
  sessionSafetySummary.innerHTML=entries.length?`<div class="session-safety-grid">${entries.join("")}</div>`:`<div class="session-safety-item">${esc(t("sessionSafetyEmpty"))}</div>`;
}
function renderSessionMode() {
  if(!sessionModeList||!sessionSafetySummary)return; renderSessionSafetySummary();
  const selected=variantSessionOrder.map(sessionEntryData).filter(Boolean);
  if(!selected.length){sessionModeList.innerHTML=`<div class="empty">${esc(t("sessionModeEmpty"))}</div>`;return;}
  sessionModeList.innerHTML=selected.map((x,index)=>{
    const fantasy=x.pair.compatibility?.status==="fantasy",limit=x.pair.compatibility?.status==="limit",done=x.pair.common?.doneTogether===true;
    const names=readerNames();
    return `<article class="session-mode-card${fantasy?' fantasy-only':''}${limit?' has-limit':''}" data-session-key="${esc(x.key)}" style="--category-color:${(x.info.category===CUSTOM_CATEGORY?CUSTOM_CATEGORY_COLOR:categoryColors[x.info.category])||'#9aa0a6'}">
      <div class="session-mode-card-head"><span class="session-mode-index">${index+1}</span><div class="session-mode-title-wrap"><div class="session-mode-category">${esc(localizedCategory(x.info.category))}</div><div class="session-mode-practice">${esc(x.info.title)} ${x.info.risk!=="normal"?riskBadge({risk:x.info.risk}):""}</div><div class="session-mode-variant">${profileNamesInTextHtml(readerVariantLabel(x.entity,x.entry.variant,names),names)}</div></div><div class="session-mode-meta"><span class="session-mode-compat">${esc(readerCompatibilityLabel(x.pair.compatibility?.status||'incomplete'))}</span></div></div>
      ${fantasy?`<div class="session-mode-fantasy-banner">${esc(t("sessionFantasyBanner"))}</div>`:""}
      <div class="session-mode-expl">${esc(x.info.explanation||"")}</div>
      <div class="session-mode-couple-grid">${readerPersonPanel(names.personA,"person-a",x.pair.personA.slot,x.pair.personA.state)}${readerPersonPanel(names.personB,"person-b",x.pair.personB.slot,x.pair.personB.state)}</div>
      <label class="session-mode-together"><input type="checkbox" data-session-mode-together data-practice-id="${esc(x.entry.practiceId)}" data-variant="${esc(x.entry.variant)}" ${done?'checked':''}><span>${esc(t("sessionDoneTogetherLabel"))}</span></label>
    </article>`;
  }).join("");
}
let sessionModePreviousFocus=null;
function openSessionMode(){if(!variantSessionOrder.length)return;sessionModePreviousFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;renderSessionMode();sessionMode.hidden=false;sessionMode.setAttribute("aria-hidden","false");document.body.classList.add("session-mode-open");setAppBackgroundInert(true);closeSessionModeBtn.focus();}
function closeSessionMode(){sessionMode.hidden=true;sessionMode.setAttribute("aria-hidden","true");document.body.classList.remove("session-mode-open");setAppBackgroundInert(false);render();if(sessionModePreviousFocus&&document.contains(sessionModePreviousFocus))sessionModePreviousFocus.focus();sessionModePreviousFocus=null;}
function toggleSessionVariant(practiceId,variant){const key=variantEntryKey(practiceId,variant),index=variantSessionOrder.findIndex(entry=>variantEntryKey(entry)===key);if(index>=0)variantSessionOrder.splice(index,1);else variantSessionOrder.push({practiceId,variant});saveVariantSessionOrder();renderSessionPanel(true);}
function moveSessionEntry(index,direction){const target=direction==="up"?index-1:index+1;if(index<0||target<0||index>=variantSessionOrder.length||target>=variantSessionOrder.length)return;[variantSessionOrder[index],variantSessionOrder[target]]=[variantSessionOrder[target],variantSessionOrder[index]];saveVariantSessionOrder();renderSessionPanel(true);}
const scoreUiCache = new Map();
function cachedScoreUi(value, role=null) {
  const key = `${currentLang}|${role || "none"}|${value}`;
  if (scoreUiCache.has(key)) return scoreUiCache.get(key);
  const ui = Object.freeze({
    label:scoreButtonLabel(value, role),
    title:esc(scoreChoiceTitle(value, role))
  });
  scoreUiCache.set(key, ui);
  return ui;
}


const individualEditor = document.getElementById("individualEditor");
const individualEditorList = document.getElementById("individualEditorList");
const individualEditorEmpty = document.getElementById("individualEditorEmpty");
const individualEditorLegend = document.getElementById("individualEditorLegend");
const individualEditorProfile = document.getElementById("individualEditorProfile");
const individualEditorCollapseAll = document.getElementById("individualEditorCollapseAll");
const individualEditorExpandAll = document.getElementById("individualEditorExpandAll");
const coupleReader = document.getElementById("coupleReader");
const coupleReaderList = document.getElementById("coupleReaderList");
const coupleReaderEmpty = document.getElementById("coupleReaderEmpty");
const appMainScrollport = document.querySelector("main");
const editPracticeScrollport = individualEditorList;
const readerPracticeScrollport = coupleReaderList;
const stickyHeaderRaf = { read:0, edit:0 };
function stickyHeaderConfig(mode) {
  return mode === "read"
    ? {
      root:coupleReaderList,
      scrollport:readerPracticeScrollport,
      categorySelector:".couple-reader-category",
      headSelector:".couple-reader-category-head",
      offsetVar:"--read-category-sticky-top",
      hidden:() => coupleReader?.hidden,
      isCollapsed:categoryNode => categoryNode.classList.contains("is-collapsed")
    }
    : {
      root:individualEditorList,
      scrollport:editPracticeScrollport,
      categorySelector:".individual-category",
      headSelector:".individual-category-head",
      offsetVar:"--edit-category-sticky-top",
      hidden:() => individualEditor?.hidden,
      isCollapsed:(categoryNode, head) => head.getAttribute("aria-expanded") !== "true"
    };
}
function clearStickyHeaderStates(mode){
  const cfg = stickyHeaderConfig(mode);
  cfg.root?.querySelectorAll(`${cfg.headSelector}.is-stuck`).forEach(head=>head.classList.remove("is-stuck"));
}
function clearReaderStickyHeaderStates(){ clearStickyHeaderStates("read"); }
function clearEditStickyHeaderStates(){ clearStickyHeaderStates("edit"); }
function stickyOffsetPx(name){
  if(!appMainScrollport) return 0;
  const value=getComputedStyle(appMainScrollport).getPropertyValue(name);
  const parsed=parseFloat(value);
  return Number.isFinite(parsed)?parsed:0;
}
function updateStickyHeaderStates(mode){
  stickyHeaderRaf[mode] = 0;
  const cfg = stickyHeaderConfig(mode);
  if(!cfg.scrollport || document.body.dataset.viewMode!==mode || cfg.hidden()){
    clearStickyHeaderStates(mode);
    return;
  }
  const scrollTop = cfg.scrollport.getBoundingClientRect().top + stickyOffsetPx(cfg.offsetVar);
  for(const categoryNode of cfg.root?.querySelectorAll(cfg.categorySelector) || []){
    const head = categoryNode.querySelector(cfg.headSelector);
    if(!head) continue;
    if(cfg.isCollapsed(categoryNode, head)){
      head.classList.remove("is-stuck");
      continue;
    }
    const categoryRect = categoryNode.getBoundingClientRect();
    const headRect = head.getBoundingClientRect();
    const stillOwnsStickySpace = categoryRect.bottom > scrollTop + headRect.height + 1;
    const stuck = stillOwnsStickySpace && headRect.top <= scrollTop + 1;
    head.classList.toggle("is-stuck", stuck);
  }
}
function queueStickyHeaderUpdate(mode){
  if(stickyHeaderRaf[mode]) return;
  stickyHeaderRaf[mode] = requestAnimationFrame(() => updateStickyHeaderStates(mode));
}
function queueReaderStickyHeaderUpdate(){ queueStickyHeaderUpdate("read"); }
function queueEditStickyHeaderUpdate(){ queueStickyHeaderUpdate("edit"); }
function queueActiveStickyHeaderUpdate(){
  if(document.body.dataset.viewMode==="read") queueReaderStickyHeaderUpdate();
  else queueEditStickyHeaderUpdate();
}
editPracticeScrollport?.addEventListener("scroll", queueEditStickyHeaderUpdate, {passive:true});
readerPracticeScrollport?.addEventListener("scroll", queueReaderStickyHeaderUpdate, {passive:true});
window.addEventListener("resize", queueActiveStickyHeaderUpdate, {passive:true});
window.addEventListener("orientationchange", queueActiveStickyHeaderUpdate, {passive:true});
if (individualEditorProfile) individualEditorProfile.addEventListener("click", () => PROFILE_API?.open?.());
function categoryUiConfig(mode) {
  return mode === "read"
    ? {root:coupleReaderList, categorySelector:".couple-reader-category", headSelector:".couple-reader-category-head", bodySelector:".couple-reader-category-body", chevronSelector:".couple-reader-category-chevron"}
    : {root:individualEditorList, categorySelector:".individual-category", headSelector:".individual-category-head", bodySelector:".individual-category-cards", chevronSelector:".individual-category-chevron"};
}
function setRenderedCategoryCollapsed(categoryNode, collapsed, mode) {
  if (!categoryNode) return;
  const cfg = categoryUiConfig(mode);
  const head = categoryNode.querySelector(cfg.headSelector);
  const body = categoryNode.querySelector(cfg.bodySelector);
  const chevron = categoryNode.querySelector(cfg.chevronSelector);
  categoryNode.classList.toggle("is-collapsed", collapsed);
  if (head) {
    head.setAttribute("aria-expanded", collapsed ? "false" : "true");
    head.classList.remove("is-stuck");
  }
  if (body) body.hidden = collapsed;
  if (chevron) chevron.textContent = collapsed ? "▸" : "▾";
}
function applyRenderedCategoryCollapseState(mode = currentCategoryCollapseMode()) {
  const cfg = categoryUiConfig(mode);
  if (!cfg.root) return;
  cfg.root.querySelectorAll(cfg.categorySelector).forEach(node => {
    setRenderedCategoryCollapsed(node, isCategoryCollapsed(node.dataset.category, mode), mode);
  });
}
function toggleRenderedCategory(categoryName, mode = currentCategoryCollapseMode()) {
  const collapsed = !isCategoryCollapsed(categoryName, mode);
  setCategoryCollapsedState(categoryName, collapsed, mode);
  const cfg = categoryUiConfig(mode);
  cfg.root?.querySelectorAll(cfg.categorySelector).forEach(node => {
    if (node.dataset.category === categoryName) setRenderedCategoryCollapsed(node, collapsed, mode);
  });
  queueActiveStickyHeaderUpdate();
}
function setAllCategoriesCollapsed(shouldCollapse) {
  const mode = currentCategoryCollapseMode();
  replaceCollapsedCategories(mode, shouldCollapse ? CATALOG_RUNTIME.categoryNames() : []);

  /* Folding is a pure UI-state operation. Never rebuild/filter the practice
     list here: all rendered category nodes stay in place. */
  applyRenderedCategoryCollapseState(mode);
  clearEditStickyHeaderStates();
  clearReaderStickyHeaderStates();

  const scrollport = mode === "read" ? readerPracticeScrollport : editPracticeScrollport;
  if (scrollport) scrollport.scrollTo({top:0,left:scrollport.scrollLeft,behavior:"auto"});
  requestAnimationFrame(queueActiveStickyHeaderUpdate);
}
if (individualEditorCollapseAll) individualEditorCollapseAll.addEventListener("click", () => setAllCategoriesCollapsed(true));
if (individualEditorExpandAll) individualEditorExpandAll.addEventListener("click", () => setAllCategoriesCollapsed(false));

function modelPersonKey() { return activeEditPerson === "person-b" ? "personB" : "personA"; }
function profileRenderCacheKey(profile=runtimeProfile()) {
  const parts = [
    profile?.personA?.name || "",
    profile?.personB?.name || "",
    profile?.dynamic?.mode || "switch",
    profile?.showIncompatible === true ? "show-incompatible" : "hide-incompatible",
    profile?.anatomyConfigured === true ? "configured" : "unconfigured"
  ];
  for (const person of ["personA", "personB"]) {
    const anatomy = profile?.[person]?.anatomy || {};
    for (const key of Object.keys(anatomy).sort()) {
      if (anatomy[key] === true) parts.push(`${person}:${key}`);
    }
  }
  return parts.join("|");
}
function scenarioBlockForEditorSlot(entity, person, slot) {
  for (const [scenarioKey,scenarioName] of [["aDom","a-dom"],["bDom","b-dom"]]) {
    if (INTERACTION_MODEL.slotForScenarioPerson(entity,scenarioName,person) === slot && entity?.scenarios?.[scenarioKey]) return {block:entity.scenarios[scenarioKey],scenarioKey};
  }
  const firstKey = entity?.scenarios?.aDom ? "aDom" : entity?.scenarios?.bDom ? "bDom" : null;
  return firstKey ? {block:entity.scenarios[firstKey],scenarioKey:firstKey} : {block:null,scenarioKey:null};
}
function personalizeScenarioText(text, scenarioKey) {
  let out=String(text||''); const p=runtimeProfile(); if(!p) return out;
  const a=p.personA?.name||"A", b=p.personB?.name||"B";
  const dom=scenarioKey==="bDom"?b:a, sub=scenarioKey==="bDom"?a:b;
  out=out
    .replace(/\{A\}/g,a)
    .replace(/\{B\}/g,b)
    .replace(/\{DOM\}/g,dom)
    .replace(/\{SUB\}/g,sub);
  const replacements=[
    [/\b(?:du|de la)\s+Ma[iî]tre(?:sse)?\b/gi,`de ${dom}`],
    [/\b(?:au|à la)\s+Ma[iî]tre(?:sse)?\b/gi,`à ${dom}`],
    [/\b(?:le|la)\s+Ma[iî]tre(?:sse)?\b/gi,dom],
    [/\bMa[iî]tre(?:sse)?\b/gi,dom],
    [/\b(?:du|de la)\s+Soumis(?:e)?\b/gi,`de ${sub}`],
    [/\b(?:au|à la)\s+Soumis(?:e)?\b/gi,`à ${sub}`],
    [/\b(?:le|la)\s+Soumis(?:e)?\b/gi,sub],
    [/\bSoumis(?:e)?\b/gi,sub],
    [/\b(?:the )?Master\b/gi,dom],[/\b(?:the )?Mistress\b/gi,dom],[/\b(?:the )?Submissive\b/gi,sub]
  ];
  for(const [re,value] of replacements) out=out.replace(re,value);
  return out;
}
const localizedScenarioInfoCache = new Map();
function localizedScenarioInfo(entity, scenarioKey) {
  const block=scenarioKey ? entity?.scenarios?.[scenarioKey] : null;
  if(!block) return {title:"",explanation:"",category:"Autres",level:3,risk:"normal"};
  const profile=runtimeProfile();
  const cacheKey=[currentLang,profile.personA?.name||"",profile.personB?.name||"",entity.id,scenarioKey].join("|");
  const cached=localizedScenarioInfoCache.get(cacheKey);
  if(cached) return cached;
  const info=Object.freeze({
    title:personalizeScenarioText(currentLang==="en"?(block.practiceEn||block.practice):(block.practice||block.practiceEn),scenarioKey),
    explanation:personalizeScenarioText(currentLang==="en"?(block.explanationEn||block.explanation):(block.explanation||block.explanationEn),scenarioKey),
    category:block.category||"Autres",
    level:Number.isInteger(block.level)?block.level:3,
    risk:["normal","caution","high"].includes(block.risk)?block.risk:"normal"
  });
  localizedScenarioInfoCache.set(cacheKey,info);
  return info;
}
function editorSlotLabel(slot) {
  /* The model keeps give/receive internally for action direction and anatomy;
     the editor-facing vocabulary remains DOM/SUB. */
  if(currentLang==="fr") return ({interest:"INTÉRÊT",give:"DOM",receive:"SUB",dominant:"DOM",submissive:"SUB"})[slot]||slot;
  return ({interest:"INTEREST",give:"DOM",receive:"SUB",dominant:"DOM",submissive:"SUB"})[slot]||slot;
}
function editorSlotsForEntity(entity, person, profile) {
  let slots=INTERACTION_MODEL.slotsForPerson(entity, person).map(slot=>({
    slot,
    applicability:INTERACTION_MODEL.evaluateSlot(entity,person,slot,profile)
  })).filter(({applicability})=>
    applicability.status!=="unsupported" &&
    (applicability.status!=="notApplicable" || profile?.showIncompatible===true)
  );
  if(INTERACTION_MODEL.axisOf(entity)===INTERACTION_MODEL.AXIS.ROLE && profile?.dynamic?.mode!=="switch") {
    const dominant = profile?.dynamic?.mode==="a-dom"?"personA":profile?.dynamic?.mode==="b-dom"?"personB":null;
    if(dominant) {
      const required=person===dominant ? INTERACTION_MODEL.SLOT.DOMINANT : INTERACTION_MODEL.SLOT.SUBMISSIVE;
      slots=slots.filter(({slot})=>slot===required);
    }
  }
  return slots;
}
function editorEntityInfo(entity, person, slots) {
  const preferred=scenarioBlockForEditorSlot(entity,person,slots[0]||INTERACTION_MODEL.slotsForEntity(entity)[0]);
  return localizedScenarioInfo(entity,preferred.scenarioKey);
}
function getEditorModelSnapshot(profile, person) {
  const profileKey = profileRenderCacheKey(profile);
  if (
    editorModelCache.revision === derivedDataRevision &&
    editorModelCache.lang === currentLang &&
    editorModelCache.person === person &&
    editorModelCache.profileKey === profileKey &&
    editorModelCache.value
  ) {
    return editorModelCache.value;
  }

  const rows = [];
  for (const entity of CATALOG_RUNTIME.all()) {
    const slotMeta = editorSlotsForEntity(entity, person, profile);
    if (!slotMeta.length) continue;
    const slots = slotMeta.map(({slot}) => slot);
    const info = editorEntityInfo(entity, person, slots);
    rows.push({
      entity,
      slotMeta,
      info,
      searchText: `${info.title} ${info.explanation} ${info.category}`.toLowerCase()
    });
  }

  editorModelCache = {
    revision: derivedDataRevision,
    lang: currentLang,
    person,
    profileKey,
    value: rows
  };
  return rows;
}
function editorScoreButtons(v2Id,slot,state) {
  const role = slot===INTERACTION_MODEL.SLOT.DOMINANT?"dom":slot===INTERACTION_MODEL.SLOT.SUBMISSIVE?"sub":null;
  const unknown=`<button class="score-btn unknown-score${Number.isInteger(state.preference)?"":" selected"}" data-personal-action="preference" data-v2-id="${esc(v2Id)}" data-slot="${slot}" data-score="unknown" type="button" title="${esc(t("unknown"))}">?</button>`;
  return unknown+SCORE_BUTTON_ORDER.map(n=>{const ui=cachedScoreUi(n,role),sel=state.preference===n;return `<button class="score-btn semantic-score-btn${n===0?' limit-score':''}${sel?' selected':''}" data-personal-action="preference" data-v2-id="${esc(v2Id)}" data-slot="${slot}" data-score="${n}" type="button" title="${ui.title}" aria-pressed="${sel?'true':'false'}">${ui.label}</button>`}).join("");
}
function editorStateVisualKey(state){
  return scoreResultKey(preferenceScore(state));
}
function editorPracticeVisualKey(slotStates){
  const scores=slotStates
    .map(({state})=>preferenceScore(state))
    .filter(score=>Number.isInteger(score));
  if(!scores.length) return "incomplete";
  return scoreResultKey(Math.max(...scores));
}
function editorSlotNoteLabel(slot) {
  const role=editorSlotLabel(slot);
  return langText(`Note ${role}`, `${role} note`);
}
function renderEditorSlot(entity,person,slot,profile,state=V2_STORAGE.getPersonalSlotState(entity.id,person,slot)||{},applicability=null) {
  applicability=applicability||INTERACTION_MODEL.evaluateSlot(entity,person,slot,profile);
  const incompatible=applicability.status==="notApplicable";
  const incompatTitle=langText("Anatomie non compatible", "Anatomy not compatible");
  const visualKey=editorStateVisualKey(state);
  const note=String(state.note||"");
  const hasNote=note.trim().length>0;
  const noteLabel=editorSlotNoteLabel(slot);
  const noteTitle=currentLang==="fr"?(hasNote?`${noteLabel} affichée en permanence`:`Ajouter ${noteLabel.toLowerCase()}`):(hasNote?`${noteLabel} always visible`:`Add ${noteLabel}`);
  const priorTitle=langText("Déjà fait avant", "Already done before");
  return `<section class="individual-slot${incompatible?' is-incompatible':''}${hasNote?' has-persistent-note':''}" data-editor-slot="${slot}" data-result-key="${visualKey}">
    <div class="individual-slot-main">
      <div class="individual-slot-label-wrap"><strong class="individual-slot-label">${esc(editorSlotLabel(slot))}</strong>${incompatible?`<span class="individual-applicability" title="${esc(incompatTitle)}" aria-label="${esc(incompatTitle)}">⚠</span>`:""}</div>
      <div class="individual-score-row">${editorScoreButtons(entity.id,slot,state)}</div>
      <div class="individual-slot-tools">
        <button class="individual-prior${state.prior?' checked':''}" data-personal-action="prior" data-v2-id="${esc(entity.id)}" data-slot="${slot}" type="button" aria-pressed="${state.prior?'true':'false'}" title="${esc(priorTitle)}"><span class="individual-prior-check" aria-hidden="true">${state.prior?'✓':'□'}</span><span class="individual-prior-text individual-prior-text-short">${langText("Avant","Before")}</span><span class="individual-prior-text individual-prior-text-long">${langText("Déjà fait avant","Done before")}</span></button>
        <button class="individual-note-toggle slot-note-toggle${hasNote?' has-note':''}" data-personal-note-toggle data-v2-id="${esc(entity.id)}" data-slot="${slot}" type="button" aria-expanded="${hasNote?'true':'false'}" aria-label="${esc(noteTitle)}" title="${esc(noteTitle)}"><span aria-hidden="true">📝</span>${hasNote?'<i aria-hidden="true"></i>':''}</button>
      </div>
      <label class="desktop-inline-note"><span>${esc(noteLabel)}</span><textarea data-personal-note data-v2-id="${esc(entity.id)}" data-slot="${slot}" aria-label="${esc(noteLabel)}" placeholder="${esc(langText('Écrire une note…','Write a note…'))}">${esc(note)}</textarea></label>
    </div>
    <label class="individual-slot-note-panel"${hasNote?'':' hidden'}><span>${esc(noteLabel)}</span><textarea data-personal-note data-v2-id="${esc(entity.id)}" data-slot="${slot}" placeholder="${esc(currentLang==="fr"?`${noteLabel}…`:`${noteLabel}…`)}">${esc(note)}</textarea></label>
  </section>`;
}

function configureEditorStatusOptions() {
  const langKey=`edit-${currentLang}`; if(status.dataset.readerLang===langKey) return;
  const previous=status.value;
  const options=currentLang==="fr"?[["","Tous mes choix"],["incomplete","? À compléter"],["want","🔥 Envie ou favori"],["favorite","👑 Favoris"],["fantasy","💭 Fantasmes"],["limit","🚫 Limites"],["tried","✓ Avant"],["notes","Avec une note"]]:[["","All my choices"],["incomplete","? To complete"],["want","🔥 Want or favorite"],["favorite","👑 Favorites"],["fantasy","💭 Fantasies"],["limit","🚫 Limits"],["tried","✓ Before"],["notes","With a note"]];
  status.innerHTML=options.map(([value,label])=>`<option value="${value}">${esc(label)}</option>`).join("");
  status.value=options.some(([value])=>value===previous)?previous:""; status.dataset.readerLang=langKey;
}
function editorEffectiveScore(state){return preferenceScore(state);}
function editorSlotMatches(state,statusValue,minScore){const score=editorEffectiveScore(state);if(statusValue==="incomplete"&&Number.isInteger(state?.preference))return false;if(statusValue==="want"&&![3,4].includes(score))return false;if(statusValue==="favorite"&&score!==4)return false;if(statusValue==="fantasy"&&score!==5)return false;if(statusValue==="limit"&&score!==0)return false;if(statusValue==="tried"&&state?.prior!==true)return false;if(statusValue==="notes"&&!String(state?.note||"").trim())return false;if(minScore!==null&&(score===5||!Number.isInteger(score)||score<minScore))return false;return true;}

function renderIndividualEditor() {
  if(!individualEditor||!individualEditorList) return;
  individualEditor.hidden=false;
  configureEditorStatusOptions();
  configureEditorMinimumOptions();
  const profile=runtimeProfile(); const person=modelPersonKey();
  if (individualEditor) individualEditor.dataset.person = person === 'personB' ? 'person-b' : 'person-a';
  individualEditorLegend.innerHTML=currentLang==="fr"?`<strong>Comment répondre :</strong> l’interface utilise un vocabulaire constant : <b>INTÉRÊT</b> pour les pratiques générales, et <b>DOM</b>/<b>SUB</b> pour les variantes dirigées. La direction réelle de l’action et les conditions anatomiques sont gérées automatiquement.`:`<strong>How to answer:</strong> the interface uses consistent labels: <b>INTEREST</b> for general practices, and <b>DOM</b>/<b>SUB</b> for directed variants. The actual action direction and anatomy requirements are handled automatically.`;
  const q=search.value.trim().toLowerCase(), cat=category.value, risk=riskFilter.value; const maxLevel=experienceMaxLevel();
  const minRaw=minFilterScore.value, minScore=minRaw===""?null:Number(minRaw), statusValue=status.value;
  const grouped=new Map(); let visible=0;
  for(const {entity,slotMeta,info,searchText} of getEditorModelSnapshot(profile,person)) {
    const personalPractice=V2_STORAGE.getPersonalPractice(entity.id);
    const slotStates=slotMeta
      .map(({slot,applicability})=>({slot,applicability,state:personalPractice?.persons?.[person]?.[slot]||{}}))
      .filter(({state})=>editorSlotMatches(state,statusValue,minScore));
    if(!slotStates.length) continue;
    if(info.level>maxLevel || (risk&&info.risk!==risk) || (cat&&info.category!==cat)) continue;
    if(q){
      const slotNotes=slotStates.map(({state})=>String(state?.note||"")).join(" ").toLowerCase();
      if(!`${searchText} ${slotNotes}`.includes(q)) continue;
    }
    if(!grouped.has(info.category)) grouped.set(info.category,[]); grouped.get(info.category).push({entity,slotStates,info}); visible++;
  }
  const categories=[...grouped.keys()].sort(compareCategories); let html="";
  for(const catName of categories) {
    const rows=grouped.get(catName); const collapsed=isCategoryCollapsed(catName,"edit");
    const cards=rows.map(({entity,slotStates,info})=>`<article class="individual-practice-card" data-v2-id="${esc(entity.id)}" data-result-key="${editorPracticeVisualKey(slotStates)}"><header${info.explanation?` title="${esc(info.explanation)}"`:''}><div class="individual-practice-headmain"><div class="individual-practice-titleline">${entity.custom?'':`<span class="individual-practice-category">${esc(currentLang==='fr'?`N${info.level}`:`L${info.level}`)}</span>`}<h3>${esc(info.title)}</h3></div>${info.explanation?`<p class="individual-practice-explanation">${profileNamesInTextHtml(info.explanation,readerNames())}</p>`:''}</div><div class="individual-practice-headtools">${info.risk==='normal'?'':riskBadge({risk:info.risk})}${entity.custom?`<button class="custom-practice-card-action" data-custom-edit="${esc(entity.id)}" type="button" title="${esc(currentLang==='fr'?'Modifier la pratique personnalisée':'Edit custom practice')}" aria-label="${esc(currentLang==='fr'?'Modifier la pratique personnalisée':'Edit custom practice')}">✎</button><button class="custom-practice-card-action custom-delete" data-custom-delete="${esc(entity.id)}" type="button" title="${esc(currentLang==='fr'?'Supprimer la pratique personnalisée':'Delete custom practice')}" aria-label="${esc(currentLang==='fr'?'Supprimer la pratique personnalisée':'Delete custom practice')}">×</button>`:''}</div></header><div class="individual-slots${slotStates.length>1?' has-multiple':''}">${slotStates.map(({slot,state,applicability})=>renderEditorSlot(entity,person,slot,profile,state,applicability)).join('')}</div></article>`).join('');
    html+=`<section class="individual-category${collapsed?' is-collapsed':''}" data-category="${esc(catName)}"><button class="individual-category-head" data-editor-category-toggle="${esc(catName)}" type="button" aria-expanded="${collapsed?'false':'true'}"><span class="section-dot" style="background:${(catName===CUSTOM_CATEGORY?CUSTOM_CATEGORY_COLOR:categoryColors[catName])||'#999'}"></span><strong>${esc(localizedCategory(catName))}</strong><span>${rows.length}</span><b class="individual-category-chevron">${collapsed?'▸':'▾'}</b></button><div class="individual-category-cards"${collapsed?' hidden':''}>${cards}</div></section>`;
  }
  const editorDesktopHead=currentLang==="fr"
    ? `<div class="desktop-editor-table-head" aria-hidden="true"><span>Pratique + description</span><span>Variante</span><span>Préférence</span><span>Déjà fait avant</span><span>Note</span></div>`
    : `<div class="desktop-editor-table-head" aria-hidden="true"><span>Practice + description</span><span>Variant</span><span>Preference</span><span>Done before</span><span>Note</span></div>`;
  individualEditorList.innerHTML=editorDesktopHead+html; individualEditorEmpty.hidden=visible!==0;
  applyRenderedCategoryCollapseState("edit");
  updateStats();
  queueEditStickyHeaderUpdate();
}
function hideIndividualEditor() {
  if(individualEditor) individualEditor.hidden=true;
}
function editorStateFiltersActive() {
  return Boolean(status?.value || minFilterScore?.value);
}
function patchRenderedEditorSlot(slotRow, id, person, slot, state) {
  const entity = CATALOG_RUNTIME.get(id);
  if (!slotRow || !entity) {
    render();
    return;
  }

  const profile = runtimeProfile();
  const applicability = INTERACTION_MODEL.evaluateSlot(entity, person, slot, profile);
  const template = document.createElement("template");
  template.innerHTML = renderEditorSlot(entity, person, slot, profile, state, applicability).trim();
  const nextSlotRow = template.content.firstElementChild;
  if (!nextSlotRow) {
    render();
    return;
  }

  slotRow.replaceWith(nextSlotRow);
  const card = nextSlotRow.closest(".individual-practice-card");
  if (card) {
    const slotStates = [...card.querySelectorAll(".individual-slot")].map(row => ({
      state: V2_STORAGE.getPersonalSlotState(id, person, row.dataset.editorSlot) || {}
    }));
    card.dataset.resultKey = editorPracticeVisualKey(slotStates);
  }

  updateStats();
  updateRandomEligibilitySummary();
}
const pendingPersonalNotes = new Map();
let personalNoteSaveTimer = null;
function flushPersonalNoteSaves() {
  if (personalNoteSaveTimer) { clearTimeout(personalNoteSaveTimer); personalNoteSaveTimer = null; }
  if (!pendingPersonalNotes.size) return;
  for (const {id,person,slot,value} of pendingPersonalNotes.values()) V2_STORAGE.setPersonalSlotNote(id,person,slot,value);
  pendingPersonalNotes.clear();
  invalidateDerivedData();
}
function queuePersonalNoteSave(id,person,slot,value) {
  const key=`${id}|${person}|${slot}`;
  pendingPersonalNotes.set(key,{id,person,slot,value});
  if (personalNoteSaveTimer) clearTimeout(personalNoteSaveTimer);
  personalNoteSaveTimer=setTimeout(flushPersonalNoteSaves,180);
}

if(individualEditorList) {
  individualEditorList.addEventListener("click",e=>{
    const customEdit=e.target.closest("[data-custom-edit]");
    if(customEdit){openCustomPracticeModal(customEdit.dataset.customEdit,customEdit);return;}
    const customDelete=e.target.closest("[data-custom-delete]");
    if(customDelete){deleteCustomPracticeFromUi(customDelete.dataset.customDelete);return;}
    const catBtn=e.target.closest("[data-editor-category-toggle]"); if(catBtn){toggleRenderedCategory(catBtn.dataset.editorCategoryToggle,"edit");return;}
    const noteToggle=e.target.closest("button[data-personal-note-toggle]");
    if(noteToggle){
      const slotRow=noteToggle.closest(".individual-slot"),panel=slotRow?.querySelector(".individual-slot-note-panel");
      // A non-empty note is persistent in Edit mode on mobile: it cannot be collapsed.
      if(noteToggle.classList.contains("has-note")){
        if(panel){panel.hidden=false;noteToggle.setAttribute("aria-expanded","true");noteToggle.classList.add("is-open");}
        return;
      }
      if(panel){const opening=panel.hidden;panel.hidden=!opening;noteToggle.setAttribute("aria-expanded",opening?"true":"false");noteToggle.classList.toggle("is-open",opening);if(opening)panel.querySelector("textarea")?.focus();}
      return;
    }
    const btn=e.target.closest("button[data-personal-action]"); if(!btn)return;
    const slotRow=btn.closest(".individual-slot");
    const id=btn.dataset.v2Id,slot=btn.dataset.slot,person=modelPersonKey(); const state=V2_STORAGE.getPersonalSlotState(id,person,slot)||{}; const action=btn.dataset.personalAction;
    if(action==="prior"){state.prior=!state.prior;}
    else {const value=btn.dataset.score==="unknown"?null:Number(btn.dataset.score);if(value===null)delete state[action];else state[action]=state[action]===value?undefined:value;if(state[action]===undefined)delete state[action];}
    V2_STORAGE.setPersonalSlotState(id,person,slot,state); invalidateDerivedData();
    if(editorStateFiltersActive()) render();
    else patchRenderedEditorSlot(slotRow,id,person,slot,state);
  });
  individualEditorList.addEventListener("input",e=>{
    const note=e.target.closest("textarea[data-personal-note]");
    if(!note)return;
    const person=modelPersonKey(),slot=note.dataset.slot,slotRow=note.closest(".individual-slot");
    queuePersonalNoteSave(note.dataset.v2Id,person,slot,note.value);
    // Keep the desktop and mobile editors synchronized when the viewport changes.
    slotRow?.querySelectorAll("textarea[data-personal-note]").forEach(other=>{if(other!==note&&other.value!==note.value)other.value=note.value;});
    const toggle=slotRow?.querySelector("[data-personal-note-toggle]");
    const panel=slotRow?.querySelector(".individual-slot-note-panel");
    const hasNote=note.value.trim().length>0;
    slotRow?.classList.toggle("has-persistent-note",hasNote);
    if(toggle){
      toggle.classList.toggle("has-note",hasNote);
      toggle.setAttribute("aria-expanded",hasNote||!panel?.hidden?"true":"false");
      let dot=toggle.querySelector("i");
      if(hasNote&&!dot){dot=document.createElement("i");dot.setAttribute("aria-hidden","true");toggle.appendChild(dot);}else if(!hasNote&&dot)dot.remove();
    }
    if(hasNote&&panel) panel.hidden=false;
  });
  individualEditorList.addEventListener("change",e=>{if(e.target.closest("textarea[data-personal-note]"))flushPersonalNoteSaves();});
}

const READER_SLOT_LABELS=Object.freeze({
  fr:Object.freeze({interest:"Intérêt",give:"Donner",receive:"Recevoir",dominant:"Position dominante",submissive:"Position soumise"}),
  en:Object.freeze({interest:"Interest",give:"Give",receive:"Receive",dominant:"Dominant",submissive:"Submissive"})
});
const READER_COMPATIBILITY_LABELS=Object.freeze({
  fr:Object.freeze({excellent:"👑 Compatibilité excellente",strong:"🔥 Très compatible",compatible:"✓ Compatible",later:"⏳ Pas maintenant",fantasy:"💭 Fantasme à discuter",limit:"🚫 Limite",incomplete:"? Incomplet"}),
  en:Object.freeze({excellent:"👑 Excellent match",strong:"🔥 Strong match",compatible:"✓ Compatible",later:"⏳ Not now",fantasy:"💭 Fantasy to discuss",limit:"🚫 Limit",incomplete:"? Incomplete"})
});
const READER_MINIMUM_ICONS=Object.freeze({"1":"⏳","2":"🙂","3":"🔥","4":"👑"});
const COMPATIBLE_STATUSES=new Set(["compatible","strong","excellent"]);
const STRONG_STATUSES=new Set(["strong","excellent"]);
let readerNamesCache={lang:'',value:null};
function readerNames() {
  if(readerNamesCache.lang===currentLang&&readerNamesCache.value) return readerNamesCache.value;
  const profile=runtimeProfile();
  const value=Object.freeze({
    personA:profile.personA?.name||localizedPersonFallback("personA"),
    personB:profile.personB?.name||localizedPersonFallback("personB")
  });
  readerNamesCache={lang:currentLang,value};
  return value;
}
const READER_SLOT_SHORT_LABELS=Object.freeze({
  fr:Object.freeze({interest:"INT",give:"DON",receive:"REC",dominant:"DOM",submissive:"SUB"}),
  en:Object.freeze({interest:"INT",give:"GIVE",receive:"RECV",dominant:"DOM",submissive:"SUB"})
});
function readerSlotLabel(slot) { return READER_SLOT_LABELS[currentLang]?.[slot]||slot; }
function readerSlotShortLabel(slot) { return READER_SLOT_SHORT_LABELS[currentLang]?.[slot]||String(slot||"").toUpperCase(); }
function readerVariantLabel(entity,variant,names=readerNames()) {
  if(variant===INTERACTION_MODEL.VARIANT.A_TO_B) return langText(`${names.personA} donne → ${names.personB} reçoit`, `${names.personA} gives → ${names.personB} receives`);
  if(variant===INTERACTION_MODEL.VARIANT.B_TO_A) return langText(`${names.personB} donne → ${names.personA} reçoit`, `${names.personB} gives → ${names.personA} receives`);
  if(variant===INTERACTION_MODEL.VARIANT.A_DOMINANT) return langText(`${names.personA} en position dominante ↔ ${names.personB} en position soumise`, `${names.personA} dominant → ${names.personB} submissive`);
  if(variant===INTERACTION_MODEL.VARIANT.B_DOMINANT) return langText(`${names.personB} en position dominante ↔ ${names.personA} en position soumise`, `${names.personB} dominant → ${names.personA} submissive`);
  return langText("Intérêt partagé", "Shared interest");
}
function scenarioBlockForVariant(entity,variant) {
  for(const [scenarioName,key] of [["a-dom","aDom"],["b-dom","bDom"]]) {
    if(INTERACTION_MODEL.variantForScenario(entity,scenarioName)===variant && entity?.scenarios?.[key]) return {block:entity.scenarios[key],scenarioKey:key};
  }
  const key=entity?.scenarios?.aDom?"aDom":entity?.scenarios?.bDom?"bDom":null;
  return key?{block:entity.scenarios[key],scenarioKey:key}:{block:{},scenarioKey:null};
}
function readerVariantInfo(entity,variant) {
  const source=scenarioBlockForVariant(entity,variant);
  return localizedScenarioInfo(entity,source.scenarioKey);
}
function readerCompatibilityLabel(status) { return READER_COMPATIBILITY_LABELS[currentLang]?.[status]||READER_COMPATIBILITY_LABELS[currentLang]?.incomplete||"?"; }
function readerScoreRole(slot) {
  return slot===INTERACTION_MODEL.SLOT.DOMINANT?"dom":slot===INTERACTION_MODEL.SLOT.SUBMISSIVE?"sub":null;
}
function readerEffectiveState(state) {
  const preference=preferenceScore(state);
  return {score:preference,source:preference!==null?"preference":"unknown"};
}
function readerCommonScoreEmoji(compatibility) {
  const c=compatibility||{};
  if(c.status==="limit") return "🚫";
  if(c.status==="fantasy") return "💭";
  if(c.status==="incomplete") return "?";
  return scoreButtonLabel(Number.isInteger(c.score)?c.score:null,null);
}
function readerTriedMark(state, forceDone=false) {
  const done=forceDone || state?.prior===true;
  const label=langText("Av.", "Bef.");
  const icon=done
    ? `<span class="couple-result-icon couple-result-icon-check" aria-hidden="true">✓</span>`
    : `<span class="couple-result-icon couple-result-icon-cross" aria-hidden="true"></span>`;
  return `<span class="couple-result-tick couple-before-tick${done?' is-done':''}">${icon}<span>${esc(label)}</span></span>`;
}
function readerNotesHtml(entityId,pair,names=readerNames()) {
  const notes=[
    ['person-a','personA',names.personA,pair?.personA?.slot],
    ['person-b','personB',names.personB,pair?.personB?.slot]
  ].map(([cssPerson,storagePerson,name,slot])=>[cssPerson,name,slot,String(slot?V2_STORAGE.getPersonalSlotNote(entityId,storagePerson,slot):"").trim()])
   .filter(([, , ,note])=>note);
  if(!notes.length) return `<div class="reader-note-stack is-empty" aria-hidden="true"></div>`;
  return `<div class="reader-note-stack">${notes.map(([person,name,slot,note])=>`<div class="reader-note-line"><div class="reader-note-name">${profileNameBadge(person,name,true)}</div><div class="reader-note-role" data-role="${esc(slot)}">${esc(readerSlotShortLabel(slot))}</div><div class="reader-note-text">${profileNamesInTextHtml(note,names)}</div></div>`).join("")}</div>`;
}
function readerResultPanel(entity,pair,names=readerNames()) {
  const c=pair.compatibility||{status:"incomplete",scoreA:null,scoreB:null};
  const aRole=readerScoreRole(pair.personA.slot), bRole=readerScoreRole(pair.personB.slot);
  const aEffective=readerEffectiveState(pair.personA.state);
  const bEffective=readerEffectiveState(pair.personB.state);
  const aScore=scoreButtonLabel(aEffective.score,aRole);
  const bScore=scoreButtonLabel(bEffective.score,bRole);
  const aResultKey=scoreResultKey(aEffective.score);
  const bResultKey=scoreResultKey(bEffective.score);
  const commonResultKey=["excellent","strong","compatible","later","fantasy","limit","incomplete"].includes(c.status)?c.status:"incomplete";
  const commonScore=readerCommonScoreEmoji(c);
  const done=pair.common?.doneTogether===true;
  const togetherLabel=done?langText("Déjà fait ensemble", "Already done together"):langText("Marquer fait ensemble", "Mark done together");
  const togetherShort=langText("Ens.", "Tog.");
  const togetherMark=done?"✓":"□";
  return `<div class="couple-result-grid" data-result="${esc(c.status)}" aria-label="${esc(readerCompatibilityLabel(c.status))}">
    <span class="couple-result-cell person-a" data-result-key="${aResultKey}" title="${esc(`${names.personA} · ${readerSlotLabel(pair.personA.slot)} : ${aScore}`)}"><span class="couple-result-emoji">${aScore}</span>${readerTriedMark(pair.personA.state,done)}</span>
    <span class="couple-result-cell person-b" data-result-key="${bResultKey}" title="${esc(`${names.personB} · ${readerSlotLabel(pair.personB.slot)} : ${bScore}`)}"><span class="couple-result-emoji">${bScore}</span>${readerTriedMark(pair.personB.state,done)}</span>
    <span class="couple-result-cell couple-result-common-cell" data-result-key="${commonResultKey}" title="${esc(readerCompatibilityLabel(c.status))}"><span class="couple-result-emoji">${commonScore}</span><button class="couple-result-tick couple-together-tick${done?' is-done':''}" data-couple-action="together" data-v2-id="${esc(entity.id)}" data-variant="${esc(pair.variant)}" type="button" aria-pressed="${done?'true':'false'}" aria-label="${esc(togetherLabel)}" title="${esc(togetherLabel)}"><span aria-hidden="true">${togetherMark}</span><span>${togetherShort}</span></button></span>
  </div>`;
}
function readerPinButton(entity,pair) {
  const inSession=isVariantInSession(entity.id,pair.variant), blocked=pair.compatibility?.status==="limit";
  const sessionLabel=blocked?t('sessionLimitWarning'):(inSession?t('removeSession'):t('addSession'));
  return `<button class="couple-reader-pin${inSession?' is-selected':''}" data-couple-action="session" data-v2-id="${esc(entity.id)}" data-variant="${esc(pair.variant)}" type="button" ${blocked?'disabled':''} aria-label="${esc(sessionLabel)}" title="${esc(sessionLabel)}">📌</button>`;
}
function readerRiskHtml(info) {
  return info?.risk!=="normal"?`<div class="couple-reader-risk">${riskBadge({risk:info.risk})}</div>`:"";
}
function readerPracticeRowHtml(entity,pair,info,names,{rowClass="couple-practice-row",title=null,riskInfo=info,showRisk=true}={}) {
  const displayTitle=title||info?.title||entity.id;
  const explanationHtml=readerContextualExplanationHtml(entity,pair,info,names);
  const copy=`<div class="couple-practice-copy" title="${esc((info?.explanation||displayTitle||entity.id))}"><div class="couple-practice-title-line"><strong>${esc(displayTitle)}</strong></div>${explanationHtml?`<div class="couple-practice-description">${explanationHtml}</div>`:""}</div>`;
  const rail=`<div class="couple-practice-rail">${readerPinButton(entity,pair)}${showRisk?readerRiskHtml(riskInfo):""}</div>`;
  return `<div class="couple-reader-row ${rowClass}">${rail}${copy}${readerResultPanel(entity,pair,names)}${readerNotesHtml(entity.id,pair,names)}</div>`;
}
function readerCanGroupDirectionVariants(entity,variants) {
  if(INTERACTION_MODEL.axisOf(entity)!==INTERACTION_MODEL.AXIS.DIRECTION || variants.length<2) return false;
  const normalized=variants.map(({info})=>({
    title:String(info?.title||"").trim().toLocaleLowerCase(currentLang),
    category:String(info?.category||""),
    level:Number(info?.level||0),
    risk:String(info?.risk||"normal")
  }));
  const first=normalized[0];
  return normalized.every(item=>item.title===first.title && item.category===first.category && item.level===first.level && item.risk===first.risk);
}

function readerStatusMatches(pair,statusValue) {
  const c=pair.compatibility||{};
  if(statusValue==="coupleCompatible" && !COMPATIBLE_STATUSES.has(c.status)) return false;
  if(statusValue==="coupleStrong" && !STRONG_STATUSES.has(c.status)) return false;
  if(statusValue==="coupleLimit" && c.status!=="limit") return false;
  if(statusValue==="coupleFantasy" && c.status!=="fantasy") return false;
  if(statusValue==="coupleIncomplete" && c.status!=="incomplete") return false;
  if(statusValue==="together" && pair.common?.doneTogether!==true) return false;
  if(statusValue==="notTogether" && pair.common?.doneTogether===true) return false;
  return true;
}
function readerMinimumLabels(counts={}) {
  const fr=currentLang==="fr";
  return [
    ["",fr?"Tous":"All",counts.all],
    ["1",fr?"⏳ Pas maintenant":"⏳ Not now",counts[1]],
    ["2",fr?"🙂 Neutre":"🙂 Neutral",counts[2]],
    ["3",fr?"🔥 Envie":"🔥 Want",counts[3]],
    ["4",fr?"👑 Favori":"👑 Favorite",counts[4]]
  ];
}
function readerSelectedDsFilter(value) {
  return value === "b-dominant" ? "b-dominant" : "a-dominant";
}
function readerMinimumChipLabel(value) {
  return READER_MINIMUM_ICONS[String(value)] || (currentLang === "fr" ? "Tous" : "All");
}
function readerMinimumChipTitle(value) {
  const item=readerMinimumLabels({}).find(([v])=>String(v)===String(value));
  return item ? item[1] : "";
}
function readerMinimumSummary(value) {
  return value ? readerMinimumChipLabel(value) : (currentLang==='fr'?'Tous':'All');
}
function setReaderFilterState(key, value, persist = true) {
  if (Object.is(readerFilterState[key], value)) return false;
  readerFilterState[key] = value;
  if (persist) {
    const storageKey = ({ ds:"readerDsFilter", minOne:"readerMinOne", minTwo:"readerMinTwo", includeFantasy:"readerIncludeFantasy" })[key];
    if (storageKey) V2_STORAGE.setDisplay(storageKey, value);
  }
  return true;
}
function renderReaderMinimumChips(container,current,counters,side) {
  if (!container) return;
  const selected=String(current||"");
  const minimum=counters||{};
  const values=["","1","2","3","4"];
  container.innerHTML=values.map(value=>{
    const active=value===selected;
    const count=value===""?minimum.all:minimum[value];
    const title=`Minimum ${side} · ${readerMinimumChipTitle(value)}`;
    return `<button class="reader-filter-chip reader-min-chip${active?' is-active':''}" type="button" data-reader-min-side="${side}" data-reader-min="${value}" aria-pressed="${active?'true':'false'}" title="${esc(title)}"><span class="reader-filter-chip-text">${esc(readerMinimumChipLabel(value))}</span>${Number.isInteger(count)?`<span class="reader-filter-chip-count">${count}</span>`:""}</button>`;
  }).join("");
}
function renderReaderHeaderDs(profile,names,dsValue,counters={}) {
  if(!readerHeaderDs) return;
  const fixed=profile?.dynamic?.mode && profile.dynamic.mode!=="switch";
  readerHeaderDs.hidden=!isReadingMode||!!fixed;
  readerHeaderDs.setAttribute("aria-label",currentLang==="fr"?"Choisir la personne dominante":"Choose the dominant person");
  const labels={
    "a-dominant": currentLang==="fr"?`${names.personA} domine`:`${names.personA} is dominant`,
    "b-dominant": currentLang==="fr"?`${names.personB} domine`:`${names.personB} is dominant`
  };
  for(const btn of readerHeaderDsButtons){
    const value=readerSelectedDsFilter(btn.dataset.readerHeaderDs), active=value===dsValue;
    const count=counters?.[value];
    btn.classList.toggle("active",active);
    btn.setAttribute("aria-pressed",active?"true":"false");
    btn.innerHTML=`${readerDsChipHtml(value,names)}`;
    btn.setAttribute("title", labels[value]);
  }
}
function renderReaderFilterDock(profile,names,counters={ds:{},minimumOne:{},minimumTwo:{}},summaryStats=null) {
  if (!readerFilterDock) return;
  const fixed=profile?.dynamic?.mode && profile.dynamic.mode !== "switch";
  const { ds:dsValue, minOne, minTwo, includeFantasy } = readerFilterState;
  renderReaderHeaderDs(profile,names,dsValue,counters.ds||{});
  renderReaderMinimumChips(readerMinimumOneChips,minOne,counters.minimumOne||{},1);
  renderReaderMinimumChips(readerMinimumTwoChips,minTwo,counters.minimumTwo||{},2);
  if (readerFilterSummary) {
    const compatibleCount=Number.isFinite(summaryStats?.compatible) ? summaryStats.compatible : null;
    let summaryDs=dsValue;
    if(profile?.dynamic?.mode==='a-dom') summaryDs='a-dominant';
    else if(profile?.dynamic?.mode==='b-dom') summaryDs='b-dominant';
    const person=summaryDs==='b-dominant'?'person-b':'person-a';
    const dominantName=person==='person-b'?names.personB:names.personA;
    const verb=currentLang==='fr'?'domine':'dominant';
    const minimumText=minOne || minTwo ? `${readerMinimumSummary(minOne)} + ${readerMinimumSummary(minTwo)}` : (currentLang==='fr'?'Tous':'All');
    readerFilterSummary.innerHTML=`<span class="reader-filter-summary-inline"><span class="reader-filter-summary-name ${profilePersonClass(person)}">${esc(dominantName)}</span> ${esc(verb)} · ${esc(minimumText)}${includeFantasy?' · 💭':''}</span>`;
    if (readerFilterCompatCount) {
      if (compatibleCount===null) {
        readerFilterCompatCount.hidden = true;
        readerFilterCompatCount.textContent = '';
      } else {
        readerFilterCompatCount.hidden = false;
        readerFilterCompatCount.textContent = `${compatibleCount} ${currentLang==='fr'?'compat.':'matches'}`;
      }
    }
  }
  if (!readerFilterDock.dataset.initialized) {
    readerFilterDock.dataset.initialized="true";
    readerFilterDock.open=false;
  }
}
function configureReaderLogicControls(profile,names,counters={ds:{},minimumOne:{},minimumTwo:{}},summaryStats=null) {
  if(readerIncludeFantasy){
    readerIncludeFantasy.checked=readerFilterState.includeFantasy;
    const span=readerIncludeFantasy.closest("label")?.querySelector("span");
    if(span) span.textContent=currentLang==="fr"?"💭 Inclure les fantasmes avec les minima":"💭 Include fantasies with the minimums";
  }
  renderReaderFilterDock(profile,names,counters,summaryStats);
}
function configureEditorMinimumOptions(){
  if(!minFilterScore) return;
  const langKey=`edit-${currentLang}`;
  if(minFilterScore.dataset.editorLang===langKey) return;
  const previous=minFilterScore.value;
  const opts=currentLang==="fr"?[
    ["","Niveau minimum : tous"],["1","Pas maintenant ou mieux"],["2","Neutre ou mieux"],["3","🔥 Envie ou favori"],["4","👑 Favori"]
  ]:[
    ["","Minimum level: all"],["1","Not now or higher"],["2","Neutral or higher"],["3","🔥 Want or favorite"],["4","👑 Favorite"]
  ];
  minFilterScore.innerHTML=opts.map(([value,label])=>`<option value="${value}">${esc(label)}</option>`).join("");
  minFilterScore.value=opts.some(([value])=>value===previous)?previous:"";
  minFilterScore.dataset.editorLang=langKey;
}
function configureReaderStatusOptions() {
  const langKey=currentLang;
  if(status.dataset.readerLang===langKey) return;
  const previous=status.value;
  const options=currentLang==="fr"?[
    ["","Tous les résultats"],["coupleCompatible","✓ Compatibles"],["coupleStrong","🔥 Très compatibles"],["coupleLimit","🚫 Avec une limite"],["coupleFantasy","💭 Fantasmes"],["coupleIncomplete","? Incomplets"],["together","Déjà fait ensemble"],["notTogether","Jamais fait ensemble"]
  ]:[
    ["","All results"],["coupleCompatible","✓ Compatible"],["coupleStrong","🔥 Strong matches"],["coupleLimit","🚫 With a limit"],["coupleFantasy","💭 Fantasies"],["coupleIncomplete","? Incomplete"],["together","Done together"],["notTogether","Never done together"]
  ];
  status.innerHTML=options.map(([value,label])=>`<option value="${value}">${esc(label)}</option>`).join("");
  if(options.some(([value])=>value===previous)) status.value=previous;
  status.dataset.readerLang=langKey;
}
function getReaderModelSnapshot(profile=runtimeProfile()) {
  const profileKey = profileRenderCacheKey(profile);
  if(
    readerModelCache.revision===derivedDataRevision &&
    readerModelCache.lang===currentLang &&
    readerModelCache.profileKey===profileKey &&
    readerModelCache.value
  ) return readerModelCache.value;
  const rows=[];
  for(const entity of CATALOG_RUNTIME.all()){
    const response=V2_STORAGE.getReaderPractice(entity.id);if(!response)continue;
    const variants=(INTERACTION_MODEL.readingView(entity,response,profile)||[]).map(pair=>({pair,info:readerVariantInfo(entity,pair.variant)}));
    if(variants.length) {
      const notes=V2_STORAGE.getPersonalPractice(entity.id)?.notes||{};
      const searchText=variants.map(({info})=>`${info.title} ${info.explanation} ${info.category}`).join(" ")
        .concat(` ${notes.personA||""} ${notes.personB||""}`).toLowerCase();
      rows.push({entity,variants,searchText});
    }
  }
  readerModelCache={revision:derivedDataRevision,lang:currentLang,profileKey,value:rows};
  return rows;
}
function hideCoupleReader() {
  if(coupleReader) coupleReader.hidden=true;
  clearReaderStickyHeaderStates();
}
function renderCoupleReader() {
  if(!coupleReader||!coupleReaderList) return;
  /* The dominant can change from the Reading header without changing view mode.
     Recompute the theme before rebuilding the reader so the global background
     follows Dunk/Ferre immediately, without requiring a page refresh. */
  applyDominantViewTheme();
  configureReaderStatusOptions();
  coupleReader.hidden=false;
  hideIndividualEditor();
  const profile=runtimeProfile(), names=readerNames();
  const q=search.value.trim().toLowerCase(), maxLevel=experienceMaxLevel(), selectedCategory=category.value, selectedRisk=riskFilter.value;
  const { minOne, minTwo, includeFantasy } = readerFilterState;
  const dsFilter=readerSelectedDsFilter(readerFilterState.ds);
  const prepared=[];
  for(const {entity,variants:allVariants,searchText} of getReaderModelSnapshot(profile)) {
    const base=[];
    for(const {pair,info} of allVariants) {
      if(info.level>maxLevel) continue;
      if(selectedCategory&&info.category!==selectedCategory) continue;
      if(selectedRisk&&info.risk!==selectedRisk) continue;
      if(sessionOnlyFilter&&!isVariantInSession(entity.id,pair.variant)) continue;
      if(!readerStatusMatches(pair,status.value)) continue;
      base.push({pair,info});
    }
    if(!base.length) continue;
    if(q&&!searchText.includes(q)) continue;
    prepared.push({entity,variants:base});
  }

  const baseEntries=prepared.flatMap(({entity,variants})=>variants.map(({pair})=>({entity,pair})));
  const dsCounterSource=baseEntries.filter(({pair})=>INTERACTION_MODEL.readerMinimumMatches(pair,minOne,minTwo,includeFantasy));
  const minCounterSource=baseEntries.filter(({entity,pair})=>INTERACTION_MODEL.readerDsFilterMatches(entity,pair,profile,dsFilter));
  const dsCounters=INTERACTION_MODEL.readerFilterCounters(dsCounterSource,profile,includeFantasy,minOne,minTwo).ds;
  const minimumCounters=INTERACTION_MODEL.readerFilterCounters(minCounterSource,profile,includeFantasy,minOne,minTwo);

  const grouped=new Map(), activeReaderCandidates=[]; let visiblePractices=0,compatible=0;
  for(const {entity,variants} of prepared) {
    const candidates=variants.filter(({pair})=>
      INTERACTION_MODEL.readerDsFilterMatches(entity,pair,profile,dsFilter) &&
      INTERACTION_MODEL.readerMinimumMatches(pair,minOne,minTwo,includeFantasy)
    );
    if(!candidates.length) continue;
    const categoryName=candidates[0].info.category||"Autres";
    if(!grouped.has(categoryName)) grouped.set(categoryName,[]);
    grouped.get(categoryName).push({entity,variants:candidates}); visiblePractices++;
    for(const {pair,info} of candidates) {
      activeReaderCandidates.push({entity,pair,info});
      const st=pair.compatibility?.status;
      if(COMPATIBLE_STATUSES.has(st)) compatible++;
    }
  }
  activeReaderCandidatesCache={revision:derivedDataRevision,filterKey:readerActiveFilterKey(),value:activeReaderCandidates};
  configureReaderLogicControls(profile,names,{ds:dsCounters,minimumOne:minimumCounters.minimumOne,minimumTwo:minimumCounters.minimumTwo},{compatible});

  const categories=[...grouped.keys()].sort(compareCategories);
  const readerHeadNames=names;
  const desktopReaderHead=`<div class="desktop-reader-table-head" aria-hidden="true"><span class="desktop-reader-practice-head">${esc(currentLang==='fr'?'Pratique + description':'Practice + description')}</span><span class="desktop-reader-results-head"><span class="desktop-reader-results-title">${esc(currentLang==='fr'?'Résultats':'Results')}</span><b title="${esc(readerHeadNames.personA)}">${esc(readerHeadNames.personA)}</b><b title="${esc(readerHeadNames.personB)}">${esc(readerHeadNames.personB)}</b><b title="${esc(currentLang==='fr'?'Ensemble':'Together')}">${esc(currentLang==='fr'?'Ensemble':'Together')}</b></span><span class="desktop-reader-notes-head">${esc(currentLang==='fr'?'Notes / détails':'Notes / details')}</span></div>`;
  coupleReaderList.innerHTML=desktopReaderHead+categories.map(categoryName=>{
    const entries=grouped.get(categoryName), collapsed=isCategoryCollapsed(categoryName,"read"), color=(categoryName===CUSTOM_CATEGORY?CUSTOM_CATEGORY_COLOR:categoryColors[categoryName])||"#aaa";
    const practiceHtml=entries.map(({entity,variants})=>{
      if(readerCanGroupDirectionVariants(entity,variants)) {
        const base=variants[0].info;
        const rows=variants.map(({pair,info},index)=>`<div class="couple-group-variant-block" data-reader-variant="${esc(pair.variant)}" data-result="${esc(pair.compatibility?.status||'incomplete')}">${readerPracticeRowHtml(entity,pair,info,names,{rowClass:"couple-group-variant-row",title:base.title||entity.id,riskInfo:base,showRisk:index===0})}</div>`).join("");
        return `<article class="couple-practice couple-practice-grouped" data-v2-id="${esc(entity.id)}" data-reader-grouped="true"><div class="couple-group-variants">${rows}</div></article>`;
      }
      return variants.map(({pair,info})=>`<article class="couple-practice" data-v2-id="${esc(entity.id)}" data-reader-variant="${esc(pair.variant)}" data-result="${esc(pair.compatibility?.status||'incomplete')}">${readerPracticeRowHtml(entity,pair,info,names)}</article>`).join("");
    }).join("");
    const initialA=Array.from(String(names.personA||"A").trim())[0]?.toLocaleUpperCase(currentLang==="fr"?"fr-FR":"en-US")||"A";
    const initialB=Array.from(String(names.personB||"B").trim())[0]?.toLocaleUpperCase(currentLang==="fr"?"fr-FR":"en-US")||"B";
    const resultHead=`<span class="couple-result-head"><span><i class="reader-person-dot person-a" title="${esc(names.personA)}" aria-label="${esc(names.personA)}">${esc(initialA)}</i></span><span><i class="reader-person-dot person-b" title="${esc(names.personB)}" aria-label="${esc(names.personB)}">${esc(initialB)}</i></span><span><b><span class="profile-inline-text" title="${esc(currentLang==='fr'?'Ensemble':'Together')}" aria-label="${esc(currentLang==='fr'?'Ensemble':'Together')}">🔗</span></b></span></span>`;
    return `<section class="couple-reader-category${collapsed?' is-collapsed':''}" data-category="${esc(categoryName)}" style="--reader-category-color:${color}"><button class="couple-reader-category-head" data-reader-category-toggle="${esc(categoryName)}" type="button" aria-expanded="${collapsed?'false':'true'}"><span class="couple-reader-category-chevron">${collapsed?'▸':'▾'}</span><strong>${esc(localizedCategory(categoryName))}</strong><span class="couple-reader-category-count">${entries.length}</span>${resultHead}</button><div class="couple-reader-category-body"${collapsed?' hidden':''}>${practiceHtml}</div></section>`;
  }).join("");
  applyRenderedCategoryCollapseState("read");
  queueReaderStickyHeaderUpdate();
  coupleReaderEmpty.hidden=visiblePractices!==0;
  updateRandomEligibilitySummary();
}
if(coupleReaderList) coupleReaderList.addEventListener("click",e=>{
  const action=e.target.closest("button[data-couple-action]");
  if(action){
    const id=action.dataset.v2Id,variant=action.dataset.variant;
    if(action.dataset.coupleAction==="session"){
      toggleSessionVariant(id,variant);
      renderCoupleReader();
      return;
    }
    if(action.dataset.coupleAction==="together"){
      const entity=CATALOG_RUNTIME.get(id),pair=entity?INTERACTION_MODEL.readingPair(entity,variant,V2_STORAGE.getReaderPractice(id),runtimeProfile()):null;
      if(!pair) return;
      V2_STORAGE.setVariantCommonState(id,variant,{doneTogether:pair.common?.doneTogether!==true});
      invalidateDerivedData();
      if(isVariantInSession(id,variant)) renderSessionPanel(true);
      renderCoupleReader();
      return;
    }
  }
  const btn=e.target.closest("[data-reader-category-toggle]");if(!btn)return;toggleRenderedCategory(btn.dataset.readerCategoryToggle,"read");
});

let scheduledRenderFrame = 0;
let scheduledRenderTimer = 0;
function cancelScheduledRender() {
  if (scheduledRenderFrame) {
    cancelAnimationFrame(scheduledRenderFrame);
    scheduledRenderFrame = 0;
  }
  if (scheduledRenderTimer) {
    clearTimeout(scheduledRenderTimer);
    scheduledRenderTimer = 0;
  }
}
function scheduleRender(delay = 0) {
  if (scheduledRenderTimer) {
    clearTimeout(scheduledRenderTimer);
    scheduledRenderTimer = 0;
  }
  if (delay > 0) {
    scheduledRenderTimer = setTimeout(() => {
      scheduledRenderTimer = 0;
      scheduleRender();
    }, delay);
    return;
  }
  if (scheduledRenderFrame) return;
  scheduledRenderFrame = requestAnimationFrame(() => {
    scheduledRenderFrame = 0;
    render();
  });
}
function render() {
  cancelScheduledRender();
  if (isReadingMode) {
    hideIndividualEditor();
    renderCoupleReader();
  } else {
    hideCoupleReader();
    renderIndividualEditor();
  }
}



function readerActiveFilterKey() {
  return [
    derivedDataRevision, currentLang, experienceMaxLevel(),
    search.value.trim().toLowerCase(), category.value, status.value, riskFilter.value,
    sessionOnlyFilter ? 1 : 0,
    readerFilterState.ds, readerFilterState.minOne, readerFilterState.minTwo, readerFilterState.includeFantasy ? 1 : 0
  ].join("|");
}

function readerVariantMatchesActiveFilter(entity,pair,info,profile) {
  if(info.level>experienceMaxLevel()) return false;
  const selectedCategory=category.value, selectedRisk=riskFilter.value;
  if(selectedCategory&&info.category!==selectedCategory) return false;
  if(selectedRisk&&info.risk!==selectedRisk) return false;
  if(sessionOnlyFilter&&!isVariantInSession(entity.id,pair.variant)) return false;
  if(!readerStatusMatches(pair,status.value)) return false;
  const dsFilter=readerSelectedDsFilter(readerFilterState.ds);
  if(!INTERACTION_MODEL.readerDsFilterMatches(entity,pair,profile,dsFilter)) return false;
  const {minOne,minTwo,includeFantasy}=readerFilterState;
  if(!INTERACTION_MODEL.readerMinimumMatches(pair,minOne,minTwo,includeFantasy)) return false;
  const q=search.value.trim().toLowerCase();
  if(q){
    const notes=V2_STORAGE.getPersonalPractice(entity.id)?.notes||{};
    const haystack=`${info.title||''} ${info.explanation||''} ${info.category||''} ${notes.personA||''} ${notes.personB||''}`.toLowerCase();
    if(!haystack.includes(q)) return false;
  }
  return true;
}

function getRandomEligibilitySnapshot() {
  const filterKey=readerActiveFilterKey();
  if (randomEligibilityCache.revision === randomOptionsRevision && randomEligibilityCache.filterKey === filterKey && randomEligibilityCache.value) return randomEligibilityCache.value;
  const profile=runtimeProfile();
  const baseEligible=[], eligible=[];

  const addCandidate=(entity,pair,info)=>{
    if(!randomIncludeNeutralNeutral.checked && pair.compatibility?.scoreA===2 && pair.compatibility?.scoreB===2) return;
    if(randomOnlyNew.checked&&pair.common?.doneTogether===true) return;
    if(randomExcludeHighRisk.checked&&info.risk==='high'&&pair.compatibility?.status!=='fantasy') return;
    const candidate={entity,pair,info,key:`${entity.id}|${pair.variant}`};
    baseEligible.push(candidate);
    if(!randomNoRepeat.checked||!randomDrawHistory.has(candidate.key)) eligible.push(candidate);
  };

  const cached=activeReaderCandidatesCache.revision===derivedDataRevision && activeReaderCandidatesCache.filterKey===filterKey
    ? activeReaderCandidatesCache.value
    : null;
  if(Array.isArray(cached)){
    for(const {entity,pair,info} of cached) addCandidate(entity,pair,info);
  }else{
    for(const {entity,variants} of getReaderModelSnapshot(profile)) {
      for(const {pair,info} of variants) {
        if(readerVariantMatchesActiveFilter(entity,pair,info,profile)) addCandidate(entity,pair,info);
      }
    }
  }
  const snapshot={baseEligible,eligible};
  randomEligibilityCache={revision:randomOptionsRevision,filterKey,value:snapshot};
  return snapshot;
}

let lastRandomSummarySignature = "";
function updateRandomEligibilitySummary() {
  if(!isReadingMode) {
    lastRandomSummarySignature = "";
    if(randomCandidateInfo) randomCandidateInfo.textContent='';
    return;
  }
  const {baseEligible,eligible}=getRandomEligibilitySnapshot();
  const signature=[currentLang,readerFilterState.ds,readerFilterState.minOne,readerFilterState.minTwo,readerFilterState.includeFantasy?1:0,search.value,category.value,status.value,riskFilter.value,baseEligible.length,eligible.length,randomNoRepeat.checked?1:0].join('|');
  if(signature===lastRandomSummarySignature)return;
  lastRandomSummarySignature=signature;
  if(randomCandidateInfo) randomCandidateInfo.textContent=randomNoRepeat.checked
    ? (currentLang==='fr'?`Tirables avec le filtre de lecture : ${eligible.length}/${baseEligible.length}`:`Eligible with reading filter: ${eligible.length}/${baseEligible.length}`)
    : (currentLang==='fr'?`Tirables avec le filtre de lecture : ${baseEligible.length}`:`Eligible with reading filter: ${baseEligible.length}`);
}

function updateStats() {
  updateRandomEligibilitySummary();
  renderSessionPanel();
}

function focusRandomPickedPractice(picked) {
  if(!picked || !coupleReaderList) return;
  const categoryName=picked.info?.category||"";
  if(categoryName && isCategoryCollapsed(categoryName,"read")){
    setCategoryCollapsedState(categoryName,false,"read");
    applyRenderedCategoryCollapseState("read");
  }
  const focusTarget=()=>{
    coupleReaderList.querySelectorAll(".is-random-picked").forEach(el=>el.classList.remove("is-random-picked"));
    const id=CSS.escape(String(picked.entity.id));
    const variant=CSS.escape(String(picked.pair.variant));
    const target=
      coupleReaderList.querySelector(`[data-v2-id="${id}"][data-reader-variant="${variant}"]`) ||
      coupleReaderList.querySelector(`[data-v2-id="${id}"] [data-reader-variant="${variant}"]`) ||
      coupleReaderList.querySelector(`[data-v2-id="${id}"]`);
    if(!target) return;
    target.classList.add("is-random-picked");
    target.scrollIntoView({behavior:"smooth",block:"center",inline:"nearest"});
    window.setTimeout(()=>target.classList.remove("is-random-picked"),2200);
  };
  requestAnimationFrame(()=>requestAnimationFrame(focusTarget));
}

let lastRandomPick = null;
function renderLastRandomPick() {
  if(!lastRandomPick || !randomResult) return;
  const entity=CATALOG_RUNTIME.get(lastRandomPick.practiceId);
  if(!entity){ lastRandomPick=null; return; }
  const pair=INTERACTION_MODEL.readingPair(entity,lastRandomPick.variant,V2_STORAGE.getReaderPractice(entity.id),runtimeProfile());
  if(!pair){ lastRandomPick=null; return; }
  const info=readerVariantInfo(entity,lastRandomPick.variant);
  const already=isVariantInSession(entity.id,pair.variant), blocked=pair.compatibility?.status==='limit';
  const fantasy=pair.compatibility?.status==='fantasy';
  const explanationHtml=readerContextualExplanationHtml(entity,pair,info,readerNames()) || profileNamesInTextHtml(readerVariantLabel(entity,pair.variant),readerNames());
  const riskInline=info.risk==='normal'?'':`<span class="random-picked-risk">${riskBadge({risk:info.risk})}</span>`;
  randomResult.innerHTML=`<div class="random-picked-card"><div class="random-picked-title"><strong>${esc(info.title)}</strong>${riskInline}</div><div class="random-picked-explanation">${explanationHtml}</div><div class="random-picked-compat"><span class="random-picked-compat-value">${esc(readerCompatibilityLabel(pair.compatibility?.status))}</span></div>${fantasy?`<div class="random-fantasy-warning">${esc(t('randomFantasyWarning'))}</div>`:''}${lastRandomPick.cycleRestarted?`<div class="random-candidate-info">${currentLang==='fr'?'Nouveau cycle démarré automatiquement.':'A new cycle started automatically.'}</div>`:''}<div class="random-result-actions"><button class="random-session-btn" data-random-practice-id="${esc(entity.id)}" data-random-variant="${esc(pair.variant)}" type="button" ${already||blocked?'disabled':''}>${already?t('alreadyInSession'):t('addRandomToSession')}</button></div></div>`;
}

function pickRandomPractice() {
  if(!isReadingMode) setViewMode('read');
  const snapshot=getRandomEligibilitySnapshot(); let eligible=snapshot.eligible, cycleRestarted=false;
  if(!snapshot.baseEligible.length){
    lastRandomPick=null;
    randomResult.innerHTML=currentLang==='fr'?'Aucune configuration ne correspond aux critères actuels.':'No variant matches the current criteria.';
    updateRandomEligibilitySummary(); return;
  }
  if(randomNoRepeat.checked&&!eligible.length){
    randomDrawHistory.clear();
    saveRandomHistory();
    invalidateRandomEligibility();
    eligible=[...snapshot.baseEligible];
    cycleRestarted=true;
  }
  const picked=eligible[Math.floor(Math.random()*eligible.length)];
  if(!picked) return;
  if(randomNoRepeat.checked){
    randomDrawHistory.add(picked.key);
    saveRandomHistory();
    invalidateRandomEligibility();
  }

  /* The draw must use the active Reading filter, not destroy it. */
  focusRandomPickedPractice(picked);
  lastRandomPick={practiceId:picked.entity.id,variant:picked.pair.variant,cycleRestarted};
  renderLastRandomPick();
  updateRandomEligibilitySummary();
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
  for (const [k,v] of Object.entries(s)) {
    const el = document.getElementById(k);
    if (!el) continue;
    if (el.type === "checkbox") el.checked = !!v;
    else el.value = v ?? "";
  }
}

function loadSafety() {
  try { applySafety(V2_STORAGE.getSafety()); } catch(e) {}
}


let safetySaveTimer = null;
let safetyDirty = false;
function flushSafetySave() {
  clearTimeout(safetySaveTimer);
  safetySaveTimer = null;
  if (!safetyDirty) return;
  safetyDirty = false;
  V2_STORAGE.setSafety(getSafety());
}
function scheduleSafetySave() {
  safetyDirty = true;
  clearTimeout(safetySaveTimer);
  safetySaveTimer = setTimeout(flushSafetySave, 140);
}
safetyFields.forEach(el => el.addEventListener("input", scheduleSafetySave));
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") { flushPersonalNoteSaves(); flushSafetySave(); }
});
window.addEventListener("pagehide", () => { flushPersonalNoteSaves(); flushSafetySave(); });


search.addEventListener("input", () => scheduleRender(100));
[category, status, minFilterScore, riskFilter].forEach(el => el.addEventListener("input", () => scheduleRender()));
if(readerIncludeFantasy) readerIncludeFantasy.addEventListener("input",()=>{
  if(setReaderFilterState("includeFantasy", readerIncludeFantasy.checked===true)) scheduleRender();
});
for(const btn of readerHeaderDsButtons){
  btn.addEventListener("click",()=>{
    const profile=runtimeProfile();
    if(profile?.dynamic?.mode && profile.dynamic.mode!=="switch") return;
    if(setReaderFilterState("ds", readerSelectedDsFilter(btn.dataset.readerHeaderDs))) scheduleRender();
  });
}
[readerMinimumOneChips,readerMinimumTwoChips].filter(Boolean).forEach(container=>container.addEventListener("click",e=>{
  const btn=e.target.closest?.("[data-reader-min]"); if(!btn) return;
  const key=btn.dataset.readerMinSide==="2"?"minTwo":"minOne";
  if(setReaderFilterState(key, btn.dataset.readerMin||"")) scheduleRender();
}));
showSessionBtn.addEventListener("click", () => {
  if (!isReadingMode) setViewMode("read");
  sessionOnlyFilter = !sessionOnlyFilter;
  showSessionBtn.classList.toggle("active", sessionOnlyFilter);
  showSessionBtn.textContent = sessionOnlyFilter ? (currentLang==="fr"?"📌 Afficher tout":"📌 Show all") : t("showSession");
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

sessionModeList.addEventListener("change", (e) => {
  const checkbox=e.target.closest("input[data-session-mode-together]"); if(!checkbox)return;
  const id=checkbox.dataset.practiceId,variant=checkbox.dataset.variant,entity=CATALOG_RUNTIME.get(id); if(!entity)return;
  const pair=INTERACTION_MODEL.readingPair(entity,variant,V2_STORAGE.getReaderPractice(id),runtimeProfile()); if(!pair)return;
  V2_STORAGE.setVariantCommonState(id,variant,{doneTogether:!!checkbox.checked}); invalidateDerivedData(); renderSessionPanel(true); render();
});

resetSessionBtn.addEventListener("click", () => {
  if (!variantSessionOrder.length) return;
  const message=currentLang==="fr"?`Réinitialiser la séance ? Les ${variantSessionOrder.length} configuration${variantSessionOrder.length>1?'s':''} sélectionnées seront retirées. Les réponses ne seront pas effacées.`:`Reset the session? The ${variantSessionOrder.length} selected configuration${variantSessionOrder.length>1?'s':''} will be removed. Answers will not be deleted.`;
  if(!window.confirm(message))return; variantSessionOrder=[]; saveVariantSessionOrder(); sessionOnlyFilter=false; renderSessionPanel(true); render(); randomResult.innerHTML=`<strong>${t("sessionResetDone")}</strong> ${t("sessionNowEmpty")}`;
});

sessionList.addEventListener("click", (e) => {
  const btn=e.target.closest("[data-session-action]"); if(!btn||btn.disabled)return; const index=Number(btn.dataset.sessionIndex),action=btn.dataset.sessionAction;
  if(action==="remove"&&Number.isInteger(index)){variantSessionOrder.splice(index,1);saveVariantSessionOrder();renderSessionPanel(true);render();}
  else if((action==="up"||action==="down")&&Number.isInteger(index)){moveSessionEntry(index,action);render();}
});

experienceSwitch.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-experience-mode]");
  if (!btn) return;
  const mode = btn.dataset.experienceMode;
  if (!["beginner","confirmed","advanced"].includes(mode) || mode===experienceMode) return;
  experienceMode = mode;
  V2_STORAGE.setDisplay("experienceMode", experienceMode, false);
  renderExperienceModeUI();
    render();
});

randomBtn.addEventListener("click", pickRandomPractice);
randomResult.addEventListener("click", (e) => {
  const btn=e.target.closest("[data-random-practice-id][data-random-variant]");
  if(!btn||btn.disabled)return;
  const practiceId=btn.dataset.randomPracticeId, variant=btn.dataset.randomVariant;
  if(isVariantInSession(practiceId,variant))return;
  const entity=CATALOG_RUNTIME.get(practiceId); if(!entity)return;
  const pair=INTERACTION_MODEL.readingPair(entity,variant,V2_STORAGE.getReaderPractice(practiceId),runtimeProfile());
  if(!pair||pair.compatibility?.status==='limit'){window.alert(t("sessionLimitWarning"));btn.disabled=true;return;}
  toggleSessionVariant(practiceId,variant);
  renderLastRandomPick();
});
resetRandomCycleBtn.addEventListener("click", () => clearRandomHistory(true));
[randomOnlyNew, randomIncludeNeutralNeutral, randomExcludeHighRisk, randomNoRepeat].forEach(el => {
  const onChange = () => {
    if (randomDrawHistory.size) { randomDrawHistory.clear(); saveRandomHistory(); }
    invalidateRandomEligibility();
    saveRandomPreferences();
    updateRandomEligibilitySummary();
  };
  el.addEventListener("change", onChange);
});
function renderCategoryControls() {
  const currentValue = category.value;
  category.replaceChildren();
  const allOption = new Option(t("allCategories"), "");
  category.appendChild(allOption);
  for (const name of [...CATALOG_RUNTIME.categoryNames()].sort(compareCategories)) category.appendChild(new Option(localizedCategory(name), name));
  category.value = CATALOG_RUNTIME.categoryNames().includes(currentValue) ? currentValue : "";
}


const CUSTOM_ANATOMY_LABELS = Object.freeze({
  fr:Object.freeze({penis:"Pénis",testicles:"Testicules",vulva:"Vulve",vagina:"Vagin",breasts:"Seins / poitrine",prostate:"Prostate"}),
  en:Object.freeze({penis:"Penis",testicles:"Testicles",vulva:"Vulva",vagina:"Vagina",breasts:"Breasts / chest",prostate:"Prostate"})
});
function customPracticeRecord(id){return V2_STORAGE.getCustomPractices?.()?.practices?.[id]||null;}
function customPracticeAnatomyHtml(slot,selected=[]){
  const labels=CUSTOM_ANATOMY_LABELS[currentLang]||CUSTOM_ANATOMY_LABELS.fr, chosen=new Set(selected||[]);
  return Object.entries(labels).map(([key,label])=>`<label class="custom-anatomy-chip"><input type="checkbox" data-custom-anatomy="${slot}" value="${key}" ${chosen.has(key)?'checked':''}><span>${esc(label)}</span></label>`).join("");
}
function updateCustomPracticeModalLanguage(record=null){
  if(!customPracticeModal)return;
  const editing=!!record;
  customPracticeTitle.textContent=currentLang==='fr'?(editing?'Modifier la pratique':'Ajouter une pratique'):(editing?'Edit custom practice':'Add custom practice');
  customPracticeModal.querySelector('[data-custom-label="name"]').textContent=currentLang==='fr'?'Nom de la pratique':'Practice name';
  customPracticeModal.querySelector('[data-custom-label="description"]').textContent=currentLang==='fr'?'Description (facultatif)':'Description (optional)';
  const currentProfile=runtimeProfile();
  const currentA=currentProfile?.personA?.name||(currentLang==='fr'?'Personne A':'Person A');
  const currentB=currentProfile?.personB?.name||(currentLang==='fr'?'Personne B':'Person B');
  customPracticeModal.querySelector('[data-custom-variable-hint]').textContent=currentLang==='fr'
    ?'Insérer un nom dans la description :'
    :'Insert a name into the description:';
  const variableLabels={
    '{A}':`A · ${currentA}`,
    '{B}':`B · ${currentB}`,
    '{DOM}':currentLang==='fr'?'DOM · dominant de la variante':'DOM · dominant in this variant',
    '{SUB}':currentLang==='fr'?'SUB · soumis de la variante':'SUB · submissive in this variant'
  };
  customPracticeModal.querySelectorAll('[data-custom-insert]').forEach(button=>{
    const token=button.dataset.customInsert;
    button.textContent=variableLabels[token]||token;
    button.title=token;
  });
  customPracticeModal.querySelector('[data-custom-label="risk"]').textContent=currentLang==='fr'?'Risque':'Risk';
  customPracticeModal.querySelector('[data-custom-label="anatomy"]').textContent=currentLang==='fr'?'Conditions anatomiques (facultatif)':'Anatomy requirements (optional)';
  customPracticeModal.querySelector('[data-custom-label="dom"]').textContent='DOM';
  customPracticeModal.querySelector('[data-custom-label="sub"]').textContent='SUB';
  customPracticeModal.querySelector('[data-custom-hint]').textContent=currentLang==='fr'?'La pratique sera rangée automatiquement dans « Personnalisé ». Le même nom et la même description sont utilisés en français et en anglais.':'The practice is automatically stored in “Custom”. The same name and description are used in French and English.';
  customPracticeModal.querySelector('[data-custom-cancel]').textContent=currentLang==='fr'?'Annuler':'Cancel';
  customPracticeModal.querySelector('[data-custom-submit]').textContent=currentLang==='fr'?(editing?'Enregistrer':'Ajouter'):(editing?'Save':'Add');
  customPracticeName.placeholder=currentLang==='fr'?'Ex. Ma pratique personnalisée':'E.g. My custom practice';
  customPracticeDescription.placeholder=currentLang==='fr'?'Ex. {SUB} s’agenouille devant {DOM}.':'E.g. {SUB} kneels in front of {DOM}.';
  customPracticeRisk.options[0].textContent=currentLang==='fr'?'Courant':'Normal';
  customPracticeRisk.options[1].textContent=currentLang==='fr'?'Vigilance':'Caution';
  customPracticeRisk.options[2].textContent=currentLang==='fr'?'Élevé':'High';
  const dom=record?.anatomyBySlot?.dominant||[],sub=record?.anatomyBySlot?.submissive||[];
  customPracticeModal.querySelector('[data-custom-anatomy-list="dominant"]').innerHTML=customPracticeAnatomyHtml('dominant',dom);
  customPracticeModal.querySelector('[data-custom-anatomy-list="submissive"]').innerHTML=customPracticeAnatomyHtml('submissive',sub);
}
function openCustomPracticeModal(id='',opener=null){
  if(!customPracticeModal||isReadingMode)return;
  flushPersonalNoteSaves();
  const record=id?customPracticeRecord(id):null;
  customPracticeOpener=opener||document.activeElement;
  customPracticeId.value=record?.id||'';
  customPracticeName.value=record?.name||'';
  customPracticeDescription.value=record?.description||'';
  customPracticeRisk.value=record?.risk||'normal';
  updateCustomPracticeModalLanguage(record);
  customPracticeModal.hidden=false;
  customPracticeModal.setAttribute('aria-hidden','false');
  setAppBackgroundInert(true);
  requestAnimationFrame(()=>customPracticeName.focus());
}
function closeCustomPracticeModal(){
  if(!customPracticeModal||customPracticeModal.hidden)return;
  customPracticeModal.hidden=true;
  customPracticeModal.setAttribute('aria-hidden','true');
  setAppBackgroundInert(false);
  if(customPracticeOpener&&typeof customPracticeOpener.focus==='function'&&document.contains(customPracticeOpener))customPracticeOpener.focus();
  customPracticeOpener=null;
}
function customAnatomySelection(slot){return [...customPracticeModal.querySelectorAll(`input[data-custom-anatomy="${slot}"]:checked`)].map(input=>input.value);}
function saveCustomPracticeFromUi(){
  const name=customPracticeName.value.trim();
  if(!name){customPracticeName.focus();return;}
  const id=customPracticeId.value||undefined;
  V2_STORAGE.upsertCustomPractice({id,name,description:customPracticeDescription.value.trim(),risk:customPracticeRisk.value,anatomyBySlot:{dominant:customAnatomySelection('dominant'),submissive:customAnatomySelection('submissive')}});
  refreshCatalogRuntime();
  renderCategoryControls();
  renderExperienceModeUI();
  closeCustomPracticeModal();
  setCategoryCollapsedState(CUSTOM_CATEGORY,false,"edit");
  setCategoryCollapsedState(CUSTOM_CATEGORY,false,"read");
  render();
}
function deleteCustomPracticeFromUi(id){
  const record=customPracticeRecord(id);if(!record)return;
  const message=currentLang==='fr'?`Supprimer « ${record.name} » ?\n\nSes réponses, notes, états Avant / Fait ensemble et sa présence éventuelle dans la séance seront aussi supprimés.`:`Delete “${record.name}”?\n\nIts answers, notes, Before / Done together states and any session entry will also be deleted.`;
  if(!window.confirm(message))return;
  flushPersonalNoteSaves();
  V2_STORAGE.deleteCustomPractice(id);
  variantSessionOrder=(V2_STORAGE.getAllSessionEntries?.()||[]);refreshVariantSessionSet();
  randomDrawHistory=new Set((V2_STORAGE.getRandomHistoryEntries?.()||[]).map(entry=>`${entry.practiceId}|${entry.variant}`));
  refreshCatalogRuntime();
  renderCategoryControls();
  renderExperienceModeUI();
  renderSessionPanel(true);
  render();
}
if(addCustomPracticeBtn)addCustomPracticeBtn.addEventListener('click',()=>openCustomPracticeModal('',addCustomPracticeBtn));
if(customPracticeModal){
  customPracticeModal.addEventListener('click',e=>{if(e.target.closest('[data-custom-close]'))closeCustomPracticeModal();});
  customPracticeModal.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();closeCustomPracticeModal();}else focusTrapIn(customPracticeModal,e);});
}
if(customPracticeModal){
  customPracticeModal.addEventListener('click',e=>{
    const button=e.target.closest('[data-custom-insert]');
    if(!button)return;
    const token=button.dataset.customInsert||'';
    const textarea=customPracticeDescription;
    const start=Number.isInteger(textarea.selectionStart)?textarea.selectionStart:textarea.value.length;
    const end=Number.isInteger(textarea.selectionEnd)?textarea.selectionEnd:start;
    textarea.value=textarea.value.slice(0,start)+token+textarea.value.slice(end);
    const caret=start+token.length;
    textarea.focus();
    textarea.setSelectionRange?.(caret,caret);
  });
}
if(customPracticeForm)customPracticeForm.addEventListener('submit',e=>{e.preventDefault();saveCustomPracticeFromUi();});

function validateGlobalBackup(payload) {
  const inspection = V2_STORAGE.inspectBackup(payload);
  return inspection;
}

function setGlobalLastExchange(info) {
  V2_STORAGE.setLastExchange(info);
  lastExchange = info;
  renderExchangeInfo();
}

function importGlobalBackup(payload, options={}) {
  const result = V2_STORAGE.importBackup(payload, options);
  refreshCatalogRuntime();
  renderCategoryControls();
  renderExperienceModeUI();
  lastExchange = result.info || V2_STORAGE.getLastExchange();
  return result;
}

function personalBackupSourceProfile(payload){
  return payload?.participant?.profile || null;
}
function applyImportedPersonProfile(payload,backupType,targetPerson){
  const incoming=personalBackupSourceProfile(payload);if(!incoming||!PROFILE_API?.save)return;
  const current=runtimeProfile(),existing=current?.[targetPerson]||{};
  const anatomyKeys=['penis','testicles','vulva','vagina','breasts','prostate'];
  const nextPerson={
    ...existing,
    identityId:incoming.identityId||existing.identityId,
    name:incoming.name||existing.name,
    color:incoming.color||existing.color,
    anatomy:Object.fromEntries(anatomyKeys.map(key=>[key,incoming.anatomy?.[key]===true]))
  };
  PROFILE_API.save({...current,[targetPerson]:nextPerson,anatomyConfigured:true});
  runtimeProfileCache=null;
}

function resolvePersonalImportTarget(payload,backupType){
  return new Promise(resolve=>{
    const fr=currentLang==='fr',profile=runtimeProfile();
    const a=profile?.personA?.name||(fr?'Personne A':'Person A'),b=profile?.personB?.name||(fr?'Personne B':'Person B');
    const incoming=payload?.participant?.name||personalBackupSourceProfile(payload)?.name||(fr?'cette personne':'this person');
    const wrap=document.createElement('div');wrap.className='config-conflict-modal';
    wrap.innerHTML=`<div class="config-conflict-backdrop" data-person-target="cancel"></div><section class="config-conflict-dialog personal-target-dialog" role="dialog" aria-modal="true" aria-labelledby="personalTargetTitle"><span class="config-conflict-kicker">${fr?'Import individuel':'Individual import'}</span><h2 id="personalTargetTitle">${fr?'Dans quel profil importer ?':'Which profile should receive it?'}</h2><p>${fr?`La sauvegarde de <strong>${esc(incoming)}</strong> peut être importée dans l’un ou l’autre emplacement. Le profil personnel (pseudo, couleur, anatomie, réponses, notes et « Avant ») remplacera entièrement les données personnelles de l’emplacement choisi. Les données du couple actuel restent séparées ; « Fait ensemble » de l’ancien couple n’est jamais importé.`:`The backup for <strong>${esc(incoming)}</strong> can be imported into either slot. The personal profile (name, color, anatomy, answers, notes and Before states) will fully replace the personal data in the selected slot. Current couple data stays separate; “Done together” from the previous couple is never imported.`}</p><div class="config-conflict-actions personal-target-actions"><button type="button" class="config-conflict-local" data-person-target="personA">${esc(a)}</button><button type="button" class="config-conflict-incoming" data-person-target="personB">${esc(b)}</button><button type="button" class="config-conflict-cancel" data-person-target="cancel">${fr?'Annuler':'Cancel'}</button></div></section>`;
    document.body.appendChild(wrap);setAppBackgroundInert(true);
    const finish=value=>{document.removeEventListener('keydown',onKey);wrap.remove();setAppBackgroundInert(false);resolve(value);};
    const onKey=e=>{if(e.key==='Escape')finish(null);};document.addEventListener('keydown',onKey);
    wrap.querySelectorAll('[data-person-target]').forEach(el=>el.addEventListener('click',()=>{const v=el.dataset.personTarget;finish(v==='personA'||v==='personB'?v:null);}));
    requestAnimationFrame(()=>wrap.querySelector(`[data-person-target="${backupType==='person-b'?'personB':'personA'}"]`)?.focus());
  });
}

importJsonBtn.addEventListener("click", () => {
  if (isReadingMode) {
    randomResult.innerHTML = `<strong>${t("readOnlyActive")}</strong> ${t("disableRestore")}`;
    return;
  }
  importJsonFile.value = "";
  importJsonFile.click();
});

importJsonFile.addEventListener("change", async () => {
  if (isReadingMode) return;
  const file = importJsonFile.files && importJsonFile.files[0];
  if (!file) return;
  flushSafetySave();

  try {
    const parsed = JSON.parse(await file.text());
    const inspection = validateGlobalBackup(parsed);
    const backupType = inspection.type;
    let targetPerson = null;

    if (["person-a","person-b"].includes(backupType)) {
      targetPerson = await resolvePersonalImportTarget(parsed,backupType);
      if (!targetPerson) {
        randomResult.innerHTML = currentLang === "fr"
          ? "<strong>Import annulé.</strong> Aucune donnée n’a été modifiée."
          : "<strong>Import cancelled.</strong> No data was changed.";
        return;
      }
    }

    if (!window.confirm(globalBackupConfirmationText(backupType, parsed, inspection, targetPerson))) {
      randomResult.innerHTML = currentLang === "fr"
        ? "<strong>Restauration annulée.</strong> Aucune donnée n’a été modifiée."
        : "<strong>Restore cancelled.</strong> No data was changed.";
      return;
    }

    const result = importGlobalBackup(parsed, {targetPerson:targetPerson||undefined});
    if (targetPerson) applyImportedPersonProfile(parsed,backupType,targetPerson);
    if (["person-a","person-b"].includes(result.type)) {
      try { sessionStorage.setItem(MERGE_REVIEW_KEY, JSON.stringify({type:result.type, targetPerson:targetPerson||result.targetPerson||null, at:new Date().toISOString()})); } catch (_) {}
    }
    const label = backupTypeLabel(result.type);
    const configText = targetPerson
      ? (currentLang === "fr" ? ` · importé dans ${runtimeProfile()?.[targetPerson]?.name || (targetPerson==='personA'?'Personne A':'Personne B')}` : ` · imported into ${runtimeProfile()?.[targetPerson]?.name || (targetPerson==='personA'?'Person A':'Person B')}`)
      : "";
    const message = currentLang === "fr"
      ? `Sauvegarde ${label} restaurée${configText}. La page va être actualisée.`
      : `${label} backup restored${configText}. The page will now refresh.`;
    window.alert(message);
    window.location.reload();
  } catch (err) {
    console.error(err);
    const prefix = currentLang === "fr" ? "Restauration impossible :" : "Restore failed:";
    randomResult.innerHTML = `<strong>${prefix}</strong> ${esc(err && err.message ? err.message : t("invalidBackup"))}`;
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
  if (isReadingMode) {
    randomResult.innerHTML = `<strong>${t("readOnlyActive")}</strong> ${t("disableReset")}`;
    return;
  }

  const message = currentLang === "fr"
    ? "Réinitialiser la checklist ? Toutes les préférences, expériences antérieures, notes personnelles, données communes, l’historique de tirage, la sélection de séance et les réglages de sécurité seront effacés. Cette action est irréversible sans sauvegarde."
    : "Reset the checklist? All preferences, prior-experience flags, personal notes, shared data, random-draw history, session selection and safety settings will be deleted. This cannot be undone without a backup.";

  const ok = window.confirm(message);
  if (!ok) return;

  clearTimeout(safetySaveTimer);
  safetySaveTimer = null;
  safetyDirty = false;

  V2_STORAGE.resetAllUserData();
  refreshCatalogRuntime();
  renderCategoryControls();
  renderExperienceModeUI();
  lastSessionPanelSignature = "";
  lastExchange = null;
  clearSafetyForm();

  variantSessionOrder = []; refreshVariantSessionSet();
  randomDrawHistory.clear();
  renderSessionPanel();

  search.value = "";
  category.value = "";
  status.value = "";
  minFilterScore.value = "";
  setReaderFilterState("minOne", "");
  setReaderFilterState("minTwo", "");
  riskFilter.value = "";
  
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

function buildGlobalBackupPayload(type) {
  return V2_STORAGE.buildBackup(type, APP_VERSION);
}

function copyShareText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  let ok = false;
  try { ok = document.execCommand("copy"); } catch (_) {}
  area.remove();
  return Promise.resolve(ok);
}

async function shareCoupleConfiguration() {
  if (!PROFILE_API?.buildCoupleShareUrl) return;
  flushPersonalNoteSaves();
  flushSafetySave();
  const profile = runtimeProfile();
  const url = PROFILE_API.buildCoupleShareUrl(profile);
  const fingerprint = PROFILE_API.configurationFingerprint?.(profile) || "";
  const a = profile?.personA?.name || (currentLang === "fr" ? "Personne A" : "Person A");
  const b = profile?.personB?.name || (currentLang === "fr" ? "Personne B" : "Person B");
  const shareData = {
    title:"Checklist BDSM",
    text:currentLang === "fr"
      ? `Configuration Checklist BDSM de ${a} et ${b}. Ouvre ce lien pour utiliser exactement la même configuration.`
      : `BDSM Checklist configuration for ${a} and ${b}. Open this link to use the exact same configuration.`,
    url
  };
  let shared = false;
  let copied = false;
  if (navigator.share) {
    try { await navigator.share(shareData); shared = true; }
    catch (err) { if (err?.name === "AbortError") return; }
  }
  if (!shared) copied = await copyShareText(url);
  if (!shared && !copied) {
    randomResult.innerHTML = currentLang === "fr"
      ? `<strong>Partage impossible.</strong> Le navigateur n’a pas pu ouvrir le partage ni copier le lien.`
      : `<strong>Sharing failed.</strong> The browser could not open sharing or copy the link.`;
    return;
  }
  try {
    localStorage.setItem("bdsmChecklistSite_deviceMode_v1", "dual");
    if (fingerprint) localStorage.setItem("bdsmChecklistSite_coupleSyncFingerprint_v1", fingerprint);
  } catch (_) {}
  randomResult.innerHTML = currentLang === "fr"
    ? copied
      ? `<strong>Lien de configuration copié.</strong> Envoyez-le à votre partenaire avant de commencer. Il ne contient aucune réponse.`
      : `<strong>Configuration partagée.</strong> Le lien contient les profils, attributs, couleurs et la dynamique D/s, mais aucune réponse. Votre partenaire doit l’ouvrir avant de commencer.`
    : copied
      ? `<strong>Configuration link copied.</strong> Send it to your partner before they start. It contains no answers.`
      : `<strong>Configuration shared.</strong> The link contains profiles, anatomy, colors and the D/s dynamic, but no answers. Your partner should open it before starting.`;
}

function backupFileSafeName(value, fallback='Profil') {
  const cleaned=String(value||'')
    .trim()
    .replace(/[\\/:*?"<>|\u0000-\u001F\u007F]+/g,'_')
    .replace(/\s+/g,' ')
    .replace(/[. ]+$/g,'')
    .slice(0,64);
  return cleaned||fallback;
}

function exportBackup(type) {
  flushPersonalNoteSaves();
  flushSafetySave();

  const payload = buildGlobalBackupPayload(type);
  const d = new Date();
  const dateStamp = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
  const timeStamp = [String(d.getHours()).padStart(2, "0"), String(d.getMinutes()).padStart(2, "0")].join("-");

  const normalizedType = payload.backupType;
  const label = backupTypeLabel(normalizedType);
  const fileLabel = normalizedType === "full"
    ? (currentLang === "fr" ? "COMPLETE" : "FULL")
    : backupFileSafeName(payload?.participant?.name || (normalizedType === "person-a" ? runtimeProfile()?.personA?.name : runtimeProfile()?.personB?.name), normalizedType === "person-a" ? "Personne_A" : "Personne_B");
  download(`Checklist_BDSM_${fileLabel}_${dateStamp}_${timeStamp}.json`, JSON.stringify(payload,null,2), "application/json");

  const info = {
    type:"export",
    backupType:normalizedType,
    exportedAt:payload.exportedAt,
    lastModifiedAt:payload.exportedAt,
    appVersion:APP_VERSION,
    schemaVersion:payload.schemaVersion
  };
  setGlobalLastExchange(info);

  if (currentLang === "fr") {
    const content = normalizedType === "full"
      ? "profils, réponses individuelles, données du couple, sécurité et réglages"
      : normalizedType === "person-a"
        ? `profil et données personnelles de ${payload?.participant?.name || "Personne A"} (réponses, notes, Avant et pratiques personnalisées utilisées)`
        : `profil et données personnelles de ${payload?.participant?.name || "Personne B"} (réponses, notes, Avant et pratiques personnalisées utilisées)`;
    randomResult.innerHTML = `<strong>Sauvegarde ${label} créée :</strong> ${content} · schéma ${payload.schemaVersion} · ${APP_VERSION}.`;
  } else {
    const content = normalizedType === "full"
      ? "profiles, individual answers, couple data, safety and settings"
      : normalizedType === "person-a"
        ? `personal profile and data for ${payload?.participant?.name || "Person A"} (answers, notes, Before and used custom practices)`
        : `personal profile and data for ${payload?.participant?.name || "Person B"} (answers, notes, Before and used custom practices)`;
    randomResult.innerHTML = `<strong>${label} backup created:</strong> ${content} · schema ${payload.schemaVersion} · ${APP_VERSION}.`;
  }
}

shareCoupleConfigBtn?.addEventListener("click", shareCoupleConfiguration);
exportFullBtn.addEventListener("click", () => exportBackup("full"));
exportPersonABtn.addEventListener("click", () => exportBackup("person-a"));
exportPersonBBtn.addEventListener("click", () => exportBackup("person-b"));

if (showIncompatiblePractices) {
  showIncompatiblePractices.checked = runtimeProfile()?.showIncompatible === true;
  showIncompatiblePractices.addEventListener("change", () => {
    const current = runtimeProfile();
    runtimeProfileCache = PROFILE_API?.save?.({...current, showIncompatible: !!showIncompatiblePractices.checked}) || {...current, showIncompatible: !!showIncompatiblePractices.checked};
    invalidateDerivedData();
    render();
  });
}

loadSafety();
applyStaticLanguage();
renderLanguageButtons();
updateHelpLanguage();
updateAdultInfoLanguage();
renderCategoryControls();
renderExperienceModeUI();
renderExchangeInfo();
renderRoleUI();
renderSessionPanel();
render();
renderMergeReviewBanner();

requestAnimationFrame(showFirstUseGuideIfNeeded);
