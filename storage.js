(() => {
  'use strict';

  const CATALOG = window.CHECKLIST_CATALOG;
  const INTERACTION = window.CHECKLIST_INTERACTION_MODEL;
  if (!CATALOG || !INTERACTION) throw new Error('Checklist storage requires catalog and interaction model.');

  const SCHEMA_VERSION = 8;
  const PERSON_KEYS = Object.freeze(['personA','personB']);
  const PERSONAL_BACKUP_TYPES = Object.freeze(['person-a','person-b']);
  const BACKUP_TYPES = Object.freeze(['full', ...PERSONAL_BACKUP_TYPES]);
  const SITE_BACKUP_ID = 'bdsm-checklists-couple-v2';
  const KEYS = Object.freeze({
    personalResponses:'bdsmChecklistV2_personalResponses_v2',
    coupleState:'bdsmChecklistV2_coupleState_v1',
    safety:'bdsmChecklistV2_safety_v1',
    sessions:'bdsmChecklistV2_sessions_v2',
    display:'bdsmChecklistV2_display_v2',
    random:'bdsmChecklistV2_random_v2',
    meta:'bdsmChecklistV2_meta_v2',
    customPractices:'bdsmChecklistV2_customPractices_v1'
  });


  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const nowIso = () => new Date().toISOString();
  const isPerson = p => p === 'personA' || p === 'personB';
  function readJson(key, fallback) { try { const raw=localStorage.getItem(key); return raw === null ? clone(fallback) : JSON.parse(raw); } catch(_) { return clone(fallback); } }
  function writeJson(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  function validScore(v) { return Number.isInteger(v) && v >= 0 && v <= 5 ? v : null; }
  function nonEmptyString(v) { return typeof v === 'string' && v.length ? v : ''; }
  function joinUniqueNotes(values) {
    const seen=new Set(), out=[];
    for(const value of values||[]) {
      const note=nonEmptyString(value);
      if(!note||seen.has(note))continue;
      seen.add(note);
      out.push(note);
    }
    return out.join("\n\n");
  }

  const entityByV2 = new Map((CATALOG.entities || []).map(e => [e.id, e]));
  let personalResponsesCache = null;
  let coupleStateCache = null;
  let sessionsCache = null;
  let randomCache = null;
  let displayCache = null;
  let metaCache = null;
  let safetyCache = null;
  let customPracticesCache = null;
  const readerPracticeCache = new Map();
  const personalPracticeCache = new Map();

  function invalidateReaderPractice(v2Id=null){
    if(v2Id) readerPracticeCache.delete(v2Id);
    else readerPracticeCache.clear();
  }
  function invalidatePersonalDerived(v2Id=null){
    invalidateReaderPractice(v2Id);
    if(v2Id) personalPracticeCache.delete(v2Id); else personalPracticeCache.clear();
  }
  function resetRuntimeCaches(){
    personalResponsesCache=null; coupleStateCache=null; sessionsCache=null; randomCache=null; displayCache=null; metaCache=null; safetyCache=null; customPracticesCache=null;
    readerPracticeCache.clear(); personalPracticeCache.clear();
  }

  const CUSTOM_CATEGORY = 'Personnalisé';
  const CUSTOM_RISKS = new Set(['normal','caution','high']);
  const CUSTOM_ANATOMY = new Set(['penis','testicles','vulva','vagina','breasts','prostate']);
  const CUSTOM_SLOTS = Object.freeze(['dominant','submissive']);

  function normalizeCustomRequirementList(raw){
    const seen=new Set(),out=[];
    for(const value of Array.isArray(raw)?raw:[]){
      const anatomy=typeof value==='string'?value:value?.anatomy;
      if(!CUSTOM_ANATOMY.has(anatomy)||seen.has(anatomy))continue;
      seen.add(anatomy);out.push(anatomy);
    }
    return out;
  }
  function customRequirementsBySlot(raw){
    const out={};
    for(const slot of CUSTOM_SLOTS){
      const selected=normalizeCustomRequirementList(raw?.[slot]);
      if(selected.length)out[slot]=[{all:selected.map(anatomy=>({subject:'self',anatomy}))}];
    }
    return out;
  }
  function normalizeCustomPractice(raw,idHint=''){
    const id=typeof raw?.id==='string'&&/^custom-[A-Za-z0-9._-]+$/.test(raw.id)?raw.id:(typeof idHint==='string'&&/^custom-[A-Za-z0-9._-]+$/.test(idHint)?idHint:'');
    const name=typeof raw?.name==='string'?raw.name.trim().slice(0,160):'';
    const description=typeof raw?.description==='string'?raw.description.trim().slice(0,1200):'';
    if(!id||!name)return null;
    const risk=CUSTOM_RISKS.has(raw?.risk)?raw.risk:'normal';
    const anatomyBySlot={};
    for(const slot of CUSTOM_SLOTS){
      const direct=normalizeCustomRequirementList(raw?.anatomyBySlot?.[slot]);
      if(direct.length)anatomyBySlot[slot]=direct;
    }
    const createdAt=typeof raw?.createdAt==='string'&&raw.createdAt?raw.createdAt:nowIso();
    const updatedAt=typeof raw?.updatedAt==='string'&&raw.updatedAt?raw.updatedAt:createdAt;
    return{id,name,description,risk,anatomyBySlot,createdAt,updatedAt};
  }
  function emptyCustomPractices(){return{schemaVersion:1,practices:{}};}
  function normalizeCustomPractices(raw){
    const out=emptyCustomPractices();
    const source=raw?.practices&&typeof raw.practices==='object'?raw.practices:{};
    for(const [id,value] of Object.entries(source)){const practice=normalizeCustomPractice(value,id);if(practice)out.practices[practice.id]=practice;}
    return out;
  }
  function customPracticeToEntity(practice){
    const p=normalizeCustomPractice(practice,practice?.id);if(!p)return null;
    const block={category:CUSTOM_CATEGORY,practice:p.name,explanation:p.description||'',practiceEn:p.name,explanationEn:p.description||'',level:1,risk:p.risk};
    return{id:p.id,custom:true,scenarios:{aDom:clone(block),bDom:clone(block)},interaction:{axis:'ds-role',requirementsBySlot:customRequirementsBySlot(p.anatomyBySlot),scenarioProjection:{aDom:{personA:'dominant',personB:'submissive'},bDom:{personA:'submissive',personB:'dominant'}}}};
  }
  function customPracticesStore(){
    if(!customPracticesCache){const raw=readJson(KEYS.customPractices,emptyCustomPractices());customPracticesCache=normalizeCustomPractices(raw);if(JSON.stringify(raw)!==JSON.stringify(customPracticesCache))writeJson(KEYS.customPractices,customPracticesCache);}
    return customPracticesCache;
  }
  function loadCustomPractices(){return clone(customPracticesStore());}
  function saveCustomPractices(value){customPracticesCache=normalizeCustomPractices(value);writeJson(KEYS.customPractices,customPracticesCache);invalidatePersonalDerived();}
  function entityForId(id,customSource=null){
    const official=entityByV2.get(id);if(official)return official;
    const source=customSource?normalizeCustomPractices(customSource):customPracticesStore();
    return customPracticeToEntity(source?.practices?.[id]);
  }
  function customEntityList(){return Object.values(customPracticesStore().practices).map(customPracticeToEntity).filter(Boolean);}
  function generateCustomPracticeId(){
    const uuid=globalThis.crypto?.randomUUID?.();
    if(uuid)return`custom-${uuid}`;
    return`custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,12)}`;
  }
  function upsertCustomPractice(input){
    const store=customPracticesStore(),requestedId=typeof input?.id==='string'?input.id:'',id=requestedId&&/^custom-[A-Za-z0-9._-]+$/.test(requestedId)?requestedId:generateCustomPracticeId(),existing=store.practices[id];
    const normalized=normalizeCustomPractice({...input,id,createdAt:existing?.createdAt||input?.createdAt||nowIso(),updatedAt:nowIso()},id);
    if(!normalized)throw new Error('Custom practice name is required.');
    store.practices[id]=normalized;writeJson(KEYS.customPractices,store);invalidatePersonalDerived(id);touchCommon();return clone(normalized);
  }
  function removePracticeReferences(id){
    const personal=personalResponsesStore();delete personal.practices[id];persistPersonalResponses();
    const couple=coupleStateStore();delete couple.practices[id];persistCoupleState();
    const sessions=loadSessions();sessions.entries=(sessions.entries||[]).filter(e=>e.practiceId!==id);saveSessions(sessions);
    const random=loadRandom();random.history=(random.history||[]).filter(e=>e.practiceId!==id);saveRandom(random);
    invalidatePersonalDerived(id);
  }
  function deleteCustomPractice(id){
    const store=customPracticesStore();if(!store.practices[id])return false;delete store.practices[id];writeJson(KEYS.customPractices,store);removePracticeReferences(id);touchCommon();return true;
  }
  function mergeCustomPractices(base,incoming){
    const out=normalizeCustomPractices(base),src=normalizeCustomPractices(incoming);
    for(const [id,p] of Object.entries(src.practices)){
      const local=out.practices[id];
      if(!local){out.practices[id]=clone(p);continue;}
      const localTime=Date.parse(local.updatedAt||'')||0,incomingTime=Date.parse(p.updatedAt||'')||0;
      if(incomingTime>localTime)out.practices[id]=clone(p);
    }
    return out;
  }


  function normalizeParticipant(raw) {
    const out={};
    const preference=validScore(raw?.preference);
    if(preference!==null) out.preference=preference;
    if(raw?.prior===true) out.prior=true;
    const note=nonEmptyString(raw?.note); if(note) out.note=note;
    return out;
  }


  function emptyPersonalResponses(){ return {schemaVersion:INTERACTION.responseSchemaVersion||1,practices:{}}; }
  function normalizePersonalResponses(raw){
    const out=emptyPersonalResponses();
    for(const [id,practice] of Object.entries(raw?.practices||{})){
      const entity=entityForId(id); if(!entity) continue;
      const dst={persons:{personA:{},personB:{}},notes:{}};
      for(const person of PERSON_KEYS){
        for(const slot of slotsForPerson(entity,person)){
          const state=normalizeParticipant(practice?.persons?.[person]?.[slot]);
          if(Object.keys(state).length) dst.persons[person][slot]=state;
        }
      }
      if(Object.keys(dst.persons.personA).length||Object.keys(dst.persons.personB).length) out.practices[id]=dst;
    }
    return out;
  }

  function personalResponsesStore(){
    if (!personalResponsesCache){
      const raw=readJson(KEYS.personalResponses,emptyPersonalResponses());
      personalResponsesCache=normalizePersonalResponses(raw);
      if(JSON.stringify(raw)!==JSON.stringify(personalResponsesCache)) writeJson(KEYS.personalResponses,personalResponsesCache);
    }
    return personalResponsesCache;
  }
  function loadPersonalResponses(){ return clone(personalResponsesStore()); }
  function savePersonalResponses(v){ personalResponsesCache = normalizePersonalResponses(v); invalidatePersonalDerived(); writeJson(KEYS.personalResponses, personalResponsesCache); }
  function persistPersonalResponses(){ writeJson(KEYS.personalResponses, personalResponsesStore()); }

  function emptyCoupleState(){ return {schemaVersion:2,practices:{}}; }
  function normalizeVariantCommon(raw){ const out={}; if(raw?.doneTogether===true) out.doneTogether=true; return out; }
  function commonHasData(raw){ return normalizeVariantCommon(raw).doneTogether===true; }
  function normalizeCoupleState(raw){
    const out=emptyCoupleState();
    for(const [id,p] of Object.entries(raw?.practices||{})){
      const entity=entityForId(id); if(!entity) continue;
      const variants={};
      for(const variant of INTERACTION.variantsForEntity(entity)){
        const state=normalizeVariantCommon(p?.variants?.[variant]);
        if(commonHasData(state))variants[variant]=state;
      }
      if(Object.keys(variants).length) out.practices[id]={variants};
    }
    return out;
  }

  function coupleStateStore(){
    if (!coupleStateCache) coupleStateCache = normalizeCoupleState(readJson(KEYS.coupleState, emptyCoupleState()));
    return coupleStateCache;
  }
  function loadCoupleState(){ return clone(coupleStateStore()); }
  function saveCoupleState(v){ coupleStateCache = normalizeCoupleState(v); invalidateReaderPractice(); writeJson(KEYS.coupleState, coupleStateCache); }
  function persistCoupleState(){ writeJson(KEYS.coupleState, coupleStateStore()); }
  function markVariantParticipantsPrior(v2Id,entity,variant){
    const slots=INTERACTION.participantSlotsForVariant?.(entity,variant);
    if(!slots) return false;
    const store=personalResponsesStore();
    const p=ensurePracticePersons(store.practices[v2Id]||{persons:{personA:{},personB:{}},notes:{}});
    let changed=false;
    for(const person of PERSON_KEYS){
      const slot=slots[person];
      if(!slotAllowedForPerson(entity,person,slot))continue;
      const state=normalizeParticipant(p.persons[person][slot]);
      if(state.prior!==true){state.prior=true;changed=true;}
      p.persons[person][slot]=state;
    }
    if(!changed)return false;
    store.practices[v2Id]=p;
    invalidatePersonalDerived(v2Id);
    persistPersonalResponses();
    touchPerson('personA');
    touchPerson('personB');
    return true;
  }
  function setVariantCommonState(v2Id,variant,state){
    const entity=entityForId(v2Id);
    if(!entity||!INTERACTION.variantsForEntity(entity).includes(variant))return false;
    const store=coupleStateStore(),normalized=normalizeVariantCommon(state),p=store.practices[v2Id]||{variants:{}};
    if(commonHasData(normalized)){
      p.variants[variant]=normalized;
      markVariantParticipantsPrior(v2Id,entity,variant);
    }else{
      delete p.variants[variant];
    }
    if(Object.keys(p.variants).length)store.practices[v2Id]=p;else delete store.practices[v2Id];
    invalidateReaderPractice(v2Id);
    persistCoupleState();
    touchCommon();
    return true;
  }

  function emptySafety(){ return {schemaVersion:1,values:{}}; }
  function emptySessions(){ return {schemaVersion:2,entries:[]}; }
  function emptyDisplay(){ return {schemaVersion:2,common:{}}; }
  function emptyRandom(){ return {schemaVersion:2,preferences:null,history:[]}; }
  function emptyMeta(){ return {schemaVersion:2,initialized:false,lastModifiedAt:'',modifiedAt:{personA:'',personB:'',common:''},lastExchange:null}; }

  function sessionKey(entry){ return `${entry?.practiceId||''}|${entry?.variant||''}`; }
  function normalizeVariantEntries(rawEntries){ const seen=new Set(), out=[]; for(const e of Array.isArray(rawEntries)?rawEntries:[]){const entity=entityForId(e?.practiceId);if(!entity||!INTERACTION.variantsForEntity(entity).includes(e?.variant))continue;const k=sessionKey(e);if(seen.has(k))continue;seen.add(k);out.push({practiceId:e.practiceId,variant:e.variant});}return out; }
  function sessionsStore(){
    if(!sessionsCache){const r=readJson(KEYS.sessions,emptySessions());sessionsCache={schemaVersion:2,entries:normalizeVariantEntries(r?.entries)};}
    return sessionsCache;
  }
  function loadSessions(){ return clone(sessionsStore()); }
  function saveSessions(v){ sessionsCache={schemaVersion:2,entries:normalizeVariantEntries(v?.entries)};writeJson(KEYS.sessions,sessionsCache); }
  function randomStore(){
    if(!randomCache){const r=readJson(KEYS.random,emptyRandom());randomCache={schemaVersion:2,preferences:r?.preferences&&typeof r.preferences==='object'?clone(r.preferences):null,history:normalizeVariantEntries(r?.history)};}
    return randomCache;
  }
  function loadRandom(){ return clone(randomStore()); }
  function saveRandom(v){ randomCache={schemaVersion:2,preferences:v?.preferences&&typeof v.preferences==='object'?clone(v.preferences):null,history:normalizeVariantEntries(v?.history)};writeJson(KEYS.random,randomCache); }
  function displayStore(){
    if(!displayCache){const r=readJson(KEYS.display,emptyDisplay());displayCache={schemaVersion:2,common:r?.common&&typeof r.common==='object'?clone(r.common):{}};}
    return displayCache;
  }
  function loadDisplay(){ return clone(displayStore()); }
  function saveDisplay(v){ displayCache={schemaVersion:2,common:v?.common&&typeof v.common==='object'?clone(v.common):{}};writeJson(KEYS.display,displayCache); }
  function metaStore(){
    if(!metaCache){metaCache=readJson(KEYS.meta,emptyMeta());metaCache.modifiedAt=metaCache.modifiedAt||{personA:'',personB:'',common:''};}
    return metaCache;
  }
  function getMeta(){ return clone(metaStore()); }
  function setMeta(m){ metaCache=clone(m);writeJson(KEYS.meta,metaCache); }
  function touchPerson(person){const m=getMeta(),now=nowIso();m.modifiedAt[person]=now;m.lastModifiedAt=now;m.initialized=true;setMeta(m);}
  function touchCommon(){const m=getMeta(),now=nowIso();m.modifiedAt.common=now;m.lastModifiedAt=now;m.initialized=true;setMeta(m);}

  function slotsForPerson(entity,person){
    return typeof INTERACTION.slotsForPerson === 'function' ? INTERACTION.slotsForPerson(entity,person) : INTERACTION.slotsForEntity(entity);
  }
  function slotAllowedForPerson(entity,person,slot){return slotsForPerson(entity,person).includes(slot);}
  function ensurePracticePersons(practice){practice.persons=practice.persons||{};practice.persons.personA=practice.persons.personA||{};practice.persons.personB=practice.persons.personB||{};return practice;}
  function getPersonalSlotState(v2Id,person,slot){if(!isPerson(person))return{};const entity=entityForId(v2Id);if(!entity||!slotAllowedForPerson(entity,person,slot))return{};return normalizeParticipant(personalResponsesStore()?.practices?.[v2Id]?.persons?.[person]?.[slot]);}
  function setPersonalSlotState(v2Id,person,slot,state){if(!isPerson(person))return false;const entity=entityForId(v2Id);if(!entity||!slotAllowedForPerson(entity,person,slot))return false;const store=personalResponsesStore(),p=ensurePracticePersons(store.practices[v2Id]||{persons:{personA:{},personB:{}},notes:{}}),normalized=normalizeParticipant(state);p.notes=p.notes||{};if(Object.keys(normalized).length)p.persons[person][slot]=normalized;else delete p.persons[person][slot];if(Object.keys(p.persons.personA).length||Object.keys(p.persons.personB).length)store.practices[v2Id]=p;else delete store.practices[v2Id];invalidatePersonalDerived(v2Id);persistPersonalResponses();touchPerson(person);return true;}
  function getPersonalSlotNote(v2Id,person,slot){return nonEmptyString(getPersonalSlotState(v2Id,person,slot)?.note);}
  function setPersonalSlotNote(v2Id,person,slot,value){const state=getPersonalSlotState(v2Id,person,slot);const note=nonEmptyString(value);if(note)state.note=note;else delete state.note;return setPersonalSlotState(v2Id,person,slot,state);}
  function getPersonalPracticeNote(v2Id,person){
    if(!isPerson(person))return"";const entity=entityForId(v2Id);if(!entity)return"";
    const raw=personalResponsesStore().practices?.[v2Id]?.persons?.[person];
    return joinUniqueNotes(slotsForPerson(entity,person).map(slot=>raw?.[slot]?.note));
  }
  function copyPersonalSlots(entity, person, raw){const out={};for(const slot of slotsForPerson(entity,person)){const state=normalizeParticipant(raw?.[slot]);if(Object.keys(state).length)out[slot]=state;}return out;}
  function noteFromSlots(slots){return joinUniqueNotes(Object.values(slots).map(state=>state?.note));}
  function getPersonalPractice(v2Id){
    if(personalPracticeCache.has(v2Id))return personalPracticeCache.get(v2Id);
    const entity=entityForId(v2Id);if(!entity)return null;
    const p=personalResponsesStore().practices?.[v2Id];
    const personA=Object.freeze(copyPersonalSlots(entity,'personA',p?.persons?.personA));
    const personB=Object.freeze(copyPersonalSlots(entity,'personB',p?.persons?.personB));
    const result={persons:{personA,personB},notes:Object.freeze({personA:noteFromSlots(personA),personB:noteFromSlots(personB)})};
    Object.freeze(result.persons);Object.freeze(result);personalPracticeCache.set(v2Id,result);return result;
  }
  function getReaderPractice(v2Id){
    if(readerPracticeCache.has(v2Id)) return readerPracticeCache.get(v2Id);
    const entity=entityForId(v2Id);if(!entity)return null;
    const p=personalResponsesStore().practices?.[v2Id],couple=coupleStateStore(),variants={};
    for(const v of INTERACTION.variantsForEntity(entity))variants[v]=Object.freeze(normalizeVariantCommon(couple.practices?.[v2Id]?.variants?.[v]));
    const result={persons:{personA:Object.freeze(copyPersonalSlots(entity,'personA',p?.persons?.personA)),personB:Object.freeze(copyPersonalSlots(entity,'personB',p?.persons?.personB))},common:{variants:Object.freeze(variants)}};
    Object.freeze(result.persons);Object.freeze(result.common);Object.freeze(result);readerPracticeCache.set(v2Id,result);return result;
  }

  function getAllSessionEntries(){return clone(sessionsStore().entries);}
  function setSessionEntries(entries){const next={schemaVersion:2,entries:normalizeVariantEntries(entries)};saveSessions(next);touchCommon();return clone(sessionsStore().entries);}

  function getRandomHistoryEntries(){return clone(randomStore().history);}
  function setRandomHistoryEntries(entries){const r=loadRandom();r.history=normalizeVariantEntries(entries);saveRandom(r);return clone(randomStore().history);}
  function getRandomPreferences(){return clone(randomStore().preferences);}
  function setRandomPreferences(value){const r=loadRandom();r.preferences=value&&typeof value==='object'?clone(value):null;saveRandom(r);}

  function getDisplay(name,fallback){const d=displayStore();return Object.prototype.hasOwnProperty.call(d.common,name)?clone(d.common[name]):clone(fallback);}
  function setDisplay(name,value){const d=displayStore();if(value===undefined)delete d.common[name];else d.common[name]=clone(value);saveDisplay(d);}

  function getLastModified(){return getMeta().lastModifiedAt||'';}
  function getLastExchange(){return getMeta().lastExchange||null;}
  function setLastExchange(info){const m=getMeta();m.lastExchange=clone(info);m.initialized=true;setMeta(m);}

  function safetyStore(){if(!safetyCache)safetyCache=readJson(KEYS.safety,emptySafety());return safetyCache;}
  function getSafety(){return clone(safetyStore().values||{});}
  function setSafety(values){const s=safetyStore();s.values=values&&typeof values==='object'?clone(values):{};writeJson(KEYS.safety,s);touchCommon();}




  function currentProfile(){return window.CHECKLIST_PROFILE_API?.get?.()||null;}



  function installActiveData(data){
    resetRuntimeCaches();
    saveCustomPractices(data.customPractices||emptyCustomPractices());
    savePersonalResponses(data.personalResponses||emptyPersonalResponses());
    saveCoupleState(data.coupleState||emptyCoupleState());
    writeJson(KEYS.safety,data.safety||emptySafety());
    saveSessions(data.sessions||emptySessions());
    saveDisplay(data.display||emptyDisplay());
    saveRandom(data.random||emptyRandom());
    const meta=data.meta&&typeof data.meta==='object'?clone(data.meta):emptyMeta();
    meta.initialized=true;
    meta.lastModifiedAt=meta.lastModifiedAt||nowIso();
    meta.modifiedAt=meta.modifiedAt&&typeof meta.modifiedAt==='object'?meta.modifiedAt:{personA:'',personB:'',common:''};
    writeJson(KEYS.meta,meta);
  }

  function initializeCurrentStorage(){
    if(localStorage.getItem(KEYS.meta)!==null)return;
    const meta=emptyMeta();
    meta.initialized=true;
    meta.lastModifiedAt=nowIso();
    meta.modifiedAt={personA:meta.lastModifiedAt,personB:meta.lastModifiedAt,common:meta.lastModifiedAt};
    writeJson(KEYS.meta,meta);
  }

  function normalizeCurrentFullData(data){
    const customPractices=normalizeCustomPractices(data?.customPractices);
    const previous=customPracticesCache;customPracticesCache=customPractices;
    try{return{customPractices,personalResponses:normalizePersonalResponses(data?.personalResponses),coupleState:normalizeCoupleState(data?.coupleState),safety:data?.safety||emptySafety(),sessions:{schemaVersion:2,entries:normalizeVariantEntries(data?.sessions?.entries)},display:loadableDisplay(data?.display),random:loadableRandom(data?.random),meta:data?.meta||emptyMeta()};}finally{customPracticesCache=previous;}
  }
  function loadableDisplay(raw){return{schemaVersion:2,common:raw?.common&&typeof raw.common==='object'?clone(raw.common):{}};}
  function loadableRandom(raw){return{schemaVersion:2,preferences:raw?.preferences&&typeof raw.preferences==='object'?clone(raw.preferences):null,history:normalizeVariantEntries(raw?.history)};}

  function validateCurrentBackup(payload){
    if(!payload||typeof payload!=='object'||Array.isArray(payload)||payload.schemaVersion!==SCHEMA_VERSION||payload.siteBackupId!==SITE_BACKUP_ID)return null;
    if(!BACKUP_TYPES.includes(payload.backupType)||!payload.data||typeof payload.data!=='object')throw new Error('Invalid current backup.');
    if(PERSONAL_BACKUP_TYPES.includes(payload.backupType)&&(!payload.participant||typeof payload.participant!=='object'||!payload.participant.profile||typeof payload.participant.profile!=='object'))throw new Error('Invalid personal backup: participant profile missing.');
    if(payload.backupType==='full'&&payload.coupleConfiguration&&window.CHECKLIST_PROFILE_API?.configurationFingerprint){
      const actual=window.CHECKLIST_PROFILE_API.configurationFingerprint(payload.coupleConfiguration);
      if(payload.coupleConfigFingerprint&&payload.coupleConfigFingerprint!==actual)throw new Error('Invalid backup: couple configuration fingerprint mismatch.');
    }
    return{format:'v8',type:payload.backupType,hasCoupleConfiguration:!!payload.coupleConfiguration};
  }
  function inspectBackup(payload){
    const current=validateCurrentBackup(payload);
    if(current)return current;
    throw new Error('Sauvegarde incompatible : seul le format actuel est accepté / incompatible backup: only the current format is supported.');
  }

  function buildPersonalModelForPerson(person){
    const src=loadPersonalResponses(),out=emptyPersonalResponses();
    for(const [id,p] of Object.entries(src.practices||{})){
      const entity=entityForId(id);if(!entity)continue;
      const kept=copyPersonalSlots(entity,person,p?.persons?.[person]);
      if(Object.keys(kept).length){
        out.practices[id]={persons:{personA:{},personB:{}},notes:{}};
        out.practices[id].persons[person]=kept;
      }
    }
    return out;
  }
  function buildCustomPracticesForPerson(person,personalModel=null){
    const personal=personalModel||buildPersonalModelForPerson(person),all=customPracticesStore(),out=emptyCustomPractices();
    for(const id of Object.keys(personal.practices||{}))if(all.practices[id])out.practices[id]=clone(all.practices[id]);
    return out;
  }
  function buildBackup(type,appVersion){
    const backupType=type==='full'?'full':type==='person-a'?'person-a':'person-b',exportedAt=nowIso(),meta=getMeta(),profile=currentProfile();
    const coupleConfiguration=window.CHECKLIST_PROFILE_API?.coupleConfiguration?.(profile)||null;
    const coupleConfigFingerprint=coupleConfiguration&&window.CHECKLIST_PROFILE_API?.configurationFingerprint?.(coupleConfiguration)||null;
    if(backupType==='full')return{schemaVersion:SCHEMA_VERSION,siteBackupId:SITE_BACKUP_ID,appVersion,catalogVersion:CATALOG.schemaVersion||1,backupType,exportedAt,profile:clone(profile),coupleConfiguration:clone(coupleConfiguration),coupleConfigFingerprint,data:{customPractices:loadCustomPractices(),personalResponses:loadPersonalResponses(),coupleState:loadCoupleState(),safety:readJson(KEYS.safety,emptySafety()),sessions:loadSessions(),display:loadDisplay(),random:loadRandom(),meta:clone(meta)}};
    const person=backupType==='person-a'?'personA':'personB',identity=profile?.[person]||{};
    const personalResponses=buildPersonalModelForPerson(person),customPractices=buildCustomPracticesForPerson(person,personalResponses);
    const participantProfile=coupleConfiguration?.[person]||{identityId:identity.identityId||null,name:identity.name||null,color:identity.color||null,anatomy:clone(identity.anatomy||{})};
    return{schemaVersion:SCHEMA_VERSION,siteBackupId:SITE_BACKUP_ID,appVersion,catalogVersion:CATALOG.schemaVersion||1,backupType,exportedAt,participant:{slot:backupType,identityId:identity.identityId||null,name:identity.name||null,profile:clone(participantProfile)},data:{customPractices,personalResponses,modifiedAt:{person:meta.modifiedAt?.[person]||''}}};
  }

  function mergePersonalActive(data,sourcePerson,targetPerson,exportedAt){
    if(!isPerson(sourcePerson)||!isPerson(targetPerson))throw new Error('Invalid personal backup target.');
    const mergedCustom=mergeCustomPractices(loadCustomPractices(),data?.customPractices);saveCustomPractices(mergedCustom);
    const local=loadPersonalResponses(),incoming=normalizePersonalResponses(data?.personalResponses);
    for(const p of Object.values(local.practices||{})){if(p?.persons)p.persons[targetPerson]={};if(p?.notes)delete p.notes[targetPerson];}
    for(const [id,p] of Object.entries(incoming.practices||{})){const slots=p?.persons?.[sourcePerson]||{};if(!Object.keys(slots).length)continue;const dst=local.practices[id]||{persons:{personA:{},personB:{}},notes:{}};dst.notes=dst.notes||{};dst.persons[targetPerson]=clone(slots);local.practices[id]=dst;}
    for(const [id,p] of Object.entries(local.practices||{}))if(!Object.keys(p.persons?.personA||{}).length&&!Object.keys(p.persons?.personB||{}).length)delete local.practices[id];
    savePersonalResponses(local);
    const meta=getMeta();meta.modifiedAt[targetPerson]=data?.modifiedAt?.person||exportedAt||nowIso();meta.lastModifiedAt=nowIso();meta.initialized=true;setMeta(meta);return{sourcePerson,targetPerson};
  }

  function importBackup(payload,options={}){
    const info=inspectBackup(payload);
    let result;
    if(info.type==='full'){
      const data=normalizeCurrentFullData(payload.data);
      installActiveData(data);
      if(payload.profile&&window.CHECKLIST_PROFILE_API?.save)window.CHECKLIST_PROFILE_API.save(payload.profile);
      result={type:'full',format:'v8'};
    }else{
      const sourcePerson=info.type==='person-a'?'personA':'personB';
      const targetPerson=isPerson(options.targetPerson)?options.targetPerson:sourcePerson;
      const r=mergePersonalActive(payload.data,sourcePerson,targetPerson,payload.exportedAt);
      result={type:info.type,format:'v8',sourcePerson,targetPerson,participant:clone(payload.participant||null)};
    }
    const exchange={type:'import',backupType:result.type,exportedAt:payload.exportedAt||null,lastModifiedAt:nowIso(),appVersion:payload.appVersion||'current',sourceFormat:'v8'};
    setLastExchange(exchange);
    result.info=exchange;
    return result;
  }


  function resetAllUserData(){
    resetRuntimeCaches();
    for(const key of Object.values(KEYS))localStorage.removeItem(key);
    const meta=emptyMeta();
    meta.initialized=true;
    meta.lastModifiedAt=nowIso();
    meta.modifiedAt={personA:meta.lastModifiedAt,personB:meta.lastModifiedAt,common:meta.lastModifiedAt};
    installActiveData({meta});
  }

  initializeCurrentStorage();

  window.CHECKLIST_V2_STORAGE=Object.freeze({
    schemaVersion:SCHEMA_VERSION,
    getSafety,setSafety,
    getAllSessionEntries,setSessionEntries,
    getRandomHistoryEntries,setRandomHistoryEntries,getRandomPreferences,setRandomPreferences,
    getDisplay,setDisplay,getLastModified,getLastExchange,setLastExchange,
    getPersonalSlotState,setPersonalSlotState,getPersonalSlotNote,setPersonalSlotNote,getPersonalPractice,getPersonalPracticeNote,setVariantCommonState,getReaderPractice,
    getCustomPractices:loadCustomPractices,getCustomEntities:customEntityList,upsertCustomPractice,deleteCustomPractice,
    buildBackup,inspectBackup,importBackup,resetAllUserData
  });
})();
