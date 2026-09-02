import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ignoredDirs = new Set([".git", "node_modules"]);
const findings = [];

const previousAccountPattern = new RegExp([
  ["cle", "ment", "fas", "quel"].join(""),
  ["cle", "ment", "fas", "quel"].join("-"),
  ["cl[eé]", "ment\\s+fas", "quel"].join("")
].join("|"), "gi");

const checks = [
  ["email", /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi],
  ["french_phone", /(?:\+33|0)[1-9](?:[ .-]?\d{2}){4}/g],
  ["local_path", /[A-Z]:\\(?:Users|Documents and Settings|OneDrive|Dropbox|Downloads|Desktop|Bureau)\\[^\s"'<>]+/gi],
  ["google_site_verification", new RegExp(["google", "site", "verification"].join("-"), "gi")],
  ["private_key", /-----BEGIN [A-Z ]*PRIVATE KEY-----/g],
  ["old_public_account", previousAccountPattern],
  ["secret_assignment", /(api[_-]?key|secret|password|client[_-]?secret|bearer)\s*[:=]\s*["'][^"']{8,}["']/gi]
];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirs.has(entry.name)) continue;
    if (entry.name.startsWith(".") && entry.name !== ".gitignore") continue;

    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(absolutePath);
      continue;
    }

    auditFile(absolutePath);
  }
}

function auditFile(absolutePath) {
  const relativePath = path.relative(root, absolutePath).replace(/\\/g, "/");
  const content = fs.readFileSync(absolutePath, "utf8");

  for (const [name, regex] of checks) {
    for (const match of content.matchAll(regex)) {
      findings.push({
        check: name,
        file: relativePath,
        sample: redact(String(match[0]))
      });
    }
  }
}

function redact(value) {
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

walk(root);

if (findings.length) {
  console.error("Privacy audit failed:");
  for (const finding of findings) {
    console.error(`- ${finding.check}: ${finding.file} (${finding.sample})`);
  }
  process.exit(1);
}

console.log("Privacy audit OK: aucun marqueur personnel ou secret detecte.");
