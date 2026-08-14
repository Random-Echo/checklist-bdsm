
window.CHECKLIST_SITE = Object.freeze({
  languageKey: "bdsmChecklistSite_language_v1",
  legacyLanguageKey: "femdomChecklist_language_v1",
  adultKey: "bdsmChecklistSite_adultConfirmed_v1",
  legacyAdultKey: "femdom600_adultConfirmed_v1"
});
(function(){
  try {
    const cfg = window.CHECKLIST_SITE;
    let savedLang = localStorage.getItem(cfg.languageKey);
    if (savedLang !== "en" && savedLang !== "fr") {
      savedLang = localStorage.getItem(cfg.legacyLanguageKey);
      if (savedLang === "en" || savedLang === "fr") localStorage.setItem(cfg.languageKey, savedLang);
    }
    const lang = savedLang === "en" || savedLang === "fr"
      ? savedLang
      : (String(navigator.language || "").toLowerCase().startsWith("fr") ? "fr" : "en");
    document.documentElement.lang = lang;

    let adultConfirmed = localStorage.getItem(cfg.adultKey) === "true";
    if (!adultConfirmed && localStorage.getItem(cfg.legacyAdultKey) === "true") {
      adultConfirmed = true;
      localStorage.setItem(cfg.adultKey, "true");
    }
    if (!adultConfirmed) document.documentElement.classList.add("adult-gate-required");
  } catch (_) {
    document.documentElement.classList.add("adult-gate-required");
  }
})();
