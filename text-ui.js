(() => {
  'use strict';

  function create(options = {}) {
    const getLang = typeof options.getLang === 'function' ? options.getLang : () => 'fr';
    const getProfile = typeof options.getProfile === 'function' ? options.getProfile : () => ({});
    const getNames = typeof options.getNames === 'function' ? options.getNames : () => ({personA:'Personne A',personB:'Personne B'});
    const interaction = options.interaction;
    if (!interaction) throw new Error('Checklist text UI requires the interaction model.');
    const lang = () => getLang() === 'en' ? 'en' : 'fr';

    function esc(s) {
      return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
    }
    function profilePersonSide(person) {
      return (person === 'person-b' || person === 'personB') ? 'person-b' : 'person-a';
    }
    function profilePersonClass(person) {
      return profilePersonSide(person) === 'person-b' ? 'person-b' : 'person-a';
    }
    function profilePersonName(person, names = null) {
      const side = profilePersonSide(person);
      if (names) return side === 'person-b' ? names.personB : names.personA;
      const profile = getProfile();
      if (side === 'person-b') return profile.personB?.name || (lang() === 'fr' ? 'Personne B' : 'Person B');
      return profile.personA?.name || (lang() === 'fr' ? 'Personne A' : 'Person A');
    }
    function profileNameBadge(person, label = null, compact = false) {
      const name = label == null ? profilePersonName(person) : label;
      const cls = `${compact ? 'profile-inline-name is-compact' : 'profile-inline-name'} ${profilePersonClass(person)}`;
      return `<span class="${cls}">${esc(name)}</span>`;
    }
    function escapeRegExp(value) {
      return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    let profileNameMatcherCache={key:'',entries:[],regex:null};
    function profileNameMatcher(names=getNames()){
      const personA=String(names?.personA||'').trim(), personB=String(names?.personB||'').trim();
      const key=`${lang()}|${personA}|${personB}`;
      if(profileNameMatcherCache.key===key) return profileNameMatcherCache;
      const locale=lang()==='fr'?'fr':'en';
      const entries=[{person:'person-a',name:personA},{person:'person-b',name:personB}]
        .filter(entry=>entry.name)
        .sort((a,b)=>b.name.length-a.name.length)
        .map(entry=>({...entry,key:entry.name.toLocaleLowerCase(locale)}));
      const pattern=entries.map(entry=>escapeRegExp(entry.name)).join('|');
      let regex=null;
      if(pattern){try{regex=new RegExp(pattern,'giu');}catch(_){regex=null;}}
      profileNameMatcherCache={key,entries,regex};
      return profileNameMatcherCache;
    }
    function profileNamesInTextHtml(text,names=getNames()){
      const raw=String(text||''), matcher=profileNameMatcher(names);
      if(!raw||!matcher.regex||!matcher.entries.length) return esc(raw);
      const locale=lang()==='fr'?'fr':'en';
      matcher.regex.lastIndex=0;
      let html='',last=0;
      for(const match of raw.matchAll(matcher.regex)){
        const index=match.index??0;
        html+=esc(raw.slice(last,index));
        const matched=String(match[0]||''), key=matched.toLocaleLowerCase(locale);
        const entry=matcher.entries.find(item=>item.key===key);
        html+=entry?profileNameBadge(entry.person,matched,true):esc(matched);
        last=index+matched.length;
      }
      html+=esc(raw.slice(last));
      return html;
    }
    function readerDsChipHtml(value, names = getNames()) {
      const person = value === 'b-dominant' ? 'person-b' : 'person-a';
      const verb = lang() === 'fr' ? 'domine' : 'dominant';
      return `<span class="reader-ds-line reader-ds-line-name">${profileNameBadge(person, profilePersonName(person, names), true)}</span><span class="reader-ds-line reader-ds-line-verb"><span class="profile-inline-text">${esc(verb)}</span></span>`;
    }
    function readerVariantPeople(entity, variant, names = getNames()) {
      if (variant === interaction.VARIANT.A_TO_B || variant === interaction.VARIANT.A_DOMINANT) {
        return { fromPerson: 'person-a', toPerson: 'person-b', fromName: names.personA, toName: names.personB };
      }
      if (variant === interaction.VARIANT.B_TO_A || variant === interaction.VARIANT.B_DOMINANT) {
        return { fromPerson: 'person-b', toPerson: 'person-a', fromName: names.personB, toName: names.personA };
      }
      return null;
    }
    function stripEndingPunctuation(text) {
      return String(text || '').trim().replace(/\s*[.!?…]+$/u, '');
    }
    function normalizeWord(word) {
      return String(word || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }
    function lowercaseSentenceStart(text) {
      const raw=String(text||'').trim();
      return raw ? raw.charAt(0).toLocaleLowerCase(lang()==='fr'?'fr':'en') + raw.slice(1) : raw;
    }
    function startsWithPersonName(text,people) {
      const raw=String(text||'').trim().toLocaleLowerCase(lang()==='fr'?'fr':'en');
      const names=[people?.fromName,people?.toName].map(x=>String(x||'').trim().toLocaleLowerCase(lang()==='fr'?'fr':'en')).filter(Boolean);
      return names.some(name=>raw===name||raw.startsWith(name+' ')||raw.startsWith(name+'’')||raw.startsWith(name+"'"));
    }
    function looksLikeInfinitive(word) {
      const w = normalizeWord(word);
      return /(?:er|ir|re)$/.test(w) || w === 'etre' || w === 'avoir';
    }
    const FRENCH_IRREGULAR_VERBS=Object.freeze({
      etre:'est',avoir:'a',faire:'fait',aller:'va',pouvoir:'peut',vouloir:'veut',devoir:'doit',
      recevoir:'reçoit',envoyer:'envoie',nettoyer:'nettoie',essuyer:'essuie',appuyer:'appuie',
      employer:'emploie',payer:'paie',essayer:'essaie',tutoyer:'tutoie',vouvoyer:'vouvoie',
      ecrire:'écrit',decrire:'décrit',interdire:'interdit',dire:'dit',lire:'lit',suivre:'suit',
      attendre:'attend',vendre:'vend',prendre:'prend',apprendre:'apprend',comprendre:'comprend',
      mettre:'met',permettre:'permet',promettre:'promet',boire:'boit',conduire:'conduit',
      masser:'masse',embrasser:'embrasse',venerer:'vénère',adorer:'adore',porter:'porte',
      tirer:'tire',ordonner:'ordonne',controler:'contrôle',inspecter:'inspecte',obeir:'obéit',
      servir:'sert',dormir:'dort',sortir:'sort',partir:'part',mentir:'ment',sentir:'sent',
      ouvrir:'ouvre',offrir:'offre',souffrir:'souffre',courir:'court',rire:'rit',sourire:'sourit',
      lecher:'lèche',caresser:'caresse',stimuler:'stimule',immobiliser:'immobilise',attacher:'attache',
      appliquer:'applique',utiliser:'utilise',maintenir:'maintient',choisir:'choisit',punir:'punit',
      raser:'rase',laver:'lave',fixer:'fixe',retirer:'retire',preparer:'prépare',guider:'guide',
      respecter:'respecte',regarder:'regarde',manger:'mange',avaler:'avale',presenter:'présente',
      sagenouiller:'s’agenouille',alterner:'alterne',chercher:'cherche',frapper:'frappe',mordre:'mord',
      tenir:'tient',venir:'vient',devenir:'devient',obtenir:'obtient',retenir:'retient',soutenir:'soutient',
      voir:'voit',prevoir:'prévoit',savoir:'sait',croire:'croit',vivre:'vit',mourir:'meurt',reduire:'réduit',
      construire:'construit',detruire:'détruit',produire:'produit',traduire:'traduit',couvrir:'couvre',decouvrir:'découvre',
      cueillir:'cueille',accueillir:'accueille',integrer:'intègre',lever:'lève',mener:'mène',acheter:'achète',peser:'pèse'
    });
    const FRENCH_RECEIVER_VERBS=new Set(['recevoir','porter','etre','rester','dormir','garder','demander','envoyer','servir','suivre','presenter','sagenouiller','attendre','avaler','obeir','respecter','regarder','manger','boire','raser','laver']);
    const FRENCH_ACTOR_VERBS=new Set(['donner','faire','stimuler','attacher','immobiliser','appliquer','masser','embrasser','venerer','lecher','controler','inspecter','interdire','ordonner','punir','fixer','mettre','mordre','tirer','frapper','preparer','nettoyer','retirer','choisir','guider','maintenir','alterner','utiliser','caresser']);
    const FRENCH_BODY_PLURAL='pieds|bottes|chaussures|jambes|bras|mains|poignets|chevilles|tétons|seins|fesses|testicules|cuisses|cheveux|oreilles|orteils|bas|collants|vêtements|accessoires';
    const FRENCH_BODY_POSSESSIVE_PLURAL_RE=new RegExp(`\\bses\\s+(${FRENCH_BODY_PLURAL})(?:\\s+et\\s+(?:ses\\s+)?(${FRENCH_BODY_PLURAL}))?\\b`,'i');
    const FRENCH_BODY_POSSESSIVE_SINGULAR_RE=/\b(?:son|sa)\s+(corps|visage|vulve|clitoris|pénis|anus|prostate|peau|bouche|gorge|cou|entrejambe|lingerie|tenue|sextoy|collier|laisse|cage)\b/i;
    const FRENCH_BODY_PATTERNS=[
      /\b(les|des)\s+(pieds|bottes|chaussures|jambes|bras|mains|poignets|chevilles|tétons|seins|fesses|testicules|cuisses|cheveux|oreilles|orteils)\b/i,
      /\b(le|la|l['’])\s+(corps|visage|vulve|clitoris|pénis|anus|prostate|peau|bouche|gorge|cou|entrejambe)\b/i
    ];
    const FRENCH_PHRASE_SPLIT_RE=/(\s*,\s*|\s+et\s+|\s+ou\s+|\s+puis\s+)/i;
    const FRENCH_PHRASE_SEPARATOR_RE=/^(\s*,\s*|\s+et\s+|\s+ou\s+|\s+puis\s+)$/i;
    const readerExplanationHtmlCache=new Map();

    function conjugateFrenchInfinitive(word) {
      const source=String(word||'').trim();
      if(!source) return source;
      const lower=source.toLowerCase(), norm=normalizeWord(lower);
      let out=FRENCH_IRREGULAR_VERBS[norm];
      if(!out){
        if(/yer$/.test(norm)) out=lower.slice(0,-3)+'ie';
        else if(/er$/.test(norm)) out=lower.slice(0,-2)+'e';
        else if(/ir$/.test(norm)) out=lower.slice(0,-2)+'it';
        else if(/re$/.test(norm)) out=lower.slice(0,-2);
        else out=lower;
      }
      return out;
    }
    function conjugateFrenchPhrase(raw) {
      let text = String(raw || '').trim();
      if (!text) return '';
      const parts = text.split(FRENCH_PHRASE_SPLIT_RE);
      const converted = parts.map((part,index)=>{
        if (!part || FRENCH_PHRASE_SEPARATOR_RE.test(part)) return part;
        const seg = part.match(/^(\s*)(s['’]\s*|se\s+)?([A-Za-zÀ-ÿ-]+)(.*)$/iu);
        if (!seg) return index===0?lowercaseSentenceStart(part):part;
        const [,lead,reflexive='',verb='',rest='']=seg;
        if (!looksLikeInfinitive(verb)) return index===0?lowercaseSentenceStart(part):part;
        const conj=conjugateFrenchInfinitive(verb);
        const reflex=reflexive?reflexive.toLowerCase():'';
        return `${lead}${reflex}${conj}${rest}`;
      }).join('');
      return lowercaseSentenceStart(converted);
    }
    function frenchFirstInfinitive(raw) {
      const text=String(raw||'').trim();
      const seg=text.match(/^(?:s['’]\s*|se\s+)?([A-Za-zÀ-ÿ-]+)/iu);
      return seg?normalizeWord(seg[1]):'';
    }
    function namePresence(text, people) {
      const lower=String(text||'').toLocaleLowerCase(lang()==='fr'?'fr':'en');
      const from=String(people?.fromName||'').toLocaleLowerCase(lang()==='fr'?'fr':'en');
      const to=String(people?.toName||'').toLocaleLowerCase(lang()==='fr'?'fr':'en');
      return {from:!!from&&lower.includes(from),to:!!to&&lower.includes(to)};
    }
    function frenchReceiverVerb(first) { return FRENCH_RECEIVER_VERBS.has(first); }
    function frenchActorVerb(first) { return FRENCH_ACTOR_VERBS.has(first); }
    function frenchBodyTargetPhrase(text,toName) {
      if(FRENCH_BODY_POSSESSIVE_PLURAL_RE.test(text)) return {text:text.replace(FRENCH_BODY_POSSESSIVE_PLURAL_RE,(m,noun1,noun2)=>`les ${noun1}${noun2?` et ${noun2}`:''} de ${toName}`),changed:true};
      if(FRENCH_BODY_POSSESSIVE_SINGULAR_RE.test(text)) return {text:text.replace(FRENCH_BODY_POSSESSIVE_SINGULAR_RE,(m,noun)=>`${/^(vulve|prostate|peau|bouche|gorge|lingerie|tenue|laisse|cage)$/i.test(noun)?'la':'le'} ${noun} de ${toName}`),changed:true};
      for(const re of FRENCH_BODY_PATTERNS){
        if(re.test(text)) return {text:text.replace(re,(m,article,noun)=>`${article} ${noun} de ${toName}`.replace(/l['’]\s+/i,'l’')),changed:true};
      }
      return {text,changed:false};
    }
    function frenchSentenceWithMissingSubject(cleaned,people,presence) {
      const missing=presence.from&&!presence.to?{person:people.toPerson,name:people.toName}:{person:people.fromPerson,name:people.fromName};
      const converted=conjugateFrenchPhrase(cleaned);
      return `${missing.name} ${converted}`;
    }
    function frenchCompactBetweenSentence(cleaned, people) {
      const body=frenchBodyTargetPhrase(lowercaseSentenceStart(cleaned), people.toName);
      return `Entre ${people.fromName} et ${people.toName} : ${body.text}`;
    }
    function frenchSpecialNoVerbSentence(cleaned, people) {
      const text=String(cleaned||'').trim();
      if(!text) return '';
      if(/^Stimulation\s+anale\s+l[ée]g[èe]re/i.test(text)) {
        return `${people.toName} reçoit une stimulation anale légère de la part de ${people.fromName}, avec un doigt ou un petit sextoy`;
      }
      if(/^Porter\s+un\s+plug\s+anal$/i.test(text)) {
        return `${people.toName} porte un plug anal pour ${people.fromName}`;
      }
      return '';
    }
    function frenchNoNameInfinitiveSentence(entity,cleaned,people) {
      const first=frenchFirstInfinitive(cleaned);
      const axis=interaction.axisOf(entity);
      const rest=cleaned.replace(/^(?:s['’]\s*|se\s+)?[A-Za-zÀ-ÿ-]+\s*/u,'').trim();
      if(first==='recevoir'){
        const combo=cleaned.match(/^Recevoir\s+et\s+ex[ée]cuter\s+(.+)$/iu);
        if(combo){
          const obj=combo[1].replace(/^des\s+/i,'les ');
          return `${people.toName} reçoit et exécute ${obj.replace(/\s+par\s+message$/i,` de ${people.fromName} par message`)}`;
        }
        if(/^Recevoir\s+une\s+t[âa]che\s+[àa]\s+faire\s+dans\s+la\s+journ[ée]e$/iu.test(cleaned)) {
          return `${people.toName} reçoit de ${people.fromName} une tâche à faire dans la journée`;
        }
        if(/^Recevoir\s+des\s+ordres\s+en\s+direct\s+en\s+vid[ée]o$/iu.test(cleaned)) {
          return `${people.toName} reçoit en direct en vidéo les ordres de ${people.fromName}`;
        }
        return `${people.toName} reçoit de ${people.fromName} ${rest}`;
      }
      if(first==='demander'){
        return `${people.toName} demande à ${people.fromName} ${rest}`;
      }
      if(first==='envoyer' && axis===interaction.AXIS.ROLE){
        return `${people.toName} envoie à ${people.fromName} ${rest}`;
      }
      if(/^Faire\s+une\s+inspection\s+convenue\s+en\s+vid[ée]o$/iu.test(cleaned)){
        return `${people.fromName} inspecte ${people.toName} en vidéo, selon ce qui est convenu`;
      }
      if(/^Tirer\s+au\s+sort\s+une\s+t[âa]che\s+autoris[ée]e$/iu.test(cleaned)){
        return `${people.fromName} tire au sort une tâche autorisée pour ${people.toName}`;
      }
      if(/^Faire\s+(?:les|des)\s+t[âa]ches\s+m[ée]nag[èe]res/i.test(cleaned)||/^Faire\s+le\s+m[ée]nage/i.test(cleaned)){
        const converted=conjugateFrenchPhrase(cleaned);
        return `${people.toName} ${converted}, selon la consigne de ${people.fromName}`;
      }
      const subjectIsTo=frenchReceiverVerb(first)&&!frenchActorVerb(first);
      const subject=subjectIsTo?people.toName:people.fromName;
      const other=subjectIsTo?people.fromName:people.toName;
      let converted=conjugateFrenchPhrase(cleaned);
      if(subjectIsTo){
        if(first==='etre') return `${subject} ${converted} par ${other}`;
        if(first==='porter' && /plug\s+anal/i.test(cleaned)) return `${subject} ${converted} pour ${other}`;
        if(axis===interaction.AXIS.ROLE) return `${subject} ${converted}, selon la consigne de ${other}`;
        return `${subject} ${converted}, avec ${other}`;
      }
      const body=frenchBodyTargetPhrase(converted,other);
      if(body.changed) return `${subject} ${body.text}`;
      if(first==='donner') return `${subject} ${converted} à ${other}`;
      if(first==='ordonner') return `${subject} ordonne à ${other} ${rest}`;
      if(first==='interdire') return `${subject} ${converted} à ${other}`;
      if(first==='utiliser') return `${subject} ${converted} envers ${other}`;
      if(['fixer','choisir','preparer','préparer'].includes(first)) return `${subject} ${converted} pour ${other}`;
      if(first==='porter') return `${subject} ${converted}, avec ${other}`;
      return `${subject} ${converted}, avec ${other}`;
    }
    function frenchPassiveRewrite(cleaned,people,presence) {
      const from=escapeRegExp(people.fromName);
      if(presence.from&&!presence.to){
        const sextoy=new RegExp(`^Sextoy\s+contr[ôo]l[ée]\s+[àa]\s+distance\s+par\s+${from}$`,'iu');
        if(sextoy.test(cleaned)) return `${people.fromName} contrôle à distance le sextoy de ${people.toName}`;
        const chastete=new RegExp(`^Chastet[ée]\s+g[ée]r[ée]e?\s+[àa]\s+distance\s+par\s+${from}$`,'iu');
        if(chastete.test(cleaned)) return `${people.fromName} gère à distance la chasteté de ${people.toName}`;
      }
      return '';
    }
    function ensureFrenchTwoPersonSentence(entity,cleaned,people,names) {
      const special=frenchSpecialNoVerbSentence(cleaned,people);
      if(special) return special;
      const presence=namePresence(cleaned,people);
      if(presence.from&&presence.to) return cleaned;
      const passive=frenchPassiveRewrite(cleaned,people,presence);
      if(passive) return passive;
      const first=startsWithPersonName(cleaned,people)?'':frenchFirstInfinitive(cleaned);
      if(first&&looksLikeInfinitive(first)){
        if(presence.from||presence.to) return frenchSentenceWithMissingSubject(cleaned,people,presence);
        return frenchNoNameInfinitiveSentence(entity,cleaned,people);
      }
      if(presence.from&&!presence.to) {
        return `${cleaned} avec ${people.toName}`;
      }
      if(presence.to&&!presence.from) {
        return `${cleaned} avec ${people.fromName}`;
      }
      return frenchCompactBetweenSentence(cleaned,people);
    }
    function readerSharedExplanationHtml(raw,names=getNames()) {
      const cleaned=stripEndingPunctuation(raw);
      if(!cleaned) return '';
      const pseudoPeople={fromPerson:'person-a',toPerson:'person-b',fromName:names.personA,toName:names.personB};
      const presence=namePresence(cleaned,pseudoPeople);
      if((presence.from&&presence.to)||(!presence.from&&!presence.to)) return profileNamesInTextHtml(cleaned,names);
      const first=startsWithPersonName(cleaned,pseudoPeople)?'':frenchFirstInfinitive(cleaned);
      if(first&&looksLikeInfinitive(first)){
        const missing=presence.from?names.personB:names.personA;
        return profileNamesInTextHtml(`${missing} ${conjugateFrenchPhrase(cleaned)}`,names);
      }
      const missing=presence.from?names.personB:names.personA;
      return profileNamesInTextHtml(`Avec ${missing}, ${startsWithPersonName(cleaned,pseudoPeople)?cleaned:lowercaseSentenceStart(cleaned)}`,names);
    }
    function readerContextualExplanationHtml(entity,pair,info,names=getNames()) {
      const raw=String(info?.explanation||'').trim(), variant=pair?.variant||'';
      const cacheKey=`${lang()}|${names.personA}|${names.personB}|${entity?.id||''}|${variant}|${raw}`;
      if(readerExplanationHtmlCache.has(cacheKey)) return readerExplanationHtmlCache.get(cacheKey);
      const people=readerVariantPeople(entity,variant,names);
      let html='';
      if(!people) html=raw?readerSharedExplanationHtml(raw,names):'';
      else {
        const cleaned=stripEndingPunctuation(raw);
        if(!cleaned) html=`${profileNameBadge(people.fromPerson,people.fromName,true)} <span class="flow-arrow">→</span> ${profileNameBadge(people.toPerson,people.toName,true)}`;
        else if(lang()!=='fr'){
          const presence=namePresence(cleaned,people);
          if(presence.from&&presence.to) html=profileNamesInTextHtml(cleaned,names);
          else {
            const prefix=!presence.from&&!presence.to?`${people.fromName} / ${people.toName}: `:presence.from?`For ${people.toName}, `:`With ${people.fromName}, `;
            html=profileNamesInTextHtml(prefix+lowercaseSentenceStart(cleaned),names);
          }
        } else {
          const sentence=ensureFrenchTwoPersonSentence(entity,cleaned,people,names);
          html=profileNamesInTextHtml(stripEndingPunctuation(sentence),names);
        }
      }
      readerExplanationHtmlCache.set(cacheKey,html);
      return html;
    }

    return Object.freeze({
      esc,
      profilePersonClass,
      profileNameBadge,
      profileNamesInTextHtml,
      readerDsChipHtml,
      readerContextualExplanationHtml
    });
  }

  window.CHECKLIST_TEXT_UI = Object.freeze({ create });
})();
