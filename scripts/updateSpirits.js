"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const CURRENT_PATH = path.join(ROOT, "data", "spirits.json");
const SOURCE_PATH = path.join(ROOT, "data", "fortnitegg-preview.json");
const PREVIEW_PATH = path.join(ROOT, "data", "spirits-updated-preview.json");
const BACKUP_PATH = path.join(ROOT, "data", "spirits-backup.json");

const apply = process.argv.includes("--apply");

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalizeText(value = "") {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeVariant(value = "") {
  const text = normalizeText(value);
  if (text.includes("gold") || text.includes("oro")) return "gold";
  if (text.includes("gummy") || text.includes("gomita") || text.includes("candy")) return "gummy";
  if (text.includes("galaxy") || text.includes("galaxia")) return "galaxy";
  if (text.includes("holofoil") || text.includes("holograf")) return "holofoil";
  if (text.includes("gem") || text.includes("gema")) return "gem";
  return "base";
}

function normalizeRarity(value = "") {
  const map = {
    rara: "rare", raro: "rare", rare: "rare",
    epica: "epic", epico: "epic", epic: "epic",
    legendaria: "legendary", legendario: "legendary", legendary: "legendary",
    mitica: "mythic", mitico: "mythic", mythic: "mythic",
    especial: "special", special: "special",
  };
  const text = normalizeText(value);
  return map[text] || text;
}

function existingFamilyName(spirit) {
  const text = spirit.name.en;
  const match = text.match(/\(([^()]*)\)\s*$/);
  return (match ? match[1] : text).replace(/\s+sprite$/i, "").trim();
}

function sourceKey(item) {
  let name = item.name.en;
  for (const prefix of ["Gummy ", "Galaxy ", "Gold ", "Holofoil ", "Gem "]) {
    if (name.startsWith(prefix)) {
      name = name.slice(prefix.length);
      break;
    }
  }
  return `${normalizeText(name)}|${normalizeVariant(item.variant)}`;
}

function existingKey(item) {
  return `${normalizeText(existingFamilyName(item))}|${normalizeVariant(item.variant)}`;
}

function slug(value) {
  return normalizeText(value).replace(/\s+/g, "-");
}

const current = readJSON(CURRENT_PATH);
const source = readJSON(SOURCE_PATH).filter((item) => item.released === true);
const sourceMap = new Map(source.map((item) => [sourceKey(item), item]));
const matched = new Set();

const updated = current.map((item) => {
  const result = { ...item };
  const key = existingKey(result);
  const sourceItem = sourceMap.get(key);

  result.rarity = sourceItem
    ? normalizeRarity(sourceItem.rarity)
    : normalizeRarity(result.rarity);
  result.variant = normalizeVariant(result.variant);

  // El precio siempre se conserva para los registros existentes.
  if (sourceItem) {
    result.sourceId = sourceItem.sourceId;
    result.sourceUrl = sourceItem.sourceUrl;
    result.dropChance = sourceItem.dropChance || 0;
    result.remoteImage = sourceItem.remoteImage;
    matched.add(key);
  }

  return result;
});

const familyRarity = new Map();
for (const item of source) {
  if (normalizeVariant(item.variant) === "base") {
    familyRarity.set(normalizeText(item.name.en), normalizeRarity(item.rarity));
  }
}

const basePrices = { rare: 100, epic: 3000, legendary: 5000, mythic: 7500 };
const specialPrices = { rare: 4000, epic: 6000, legendary: 10000, mythic: 15000 };

let nextLegacyId = Math.max(...current.map((item) => item.legacyId)) + 1;

const additions = source
  .filter((item) => !matched.has(sourceKey(item)))
  .sort((a, b) => a.sourceId - b.sourceId);

for (const item of additions) {
  const [family, variant] = sourceKey(item).split("|");
  const underlyingRarity = familyRarity.get(family) || normalizeRarity(item.rarity);

  // Los precios se asignan por la variante usando los valores ya existentes
  // para la familia de rareza correspondiente. La rareza "special" no cambia
  // ni recalcula precios por sí sola.
  const price =
    variant === "base"
      ? (basePrices[underlyingRarity] || 0)
      : (specialPrices[underlyingRarity] || 0);

  updated.push({
    id: `${slug(item.name.en)}-${variant}`,
    legacyId: nextLegacyId,
    name: { es: item.name.en, en: item.name.en },
    rarity: normalizeRarity(item.rarity),
    variant,
    price,
    released: true,
    image: `assets/spirits/${String(nextLegacyId).padStart(3, "0")}.webp`,
    sourceId: item.sourceId,
    sourceUrl: item.sourceUrl,
    dropChance: item.dropChance || 0,
    remoteImage: item.remoteImage,
  });

  nextLegacyId += 1;
}

fs.writeFileSync(PREVIEW_PATH, `${JSON.stringify(updated, null, 4)}\n`, "utf8");

console.log(`Vista previa creada: ${path.relative(ROOT, PREVIEW_PATH)}`);
console.log(`Existentes conservados: ${current.length}`);
console.log(`Nuevos agregados: ${additions.length}`);
console.log(`Total: ${updated.length}`);

if (apply) {
  fs.copyFileSync(CURRENT_PATH, BACKUP_PATH);
  fs.copyFileSync(PREVIEW_PATH, CURRENT_PATH);
  console.log(`Respaldo: ${path.relative(ROOT, BACKUP_PATH)}`);
  console.log(`Aplicado: ${path.relative(ROOT, CURRENT_PATH)}`);
} else {
  console.log("No se reemplazó spirits.json. Revisa la vista previa.");
  console.log("Para aplicar: node scripts/updateSpirits.js --apply");
}
