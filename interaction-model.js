(() => {
  'use strict';
  const RESPONSE_SCHEMA_VERSION = 4;
  const AXIS = Object.freeze({
    SINGLE: 'single',
    DIRECTION: 'give-receive',
    ROLE: 'ds-role'
  });
  const SLOT = Object.freeze({
    INTEREST: 'interest',
    GIVE: 'give',
    RECEIVE: 'receive',
    DOMINANT: 'dominant',
    SUBMISSIVE: 'submissive'
  });
  const VARIANT = Object.freeze({
    SHARED: 'shared',
    A_TO_B: 'a-to-b',
    B_TO_A: 'b-to-a',
    A_DOMINANT: 'a-dominant',
    B_DOMINANT: 'b-dominant'
  });
  const READER_DS_FILTER = Object.freeze({
    BOTH: 'both',
    A_DOMINANT: 'a-dominant',
    B_DOMINANT: 'b-dominant'
  });
  const AXIS_VALUES = new Set(Object.values(AXIS));
  const READER_DS_FILTER_VALUES = new Set(Object.values(READER_DS_FILTER));
  const SLOTS_BY_AXIS = Object.freeze({
    [AXIS.SINGLE]: Object.freeze([SLOT.INTEREST]),
    [AXIS.DIRECTION]: Object.freeze([SLOT.GIVE, SLOT.RECEIVE]),
    [AXIS.ROLE]: Object.freeze([SLOT.DOMINANT, SLOT.SUBMISSIVE])
  });
  const VARIANTS_BY_AXIS = Object.freeze({
    [AXIS.SINGLE]: Object.freeze([VARIANT.SHARED]),
    [AXIS.DIRECTION]: Object.freeze([VARIANT.A_TO_B, VARIANT.B_TO_A]),
    [AXIS.ROLE]: Object.freeze([VARIANT.A_DOMINANT, VARIANT.B_DOMINANT])
  });

  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const isPerson = value => value === 'personA' || value === 'personB';
  const otherPerson = person => person === 'personA' ? 'personB' : person === 'personB' ? 'personA' : null;
  const score = value => Number.isInteger(value) && value >= 0 && value <= 5 ? value : null;

  function axisOf(entity) {
    const axis = entity?.interaction?.axis;
    return AXIS_VALUES.has(axis) ? axis : AXIS.SINGLE;
  }

  function slotsForEntity(entity) {
    return SLOTS_BY_AXIS[axisOf(entity)];
  }

  function declaredScenarioKeys(entity) {
    const scenarios = entity?.scenarios || {};
    return Object.keys(entity?.interaction?.scenarioProjection || {})
      .filter(key => scenarios[key]);
  }

  function variantsForEntity(entity) {
    const projected = declaredScenarioKeys(entity)
      .map(key => variantForScenario(entity, key === 'bDom' ? 'b-dom' : 'a-dom'))
      .filter(Boolean);
    return projected.length ? [...new Set(projected)] : VARIANTS_BY_AXIS[axisOf(entity)];
  }

  function slotsForPerson(entity, person) {
    if (!isPerson(person)) return [];
    const slots = declaredScenarioKeys(entity)
      .map(key => entity?.interaction?.scenarioProjection?.[key]?.[person])
      .filter(slot => slotsForEntity(entity).includes(slot));
    return slots.length ? [...new Set(slots)] : slotsForEntity(entity);
  }

  const PARTICIPANT_SLOTS = Object.freeze({
    [AXIS.SINGLE]:Object.freeze({
      [VARIANT.SHARED]:Object.freeze({personA:SLOT.INTEREST,personB:SLOT.INTEREST})
    }),
    [AXIS.DIRECTION]:Object.freeze({
      [VARIANT.A_TO_B]:Object.freeze({personA:SLOT.GIVE,personB:SLOT.RECEIVE}),
      [VARIANT.B_TO_A]:Object.freeze({personA:SLOT.RECEIVE,personB:SLOT.GIVE})
    }),
    [AXIS.ROLE]:Object.freeze({
      [VARIANT.A_DOMINANT]:Object.freeze({personA:SLOT.DOMINANT,personB:SLOT.SUBMISSIVE}),
      [VARIANT.B_DOMINANT]:Object.freeze({personA:SLOT.SUBMISSIVE,personB:SLOT.DOMINANT})
    })
  });
  function participantSlotsForVariant(entity, variant) {
    return PARTICIPANT_SLOTS[axisOf(entity)]?.[variant]||null;
  }

  function variantForScenario(entity, scenario) {
    const axis = axisOf(entity);
    if (axis === AXIS.SINGLE) return VARIANT.SHARED;
    if (axis === AXIS.ROLE) return scenario === 'b-dom' ? VARIANT.B_DOMINANT : scenario === 'a-dom' ? VARIANT.A_DOMINANT : null;
    if (axis === AXIS.DIRECTION) {
      const key = scenario === 'a-dom' ? 'aDom' : scenario === 'b-dom' ? 'bDom' : null;
      const projection = key ? entity?.interaction?.scenarioProjection?.[key] : null;
      if (!projection) return null;
      if (projection.personA === SLOT.GIVE && projection.personB === SLOT.RECEIVE) return VARIANT.A_TO_B;
      if (projection.personA === SLOT.RECEIVE && projection.personB === SLOT.GIVE) return VARIANT.B_TO_A;
    }
    return null;
  }

  function slotForScenarioPerson(entity, scenario, person) {
    if (!isPerson(person)) return null;
    const key = scenario === 'a-dom' ? 'aDom' : scenario === 'b-dom' ? 'bDom' : null;
    const projected = key ? entity?.interaction?.scenarioProjection?.[key]?.[person] : null;
    return slotsForEntity(entity).includes(projected) ? projected : null;
  }

  function normalizePersonalState(raw) {
    const out = {};
    const preference = score(raw?.preference);
    if (preference !== null) out.preference = preference;
    if (raw?.prior === true) out.prior = true;
    if (typeof raw?.note === 'string' && raw.note.length) out.note = raw.note;
    return out;
  }

  function emptyPersonalResponses() {
    return { schemaVersion:RESPONSE_SCHEMA_VERSION, practices:{} };
  }

  function effectiveScore(state) {
    return score(state?.preference);
  }

  function anatomyFor(profile, person, relation) {
    if (!profile || !isPerson(person)) return {};
    const target = relation === 'partner' ? otherPerson(person) : person;
    return profile?.[target]?.anatomy || {};
  }

  function alternativeSatisfied(alt, profile, person) {
    const all = Array.isArray(alt?.all) ? alt.all : [];
    return all.every(req => anatomyFor(profile, person, req.subject)?.[req.anatomy] === true);
  }

  function requirementsForSlot(entity, person, slot) {
    const scenarioRequirements = [];
    for (const key of declaredScenarioKeys(entity)) {
      if (entity?.interaction?.scenarioProjection?.[key]?.[person] !== slot) continue;
      const alternatives = entity?.interaction?.requirementsByScenario?.[key]?.[slot];
      if (Array.isArray(alternatives) && alternatives.length) scenarioRequirements.push(...alternatives);
    }
    if (scenarioRequirements.length) return scenarioRequirements;
    return entity?.interaction?.requirementsBySlot?.[slot] || [];
  }

  const SLOT_RESULT_UNSUPPORTED=Object.freeze({status:'unsupported',missing:Object.freeze([])});
  const SLOT_RESULT_UNKNOWN=Object.freeze({status:'unknown',missing:Object.freeze([])});
  const SLOT_RESULT_APPLICABLE=Object.freeze({status:'applicable',missing:Object.freeze([])});

  function evaluateSlot(entity, person, slot, profile) {
    if (!isPerson(person) || !slotsForPerson(entity, person).includes(slot)) return SLOT_RESULT_UNSUPPORTED;
    if (!profile?.anatomyConfigured) return SLOT_RESULT_UNKNOWN;
    const alternatives = requirementsForSlot(entity, person, slot);
    if (!alternatives.length) return SLOT_RESULT_APPLICABLE;
    if (alternatives.some(alt => alternativeSatisfied(alt, profile, person))) return SLOT_RESULT_APPLICABLE;
    const missing = [];
    for (const alt of alternatives) {
      for (const req of alt.all || []) {
        if (anatomyFor(profile, person, req.subject)?.[req.anatomy] !== true) missing.push({ ...req });
      }
    }
    return { status:'notApplicable', missing };
  }

  function pairForVariant(entity, variant, practiceResponse) {
    const slots = participantSlotsForVariant(entity, variant);
    if (!slots) return null;
    return {
      variant,
      personA: {
        slot:slots.personA,
        state:normalizePersonalState(practiceResponse?.persons?.personA?.[slots.personA])
      },
      personB: {
        slot:slots.personB,
        state:normalizePersonalState(practiceResponse?.persons?.personB?.[slots.personB])
      },
      common: clone(practiceResponse?.common?.variants?.[variant] || {})
    };
  }

  function variantApplicability(entity, variant, profile) {
    const slots = participantSlotsForVariant(entity, variant);
    if (!slots) return null;
    return {
      personA:evaluateSlot(entity, 'personA', slots.personA, profile),
      personB:evaluateSlot(entity, 'personB', slots.personB, profile)
    };
  }

  function variantAllowedByDynamic(entity, variant, profile) {
    if (axisOf(entity) !== AXIS.ROLE) return true;
    const mode = profile?.dynamic?.mode;
    if (mode === 'switch' || !mode) return true;
    if (mode === 'a-dom') return variant === VARIANT.A_DOMINANT;
    if (mode === 'b-dom') return variant === VARIANT.B_DOMINANT;
    return true;
  }

  function visibleVariants(entity, profile) {
    return variantsForEntity(entity).filter(variant => {
      if (!variantAllowedByDynamic(entity, variant, profile)) return false;
      const applicability = variantApplicability(entity, variant, profile);
      if (!applicability) return false;
      if (profile?.showIncompatible === true) return true;
      return applicability.personA.status !== 'notApplicable' && applicability.personB.status !== 'notApplicable';
    });
  }

  function compatibilityForStates(stateA, stateB) {
    const a = effectiveScore(stateA), b = effectiveScore(stateB);
    const base = { scoreA:a, scoreB:b, score:null, status:'incomplete' };
    if (a === null || b === null) return base;
    if (a === 0 || b === 0) return { ...base, score:0, status:'limit' };
    if (a === 5 || b === 5) return { ...base, status:'fantasy' };
    const score = Math.min(a,b);
    if (score <= 1) return { ...base, score, status:'later' };
    if (score === 2) return { ...base, score, status:'compatible' };
    if (score === 3) return { ...base, score, status:'strong' };
    return { ...base, score:4, status:'excellent' };
  }

  function normalizeReaderDsFilter(value) {
    return READER_DS_FILTER_VALUES.has(value) ? value : READER_DS_FILTER.BOTH;
  }

  function readerDsFilterMatches(entity, pair, profile, rawFilter) {
    if (axisOf(entity) !== AXIS.ROLE) return true;
    // A fixed D/s profile already exposes only its configured role variant.
    if (profile?.dynamic?.mode && profile.dynamic.mode !== 'switch') return true;
    const filter = normalizeReaderDsFilter(rawFilter);
    if (filter === READER_DS_FILTER.A_DOMINANT) return pair?.variant === VARIANT.A_DOMINANT;
    if (filter === READER_DS_FILTER.B_DOMINANT) return pair?.variant === VARIANT.B_DOMINANT;
    return true;
  }

  function normalizeReaderMinimum(value) {
    if (value === null || value === undefined || value === '') return null;
    const minimum = Number(value);
    return Number.isInteger(minimum) && minimum >= 1 && minimum <= 4 ? minimum : null;
  }

  function readerMinimumMatches(pair, rawMinimumOne, rawMinimumTwo, includeFantasy=false) {
    const minimumOne = normalizeReaderMinimum(rawMinimumOne);
    const minimumTwo = normalizeReaderMinimum(rawMinimumTwo);
    if (minimumOne === null && minimumTwo === null) return true;

    const a = score(pair?.compatibility?.scoreA);
    const b = score(pair?.compatibility?.scoreB);
    if (a === null || b === null) return false;
    // Dès qu'un minimum positif est demandé, une limite ne peut jamais passer.
    if (a === 0 || b === 0) return false;

    // Les deux minima ne sont liés ni à A ni à B. On compare le meilleur score
    // au seuil le plus haut, et l'autre score au seuil le plus bas.
    const thresholds = [minimumOne ?? 0, minimumTwo ?? 0].sort((x,y)=>x-y);
    const lowMinimum = thresholds[0], highMinimum = thresholds[1];
    const aFantasy = a === 5, bFantasy = b === 5;

    // 💭 reste hors de l'échelle de préférence réelle. Si les fantasmes sont
    // explicitement inclus, le fantasme peut occuper le seuil le plus haut ;
    // l'autre personne doit tout de même satisfaire le seuil le plus bas.
    if (aFantasy || bFantasy) {
      if (!includeFantasy) return false;
      if (aFantasy && bFantasy) return true;
      const realScore = aFantasy ? b : a;
      return realScore >= lowMinimum;
    }

    const lowScore = Math.min(a,b), highScore = Math.max(a,b);
    return highScore >= highMinimum && lowScore >= lowMinimum;
  }

  function readerFilterCounters(entries, profile, includeFantasy=false, rawMinimumOne='', rawMinimumTwo='') {
    const list = Array.isArray(entries) ? entries : [];
    const ds = { both:0, 'a-dominant':0, 'b-dominant':0 };
    const minimumOne = { all:0, 1:0, 2:0, 3:0, 4:0 };
    const minimumTwo = { all:0, 1:0, 2:0, 3:0, 4:0 };
    let fantasies = 0;
    const choices = ['',1,2,3,4];
    for (const entry of list) {
      const entity = entry?.entity, pair = entry?.pair;
      if (!entity || !pair) continue;
      ds.both++;
      if (readerDsFilterMatches(entity,pair,profile,READER_DS_FILTER.A_DOMINANT)) ds['a-dominant']++;
      if (readerDsFilterMatches(entity,pair,profile,READER_DS_FILTER.B_DOMINANT)) ds['b-dominant']++;
      for (const threshold of choices) {
        if (readerMinimumMatches(pair,threshold,rawMinimumTwo,includeFantasy)) minimumOne[threshold === '' ? 'all' : threshold]++;
        if (readerMinimumMatches(pair,rawMinimumOne,threshold,includeFantasy)) minimumTwo[threshold === '' ? 'all' : threshold]++;
      }
      if (pair?.compatibility?.status === 'fantasy') fantasies++;
    }
    return { ds, minimumOne, minimumTwo, fantasies };
  }

  function readingPair(entity, variant, practiceResponse, profile) {
    const pair = pairForVariant(entity, variant, practiceResponse);
    if (!pair) return null;
    return {
      ...pair,
      applicability:variantApplicability(entity, variant, profile),
      compatibility:compatibilityForStates(pair.personA.state, pair.personB.state)
    };
  }

  function readingView(entity, practiceResponse, profile) {
    return visibleVariants(entity, profile).map(variant => readingPair(entity, variant, practiceResponse, profile)).filter(Boolean);
  }

  window.CHECKLIST_INTERACTION_MODEL = Object.freeze({
    responseSchemaVersion:RESPONSE_SCHEMA_VERSION,
    AXIS, SLOT, VARIANT,
    axisOf, slotsForEntity, slotsForPerson, variantsForEntity,
    participantSlotsForVariant, variantForScenario, slotForScenarioPerson,
    emptyPersonalResponses,
    evaluateSlot, requirementsForSlot,
    readerDsFilterMatches, readerMinimumMatches, readerFilterCounters, readingPair, readingView
  });
})();
