window.CHECKLIST_SITE = Object.freeze({
  languageKey: "bdsmChecklistSite_language_v1",
  adultKey: "bdsmChecklistSite_adultConfirmed_v1",
  onboardingKey: "bdsmChecklistSite_firstUseGuide_v1"
});

(() => {
  try {
    const { languageKey, adultKey } = window.CHECKLIST_SITE;
    const saved = localStorage.getItem(languageKey);
    const lang = saved === "fr" || saved === "en"
      ? saved
      : (String(navigator.language || "").toLowerCase().startsWith("fr") ? "fr" : "en");
    document.documentElement.lang = lang;
    if (localStorage.getItem(adultKey) !== "true") document.documentElement.classList.add("adult-gate-required");
  } catch (_) {
    document.documentElement.classList.add("adult-gate-required");
  }
})();
