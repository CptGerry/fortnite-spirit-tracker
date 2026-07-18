"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const targetArg = process.argv[2] || "data/spirits.json";
const targetPath = path.resolve(ROOT, targetArg);

const rarityOrder = {
  rare: 0,
  epic: 1,
  legendary: 2,
  mythic: 3,
  special: 4,
};

const variantOrder = {
  base: 0,
  gold: 1,
  gummy: 2,
  galaxy: 3,
  holofoil: 4,
  gem: 5,
};

function normalizeText(value = "") {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function familyName(spirit) {
  const name = spirit.name?.en || spirit.name?.es || "";

  return name
    .replace(/^(Gold|Gummy|Galaxy|Holofoil|Gem)\s+/i, "")
    .replace(/\s+Sprite$/i, "")
    .trim();
}

function sortSpirits(items) {
  const baseRarityByFamily = new Map();
  const familyOrder = new Map();

  items.forEach((spirit, index) => {
    const family = normalizeText(familyName(spirit));

    if (!familyOrder.has(family)) {
      familyOrder.set(family, index);
    }

    if (spirit.variant === "base") {
      baseRarityByFamily.set(family, spirit.rarity);
      familyOrder.set(family, index);
    }
  });

  return [...items].sort((a, b) => {
    const familyA = normalizeText(familyName(a));
    const familyB = normalizeText(familyName(b));

    const baseRarityA =
      a.baseRarity ||
      baseRarityByFamily.get(familyA) ||
      (a.rarity === "special" ? "mythic" : a.rarity);

    const baseRarityB =
      b.baseRarity ||
      baseRarityByFamily.get(familyB) ||
      (b.rarity === "special" ? "mythic" : b.rarity);

    const rarityDifference =
      (rarityOrder[baseRarityA] ?? 99) -
      (rarityOrder[baseRarityB] ?? 99);

    if (rarityDifference !== 0) {
      return rarityDifference;
    }

    const familyDifference =
      (familyOrder.get(familyA) ?? 9999) -
      (familyOrder.get(familyB) ?? 9999);

    if (familyDifference !== 0) {
      return familyDifference;
    }

    return (
      (variantOrder[a.variant] ?? 99) -
      (variantOrder[b.variant] ?? 99)
    );
  });
}

if (!fs.existsSync(targetPath)) {
  console.error(`No existe: ${path.relative(ROOT, targetPath)}`);
  process.exit(1);
}

const spirits = JSON.parse(fs.readFileSync(targetPath, "utf8"));
const backupPath = targetPath.replace(/\.json$/i, "-before-sort.json");

fs.copyFileSync(targetPath, backupPath);
fs.writeFileSync(
  targetPath,
  `${JSON.stringify(sortSpirits(spirits), null, 4)}\n`,
  "utf8",
);

console.log(`Ordenados: ${spirits.length}`);
console.log(`Archivo: ${path.relative(ROOT, targetPath)}`);
console.log(`Respaldo: ${path.relative(ROOT, backupPath)}`);
