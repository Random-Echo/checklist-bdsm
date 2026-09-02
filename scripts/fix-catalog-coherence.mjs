import { readCatalogBundle, writeCatalogBundle } from "./catalog-utils.mjs";

const bundle = readCatalogBundle();
const catalog = bundle.catalog;
const byId = new Map(catalog.entities.map(entity => [entity.id, entity]));

function entity(id) {
  const found = byId.get(id);
  if (!found) throw new Error(`Pratique introuvable: ${id}`);
  return found;
}

function req(subject, anatomy) {
  return { all:[{ subject, anatomy }] };
}

function any(subject, anatomies) {
  return anatomies.map(anatomy => req(subject, anatomy));
}

function setSlotRequirements(id, requirementsBySlot) {
  entity(id).interaction.requirementsBySlot = requirementsBySlot;
}

function setScenarioRequirements(id, requirementsByScenario) {
  entity(id).interaction.requirementsByScenario = requirementsByScenario;
}

function setScenarioProjection(id, scenario, projection) {
  entity(id).interaction.scenarioProjection[scenario] = projection;
}

const externalGenitals = ["penis", "testicles", "vulva"];

// Anatomie clairement visee par le texte, avec un sens different selon le scenario.
setScenarioRequirements("practice-0030", {
  aDom:{
    give:any("partner", externalGenitals),
    receive:any("self", externalGenitals)
  },
  bDom:{
    give:[req("partner", "testicles")],
    receive:[req("self", "testicles")]
  }
});

setScenarioRequirements("practice-0160", {
  aDom:{
    dominant:[req("self", "penis")],
    submissive:[req("partner", "penis")]
  },
  bDom:{
    dominant:[req("self", "vulva")],
    submissive:[req("partner", "vulva")]
  }
});

setScenarioRequirements("practice-0280", {
  aDom:{
    dominant:[req("self", "penis")],
    submissive:[req("partner", "penis")]
  }
});

setScenarioRequirements("practice-0294", {
  bDom:{
    give:[req("partner", "breasts")],
    receive:[req("self", "breasts")]
  }
});

setSlotRequirements("practice-0299", {
  give:[...any("partner", ["penis", "vulva"])],
  receive:[...any("self", ["penis", "vulva"])]
});

setScenarioProjection("practice-0484", "bDom", { personA:"receive", personB:"give" });
setScenarioRequirements("practice-0484", {
  aDom:{
    give:[req("self", "penis")],
    receive:[req("partner", "penis")]
  }
});

setSlotRequirements("practice-0485-a", {
  give:[req("partner", "vulva")],
  receive:[req("self", "vulva")]
});

setScenarioRequirements("practice-0486", {
  aDom:{
    give:[req("partner", "penis")],
    receive:[req("self", "penis")]
  },
  bDom:{
    give:[req("partner", "vulva")],
    receive:[req("self", "vulva")]
  }
});

setScenarioRequirements("practice-0487", {
  aDom:{
    give:[req("partner", "penis")],
    receive:[req("self", "penis")]
  },
  bDom:{
    give:[req("partner", "vulva")],
    receive:[req("self", "vulva")]
  }
});

setSlotRequirements("practice-0591", {
  give:[req("self", "penis")],
  receive:[req("partner", "penis")]
});

// Pratiques de fluides ou d'ejaculation liees explicitement a une personne du couple.
setSlotRequirements("practice-0018-a", {
  give:[req("self", "penis")],
  receive:[req("partner", "penis")]
});

setSlotRequirements("practice-0018-b", {
  interest:[req("self", "penis")]
});

setSlotRequirements("practice-0019-a", {
  give:[req("self", "penis")],
  receive:[req("partner", "penis")]
});

setSlotRequirements("practice-0019-b", {
  interest:[req("self", "penis")]
});

setScenarioRequirements("practice-0022", {
  aDom:{
    give:[req("partner", "penis")],
    receive:[req("self", "penis")]
  }
});

setSlotRequirements("practice-0023", {
  interest:[req("self", "penis"), req("partner", "penis")]
});

setSlotRequirements("practice-0024-a", {
  give:[req("self", "penis")],
  receive:[req("partner", "penis")]
});

setSlotRequirements("practice-0024-b", {
  interest:[req("self", "penis")]
});

setScenarioRequirements("practice-0025", {
  aDom:{
    dominant:[req("self", "penis")],
    submissive:[req("partner", "penis")]
  }
});

setSlotRequirements("practice-0026", {
  give:[req("self", "penis")],
  receive:[req("partner", "penis")]
});

setSlotRequirements("practice-0596", {
  dominant:[req("partner", "penis")],
  submissive:[req("self", "penis")]
});

writeCatalogBundle(bundle, catalog);

console.log("Catalogue corrige: contraintes anatomiques et projection de scenario mises a jour.");
