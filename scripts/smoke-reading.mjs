import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { root } from "./catalog-utils.mjs";

function createLocalStorage() {
  const data = new Map();
  return {
    getItem:key => data.has(key) ? data.get(key) : null,
    setItem:(key, value) => data.set(key, String(value)),
    removeItem:key => data.delete(key),
    clear:() => data.clear()
  };
}

function runBrowserScript(context, file) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename:file });
}

const profile = {
  schemaVersion:3,
  personA:{ id:"person-a", identityId:"test-a", name:"Dunkhan", color:"green", anatomy:{ penis:true, testicles:true, vulva:false, vagina:false, breasts:false, prostate:true } },
  personB:{ id:"person-b", identityId:"test-b", name:"Ferrena", color:"orange", anatomy:{ penis:false, testicles:false, vulva:true, vagina:true, breasts:true, prostate:false } },
  dynamic:{ mode:"switch", dominant:null },
  anatomyConfigured:true,
  showIncompatible:true
};

const context = {
  console,
  localStorage:createLocalStorage(),
  location:{ href:"http://localhost/checklist.html", pathname:"/checklist.html", hash:"" },
  navigator:{ language:"fr-FR" },
  crypto:{ randomUUID:() => "00000000-0000-4000-8000-000000000000" },
  TextEncoder,
  TextDecoder,
  URL,
  URLSearchParams,
  btoa:text => Buffer.from(text, "binary").toString("base64"),
  atob:text => Buffer.from(text, "base64").toString("binary")
};
context.window = context;
context.globalThis = context;
context.CHECKLIST_PROFILE_API = { get:() => profile };
vm.createContext(context);

runBrowserScript(context, "interaction-model.js");
runBrowserScript(context, "practice-catalog.js");
runBrowserScript(context, "storage.js");

const model = context.CHECKLIST_INTERACTION_MODEL;
const storage = context.CHECKLIST_V2_STORAGE;
const entity = context.CHECKLIST_CATALOG.entities.find(item => item.id === "practice-0001");

assert.ok(entity, "practice-0001 absente du catalogue");
assert.equal(storage.setPersonalSlotState(entity.id, "personA", "dominant", { preference:3 }), true);
assert.equal(storage.setPersonalSlotState(entity.id, "personB", "submissive", { preference:3 }), true);

const response = storage.getReaderPractice(entity.id);
const pair = model.readingPair(entity, "a-dominant", response, profile);
assert.equal(pair.personA.state.preference, 3);
assert.equal(pair.personB.state.preference, 3);
assert.equal(pair.compatibility.status, "strong");

assert.equal(storage.setVariantCommonState(entity.id, "a-dominant", { doneTogether:true }), true);
const checked = model.readingPair(entity, "a-dominant", storage.getReaderPractice(entity.id), profile);
assert.equal(checked.common.doneTogether, true);
assert.equal(checked.personA.state.prior, true);
assert.equal(checked.personB.state.prior, true);

assert.equal(storage.setVariantCommonState(entity.id, "a-dominant", { doneTogether:false }), true);
const unchecked = model.readingPair(entity, "a-dominant", storage.getReaderPractice(entity.id), profile);
assert.equal(unchecked.common.doneTogether, undefined);
assert.equal(unchecked.personA.state.prior, true);
assert.equal(unchecked.personB.state.prior, true);

console.log("Smoke reading OK: lecture non vide et Fait ensemble synchronise les deux participants.");
