import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const siteVersionFiles = ["app.js", "index.html", "checklist.html"];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function write(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content, "utf8");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const appText = read("app.js");
const currentSiteVersion = appText.match(/APP_VERSION\s*=\s*["'](V\d+\.\d+(?:\.\d+)?)["']/)?.[1];

if (!currentSiteVersion) {
  console.error("Version introuvable dans app.js.");
  process.exit(1);
}

const currentBareVersion = currentSiteVersion.replace(/^V/, "");
const parts = currentBareVersion.split(".").map(Number);

if ((parts.length !== 2 && parts.length !== 3) || parts.some(part => !Number.isInteger(part) || part < 0)) {
  console.error(`Version invalide: ${currentSiteVersion}`);
  process.exit(1);
}

if (parts.length === 2) parts.push(0);
parts[2] += 1;

const nextBareVersion = parts.join(".");
const nextSiteVersion = `V${nextBareVersion}`;

for (const file of siteVersionFiles) {
  let content = read(file);
  content = content.replace(new RegExp(escapeRegExp(currentSiteVersion), "g"), nextSiteVersion);
  write(file, content);
}

const packageJson = JSON.parse(read("package.json"));
packageJson.version = nextBareVersion;
write("package.json", `${JSON.stringify(packageJson, null, 2)}\n`);

console.log(`${currentSiteVersion} -> ${nextSiteVersion}`);
