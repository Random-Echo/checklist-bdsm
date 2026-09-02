(() => {
  'use strict';

  const FAVORITE_SCORE = 4;
  const FANTASY_SCORE = 5;
  const SCORE_BUTTON_ORDER = Object.freeze([0,1,FANTASY_SCORE,2,3,FAVORITE_SCORE]);
  const SCORE_TEXT=Object.freeze({
    fr:Object.freeze({full:Object.freeze(["🚫 Limite","Pas maintenant","Neutre","🔥 Envie"]),short:Object.freeze(["🚫","Pas maintenant","Neutre","🔥"])}),
    en:Object.freeze({full:Object.freeze(["🚫 Limit","Not now","Neutral","🔥 Want to"]),short:Object.freeze(["🚫","Not now","Neutral","🔥"])})
  });
  const SCORE_DESCRIPTION_KEYS=Object.freeze(["scoreLimitDesc","scoreLaterDesc","scoreNeutralDesc","scoreWantDesc"]);

  function create(options={}) {
    const getLang = typeof options.getLang === 'function' ? options.getLang : () => 'fr';
    const translate = typeof options.translate === 'function' ? options.translate : key => key;
    const escapeHtml = typeof options.escapeHtml === 'function'
      ? options.escapeHtml
      : value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
    const setBackgroundInert = typeof options.setBackgroundInert === 'function' ? options.setBackgroundInert : () => {};
    const lang = () => getLang() === 'en' ? 'en' : 'fr';

    function validScore(value) {
      return Number.isInteger(value) && value >= 0 && value <= FANTASY_SCORE ? value : null;
    }
    function favoriteSymbol() { return "👑"; }
    function scoreLabel(value, compact=false, role=null) {
      const v=validScore(value);
      if(v===null) return translate("unknown");
      if(v===FANTASY_SCORE) return compact ? "💭" : translate("scoreFantasy");
      if(v===FAVORITE_SCORE) {
        const symbol=favoriteSymbol(role);
        return compact ? symbol : `${symbol} ${translate("favoriteWord")}`;
      }
      const labels=SCORE_TEXT[lang()]||SCORE_TEXT.fr;
      return (compact?labels.short:labels.full)[v];
    }
    function scoreButtonLabel(value, role=null) {
      const v=validScore(value);
      if(v===null) return "?";
      if(v===FANTASY_SCORE) return "💭";
      if(v===FAVORITE_SCORE) return favoriteSymbol(role);
      return ["🚫","⏳","😐","🔥"][v] || "?";
    }
    function scoreDescription(value) {
      const v=validScore(value);
      if(v===null) return translate("unknown");
      if(v===FANTASY_SCORE) return translate("scoreFantasyDesc");
      if(v===FAVORITE_SCORE) return translate("scoreFavoriteDesc");
      return translate(SCORE_DESCRIPTION_KEYS[v]);
    }
    function scoreChoiceTitle(value, role=null) {
      const v=validScore(value);
      if(v===null) return translate("unknown");
      return `${scoreLabel(v,false,role)} — ${scoreDescription(v)}`;
    }
    function riskBadge(item) {
      if(item?.risk==="high") return `<button class="risk-badge risk-high" data-risk-info="high" type="button" title="${escapeHtml(translate("riskHighTitle"))}" aria-label="${escapeHtml(translate("riskHighTitle"))}">⚠</button>`;
      if(item?.risk==="caution") return `<button class="risk-badge risk-caution" data-risk-info="caution" type="button" title="${escapeHtml(translate("riskCautionTitle"))}" aria-label="${escapeHtml(translate("riskCautionTitle"))}">!</button>`;
      return "";
    }

    let riskInfoOverlay=null;
    let lastRiskInfoOpener=null;
    function ensureRiskInfoOverlay() {
      if(riskInfoOverlay) return riskInfoOverlay;
      const overlay=document.createElement("div");
      overlay.className="risk-info-overlay";
      overlay.hidden=true;
      overlay.setAttribute("aria-hidden","true");
      overlay.innerHTML=`<div class="risk-info-backdrop" data-risk-close="true"></div><section class="risk-info-dialog" role="dialog" aria-modal="true" aria-labelledby="riskInfoTitle"><div class="risk-info-head"><h2 id="riskInfoTitle"></h2><button class="risk-info-close" data-risk-close="true" type="button" aria-label="Fermer">✕</button></div><div class="risk-info-body" id="riskInfoBody"></div></section>`;
      document.body.appendChild(overlay);
      overlay.addEventListener("click",e=>{if(e.target.closest("[data-risk-close='true']"))closeRiskInfo();});
      riskInfoOverlay=overlay;
      return overlay;
    }
    function openRiskInfo(risk,opener=null) {
      const overlay=ensureRiskInfoOverlay();
      const high=risk==="high";
      const title=lang()==="fr"?(high?"⚠ Risque élevé":"! Vigilance"):(high?"⚠ High risk":"! Caution");
      const description=high?translate("riskHighTitle"):translate("riskCautionTitle");
      lastRiskInfoOpener=opener||document.activeElement;
      overlay.querySelector("#riskInfoTitle").textContent=title;
      overlay.querySelector("#riskInfoBody").innerHTML=`<p>${escapeHtml(description)}</p>`;
      overlay.hidden=false;
      overlay.setAttribute("aria-hidden","false");
      setBackgroundInert(true);
      requestAnimationFrame(()=>overlay.querySelector(".risk-info-close")?.focus());
    }
    function closeRiskInfo() {
      if(!riskInfoOverlay||riskInfoOverlay.hidden)return;
      riskInfoOverlay.hidden=true;
      riskInfoOverlay.setAttribute("aria-hidden","true");
      setBackgroundInert(false);
      if(lastRiskInfoOpener&&typeof lastRiskInfoOpener.focus==="function")lastRiskInfoOpener.focus();
    }
    function getRiskOverlay(){return riskInfoOverlay;}

    return Object.freeze({
      SCORE_BUTTON_ORDER,
      scoreButtonLabel,
      scoreChoiceTitle,
      riskBadge,
      openRiskInfo,
      closeRiskInfo,
      getRiskOverlay
    });
  }

  window.CHECKLIST_SCORE_UI=Object.freeze({create});
})();
