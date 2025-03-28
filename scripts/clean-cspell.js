#!/usr/bin/env node

import fs from "node:fs/promises";
import spawn from "nano-spawn";

const CSPELL_CONFIG_FILE = new URL("../cspell.json", import.meta.url);
const updateConfig = (config) =>
  fs.writeFile(CSPELL_CONFIG_FILE, JSON.stringify(config, undefined, 4) + "\n");
const runSpellcheck = (args, options) =>
  spawn("yarn", ["lint:spellcheck", ...args], options);

console.log("Empty words ...");
const config = JSON.parse(await fs.readFile(CSPELL_CONFIG_FILE));
const original = config.words;
await updateConfig({ ...config, words: [] });

console.log("Running spellcheck with empty words ...");
let stdout = "";
try {
  await runSpellcheck(["--words-only", "--unique"]);
} catch (error) {
  ({ stdout } = error);
}

const words = stdout
  ? stdout
      .split("\n")
      // Remove upper case word, if lower case one already exists
      .filter((word, _, words) => {
        const lowerCased = word.toLowerCase();
        return lowerCased === word || !words.includes(lowerCased);
      })
      // Compare function from https://github.com/streetsidesoftware/vscode-spell-checker/blob/2fde3bc5c658ee51da5a56580aa1370bf8174070/packages/client/src/settings/CSpellSettings.ts#L78
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
  : [];
config.words = words;

const removed = original.filter((word) => !words.includes(word));
if (removed.length > 0) {
  console.log(
    `${removed.length} words removed: \n${removed
      .map((word) => ` - ${word}`)
      .join("\n")}`,
  );
}
const added = words.filter((word) => !original.includes(word));
if (added.length > 0) {
  console.log(
    `${added.length} words added: \n${added
      .map((word) => ` - ${word}`)
      .join("\n")}`,
  );
}

console.log("Updating words ...");
await updateConfig(config);

console.log("Running spellcheck with new words ...");
await runSpellcheck([], { stdio: "inherit" });

console.log("CSpell config file updated.");
